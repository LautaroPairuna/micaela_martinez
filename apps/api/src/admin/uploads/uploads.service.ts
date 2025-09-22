// apps/api/src/admin/uploads/uploads.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { promises as fsPromises } from 'fs';
import { randomBytes } from 'crypto';
import {
  folderNames,
  getImageAbsolutePath,
  toPublicImageUrl,
  getUploadAbsolutePath,
  toPublicMediaUrl,
  getDocAbsolutePath,
  toPublicDocUrl,
  getFileType as getFileTypeFromMime,
  ALLOWED_MIME_TYPES,
  type PrismaTable,
  IMAGE_PUBLIC_DIR,
  MEDIA_UPLOAD_DIR,
  DOC_UPLOAD_DIR,
} from './constants';

export enum FileType {
  IMAGEN = 'imagen',
  VIDEO = 'video',
  DOC = 'documento',
}

// Mock: estructura de un registro de “upload” (si luego lo persistís en BD)
interface Upload {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string; // solo filename o subpath relativo
  url: string;
  thumbUrl?: string | null;
  table: string;
  recordId?: string | null;
  title?: string | null;
  alt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {}

  /* ───────────────────────── Helpers ───────────────────────── */

  // Nombre único: <slug>-YYYYMMDD-HHMMSS-<rand>.<ext>
  private generateFileName(
    originalName: string,
    title?: string,
    table?: string,
  ): string {
    const date = new Date();
    const ts = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(
      date.getMinutes(),
    ).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    const rand = randomBytes(3).toString('hex');

    const baseSlug = (title || table || 'archivo')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const ext = path.extname(originalName).toLowerCase() || '.bin';
    return `${baseSlug}-${ts}-${rand}${ext}`;
  }

  private getFileType(mimetype: string): FileType {
    const t = getFileTypeFromMime(mimetype);
    switch (t) {
      case 'imagen':
        return FileType.IMAGEN;
      case 'video':
        return FileType.VIDEO;
      default:
        return FileType.DOC;
    }
  }

  private async prepareImageDirs(folder: string) {
    const dir = path.join(IMAGE_PUBLIC_DIR, folder);
    const thumbs = path.join(dir, 'thumbs');
    await Promise.all([
      fsPromises.mkdir(dir, { recursive: true }),
      fsPromises.mkdir(thumbs, { recursive: true }),
    ]);
    return { dir, thumbs };
  }

  private async prepareVideoDir() {
    await fsPromises.mkdir(MEDIA_UPLOAD_DIR, { recursive: true });
    return MEDIA_UPLOAD_DIR;
  }

  private async prepareDocsDir() {
    await fsPromises.mkdir(DOC_UPLOAD_DIR, { recursive: true });
    return DOC_UPLOAD_DIR;
  }

  // Elimina físicamente una imagen y su thumbnail (si existe)
  private async deletePhysicalImage(table: string, oldFilename: string) {
    const folder = folderNames[table as PrismaTable] ?? table.toLowerCase();

    // archivo principal
    const mainPath = path.join(IMAGE_PUBLIC_DIR, folder, oldFilename);

    // thumbnails: intentamos ambos (mismo nombre y nombre .webp)
    const thumbSame = path.join(
      IMAGE_PUBLIC_DIR,
      folder,
      'thumbs',
      oldFilename,
    );
    const baseNoExt = oldFilename.replace(/\.[^.]+$/, '');
    const thumbWebp = path.join(
      IMAGE_PUBLIC_DIR,
      folder,
      'thumbs',
      `${baseNoExt}.webp`,
    );

    const candidates = [mainPath, thumbSame, thumbWebp];

    await Promise.all(
      candidates.map(async (p) => {
        try {
          if (fs.existsSync(p)) await fsPromises.unlink(p);
        } catch {
          /* noop */
        }
      }),
    );
  }

  private async deletePhysicalVideo(oldFilename: string) {
    const p = getUploadAbsolutePath(oldFilename);
    if (fs.existsSync(p)) await fsPromises.unlink(p).catch(() => {});
  }

  private async deletePhysicalDoc(oldFilename: string) {
    const p = getDocAbsolutePath(oldFilename);
    if (fs.existsSync(p)) await fsPromises.unlink(p).catch(() => {});
  }

