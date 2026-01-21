import {
  BadRequestException,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { buildAdminMeta } from '../meta/admin-meta.utils';
import { MediaStorageService } from '../../media/media-storage.service';

const ADMIN_META = buildAdminMeta();

// Límites
const IMAGE_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const DOC_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const VIDEO_MAX_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB

@Controller('admin/resources')
export class AdminUploadController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  @Post(':resource/:id/upload/:field')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // Aseguramos que exista /public/tmp
          const tmpDir = path.join(process.cwd(), 'public', 'tmp');
          try {
            fs.mkdirSync(tmpDir, { recursive: true });
            cb(null, tmpDir);
          } catch (err) {
            cb(err as any, tmpDir);
          }
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '';
          const name = randomBytes(8).toString('hex');
          cb(null, `${name}-raw${ext}`);
        },
      }),
      limits: {
        // límite superior del interceptor (luego validamos por tipo)
        fileSize: VIDEO_MAX_BYTES,
      },
    }),
  )
  async uploadField(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('clientId') clientId?: string,
  ) {
    if (!file?.path) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    const resourceMeta = ADMIN_META.find(
      (m) =>
        m.tableName.toLowerCase() === resource.toLowerCase() ||
        m.name.toLowerCase() === resource.toLowerCase(),
    );
    if (!resourceMeta) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(`Recurso '${resource}' no soportado`);
    }

    const fieldMeta = resourceMeta.fields.find((f) => f.name === field);
    if (!fieldMeta) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `Campo '${field}' no existe en recurso '${resourceMeta.name}'`,
      );
    }

    // Verificamos que sea un campo soportado por este endpoint
    if (!fieldMeta.isImage && !fieldMeta.isFile) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `El campo '${field}' no está marcado ni como imagen ni como archivo.`,
      );
    }

    // ───────────────────────── categoría del archivo ─────────────────────────
    type MediaKind = 'image' | 'video' | 'document' | 'generic';
    let mediaKind: MediaKind;

    if (fieldMeta.isImage) {
      mediaKind = 'image';
    } else {
      const mime = (file.mimetype ?? '').toLowerCase();

      if (mime.startsWith('video/')) {
        mediaKind = 'video';
      } else if (
        mime === 'application/pdf' ||
        mime.startsWith('application/vnd')
      ) {
        mediaKind = 'document';
      } else {
        mediaKind = 'generic';
      }
    }

    // ───────────────────────── validación de tamaño ─────────────────────────
    const size = file.size;

    if (mediaKind === 'image' && size > IMAGE_MAX_BYTES) {
      await fsp.unlink(file.path).catch(() => {});
      const mb = (IMAGE_MAX_BYTES / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `La imagen supera el tamaño máximo permitido de ${mb} MB.`,
      );
    }

    if (mediaKind === 'video' && size > VIDEO_MAX_BYTES) {
      await fsp.unlink(file.path).catch(() => {});
      const gb = (VIDEO_MAX_BYTES / (1024 * 1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `El video supera el tamaño máximo permitido de ${gb} GB.`,
      );
    }

    if (
      (mediaKind === 'document' || mediaKind === 'generic') &&
      size > DOC_MAX_BYTES
    ) {
      await fsp.unlink(file.path).catch(() => {});
      const mb = (DOC_MAX_BYTES / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido de ${mb} MB.`,
      );
    }

    // Prisma delegate: producto → prisma.producto, leccion → prisma.leccion, etc.
    const prismaModelKey =
      resourceMeta.name.charAt(0).toLowerCase() + resourceMeta.name.slice(1);

    const client = (this.prisma as any)[prismaModelKey];
    if (!client) {
      await fsp.unlink(file.path).catch(() => {});
      throw new Error(`Prisma client para '${prismaModelKey}' no encontrado`);
    }

    // 1) Registro actual (para slug + borrar archivo previo)
    const existing = await client.findUnique({ where: { id } });

    if (!existing) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `Registro con id ${id} no encontrado en '${resourceMeta.name}'`,
      );
    }

    const previousFilename = existing[fieldMeta.name] as
      | string
      | null
      | undefined;

    // 2) Carpeta y baseName
    let folder: string;

    if (mediaKind === 'image') {
      folder = path.join('uploads', resourceMeta.tableName);
    } else if (mediaKind === 'video') {
      folder = path.join('uploads', 'media');
    } else if (mediaKind === 'document') {
      folder = path.join('uploads', 'docs');
    } else {
      folder = path.join('uploads', resourceMeta.tableName, 'files');
    }

    // 2.b) Borrado del archivo previo (si existía)
    if (previousFilename) {
      const previousRelativePath = path
        .join(folder, previousFilename)
        .replace(/\\/g, '/');
      await this.mediaStorage.delete(previousRelativePath);
    }

    const baseName =
      existing.slug ??
      existing.slugProducto ??
      existing.slugLeccion ??
      existing.titulo ??
      existing.nombre ??
      `${resourceMeta.tableName}-${id}`;

    // 3) Guardar archivo según tipo
    let filenameOnly: string;
    let previewUrl: string | undefined;

    try {
      if (mediaKind === 'image') {
        // Imagen: leemos tmp (<=50MB) a buffer y convertimos
        const buf = await fsp.readFile(file.path);

        const saved = await this.mediaStorage.saveImageWebp(
          { originalname: file.originalname, buffer: buf },
          { folder, baseName },
        );

        filenameOnly = path.basename(saved.path);
        previewUrl = saved.url;

        // limpiamos tmp
        await fsp.unlink(file.path).catch(() => {});
      } else if (mediaKind === 'video') {
        // Video: transcode desde disco (sin RAM)
        const saved = await this.mediaStorage.saveCompressedVideoFromDisk(
          {
            path: file.path,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          },
          {
            folder, // uploads/media
            baseName,
            clientId,
          },
        );

        filenameOnly = path.basename(saved.path);
        previewUrl = `/media/videos/${filenameOnly}`;
        // OJO: saveCompressedVideoFromDisk gestiona borrar/preservar tmp según keepTmpOnFfmpegError

        // ✅ Generar VTT y Sprite (si es posible)
        // Usamos el mismo nombre base del archivo final para que coincida: video.mp4 -> video-preview.vtt
        const baseNameForVtt = path.basename(
          filenameOnly,
          path.extname(filenameOnly),
        );

        // saveCompressedVideoFromDisk devuelve path relativo a public (uploads/media/foo.mp4)
        // generateVttAndSprite necesita path absoluto del video
        const absoluteVideoPath = path.join(
          process.cwd(),
          'public',
          saved.path,
        );

        // No bloqueamos (await) para no demorar la respuesta del admin?
        // O sí, para asegurar que esté listo. Dado que el usuario pidió implementación robusta, mejor await.
        // Pero si tarda mucho, el admin podría dar timeout.
        // Para videos grandes, esto puede tardar minutos. Mejor hacerlo "fire and forget" o background.
        // Sin embargo, en MediaController lo hice con await.
        // Vamos a hacerlo con await pero con un catch para no fallar el upload si falla el VTT.
        try {
          await this.mediaStorage.generateVttAndSprite(
            absoluteVideoPath,
            'uploads/media',
            baseNameForVtt,
          );
        } catch (e) {
          console.error('Error generando VTT en admin upload:', e);
          // No lanzamos error para no abortar el upload exitoso
        }
      } else {
        // Docs / generic: mover desde disco (sin RAM)
        const saved = await this.mediaStorage.saveRawFileFromDisk(
          {
            path: file.path,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          },
          {
            folder,
            baseName,
          },
        );

        filenameOnly = path.basename(saved.path);

        if (mediaKind === 'document') {
          previewUrl = `/media/documents/${filenameOnly}`;
        } else {
          previewUrl = `/media/documents/${filenameOnly}`;
        }
      }
    } catch (err) {
      // Si algo explota, intentamos limpiar el tmp (salvo que ya no exista)
      await fsp.unlink(file.path).catch(() => {});
      throw err;
    }

    // 4) Guardamos SOLO el nombre de archivo en BD
    const updated = await client.update({
      where: { id },
      data: {
        [fieldMeta.name]: filenameOnly,
      },
    });

    return {
      item: updated,
      url: previewUrl,
      kind: mediaKind,
      originalName: file.originalname,
    };
  }
}