  private isImageExt(ext: string) {
    return [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.gif',
      '.svg',
      '.bmp',
      '.tif',
      '.tiff',
    ].includes(ext);
  }
  private isVideoExt(ext: string) {
    return ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.wmv', '.flv'].includes(
      ext,
    );
  }

  private async deleteOldFileByGuess(table: string, oldFilename?: string) {
    if (!oldFilename) return;

    const ext = path.extname(oldFilename).toLowerCase();
    if (this.isImageExt(ext) || !ext) {
      await this.deletePhysicalImage(table, oldFilename);
      return;
    }
    if (this.isVideoExt(ext)) {
      await this.deletePhysicalVideo(oldFilename);
      return;
    }
    await this.deletePhysicalDoc(oldFilename);
  }

  /* ───────────────────────── Core API ───────────────────────── */

  /**
   * Sube un archivo y opcionalmente borra el anterior si `oldFilename` fue provisto.
   */
  async uploadFile(
    file: Express.Multer.File,
    table: string,
    recordId?: string,
    title?: string,
    alt?: string,
    oldFilename?: string, // 👈 usar desde el controller para editar
  ) {
    if (!file)
      throw new BadRequestException('No se proporcionó ningún archivo');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype))
      throw new BadRequestException('Tipo de archivo no permitido');
    if (!table || !(table in folderNames))
      throw new BadRequestException('Tabla no válida');

    const fileType = this.getFileType(file.mimetype);

    let storedName = ''; // 👈 solo NOMBRE (compatibilidad con datos históricos)
    let originalUrl = '';
    let thumbUrl: string | null = null;

    try {
      if (fileType === FileType.IMAGEN) {
        const folder = folderNames[table as PrismaTable];
        const { dir, thumbs } = await this.prepareImageDirs(folder);

        if (file.mimetype === 'image/svg+xml') {
          // SVG => guardar tal cual
          const name = this.generateFileName(
            file.originalname,
            title || alt,
            table,
          ); // mantiene .svg
          const target = path.join(dir, name);
          const tmp = `${target}.tmp`;

          await fsPromises.writeFile(tmp, file.buffer);
          await fsPromises.rename(tmp, target);

          storedName = name;
          originalUrl = toPublicImageUrl(table, name);
          thumbUrl = null;
        } else {
          // Otras imágenes => convertir a WebP + thumb
          const name = this.generateFileName(
            file.originalname,
            title || alt,
            table,
          );
          const webpName = name.replace(/\.[^.]+$/, '.webp');

          const target = path.join(dir, webpName);
          const tmp = `${target}.tmp`;
          await sharp(file.buffer).webp({ quality: 85 }).toFile(tmp);
          await fsPromises.rename(tmp, target);

          const thumbTarget = path.join(thumbs, webpName);
          const thumbTmp = `${thumbTarget}.tmp`;
          await sharp(file.buffer)
            .resize(320, null, { fit: 'inside' })
            .webp({ quality: 75 })
            .toFile(thumbTmp);
          await fsPromises.rename(thumbTmp, thumbTarget);

          storedName = webpName;
          originalUrl = toPublicImageUrl(table, webpName);
          thumbUrl = toPublicImageUrl(table, 'thumbs', webpName);
        }
      } else if (fileType === FileType.VIDEO) {
        const dir = await this.prepareVideoDir();
        const name = this.generateFileName(
          file.originalname,
          title || alt,
          table,
        );
        const target = path.join(dir, name);
        const tmp = `${target}.tmp`;

        await fsPromises.writeFile(tmp, file.buffer);
        await fsPromises.rename(tmp, target);

        storedName = name;
        originalUrl = toPublicMediaUrl(name);
      } else {
        // DOC
        const dir = await this.prepareDocsDir();
        const name = this.generateFileName(
          file.originalname,
          title || alt,
          table,
        );
        const target = path.join(dir, name);
        const tmp = `${target}.tmp`;

        await fsPromises.writeFile(tmp, file.buffer);
        await fsPromises.rename(tmp, target);

        storedName = name;
        originalUrl = toPublicDocUrl(name);
      }

      // 🔄 Si estamos editando y vino oldFilename, eliminar lo anterior
      if (oldFilename && oldFilename !== storedName) {
        await this.deleteOldFileByGuess(table, oldFilename);
      }

      // Mock de persistencia (si luego agregás una tabla uploads, reemplazá esto)
      const upload: Upload = {
        id: randomBytes(16).toString('hex'),
        fileName: storedName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: storedName,
        url: originalUrl,
        thumbUrl,
        table,
        recordId,
        title,
        alt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        ok: true,
        data: {
          id: upload.id,
          table,
          recordId,
          storedAs: storedName, // 👈 solo nombre
          type: fileType,
        },
        urls: {
          original: originalUrl,
          thumb: thumbUrl || null,
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      throw new BadRequestException(`Error al procesar el archivo: ${msg}`);
    }
  }

  /* ───────────────────────── Opcionales/Mock ───────────────────────── */

  async deleteFile(id: string) {
    // Mock: sin BD real, no podemos mapear id → filename; mantenemos compat.
    throw new BadRequestException(
      'deleteFile por id requiere persistencia real. Usa un endpoint específico con table + filename.',
    );
  }

  async getFile(id: string) {
    // Mock: sin BD real, no hay lookup; retorna estructura de ejemplo
    const file: Upload = {
      id,
      fileName: 'mock-file.jpg',
      originalName: 'original.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      path: 'mock-file.jpg',
      url: '/images/producto/mock-file.jpg',
      thumbUrl: '/images/producto/thumbs/mock-file.jpg',
      table: 'Producto',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      ok: true,
      data: {
        id: file.id,
        table: file.table,
        recordId: file.recordId,
        storedAs: file.path,
        type: this.getFileType(file.mimeType),
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        title: file.title,
        alt: file.alt,
        createdAt: file.createdAt,
      },
      urls: {
        original: file.url,
        thumb: file.thumbUrl,
      },
    };
  }
}
