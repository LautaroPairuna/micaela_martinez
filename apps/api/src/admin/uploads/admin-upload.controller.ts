// apps/api/src/admin/uploads/admin-upload.controller.ts
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
import { MediaStorageService } from '../../media/media-storage.service';
import { AdminMetaService } from '../meta/admin-meta.service';
import { VideoProgressGateway } from '../../media/video-progress.gateway';

const IMAGE_MAX_BYTES = 50 * 1024 * 1024;
const DOC_MAX_BYTES = 50 * 1024 * 1024;
const VIDEO_MAX_BYTES = 8 * 1024 * 1024 * 1024;

@Controller('admin/resources')
export class AdminUploadController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
    private readonly adminMeta: AdminMetaService,
    private readonly videoGateway: VideoProgressGateway,
  ) {}

  @Post(':resource/:id/upload/:field')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
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
      limits: { fileSize: VIDEO_MAX_BYTES },
    }),
  )
  async uploadField(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Param('field') field: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('clientId') clientId?: string,
  ) {
    if (!file?.path)
      throw new BadRequestException('No se recibió ningún archivo.');

    const resourceMeta = await this.adminMeta.getResourceMeta(resource);
    const fieldMeta = await this.adminMeta.getFieldMeta(resource, field);

    if (!fieldMeta.isImage && !fieldMeta.isFile) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `El campo '${field}' no está marcado ni como imagen ni como archivo.`,
      );
    }

    type MediaKind = 'image' | 'video' | 'document' | 'generic';
    let mediaKind: MediaKind;

    if (fieldMeta.isImage) {
      mediaKind = 'image';
    } else {
      const mime = (file.mimetype ?? '').toLowerCase();
      if (mime.startsWith('video/')) mediaKind = 'video';
      else if (mime === 'application/pdf' || mime.startsWith('application/vnd'))
        mediaKind = 'document';
      else mediaKind = 'generic';
    }

    const size = file.size;

    if (mediaKind === 'image' && size > IMAGE_MAX_BYTES) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `La imagen supera el tamaño máximo permitido.`,
      );
    }
    if (mediaKind === 'video' && size > VIDEO_MAX_BYTES) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `El video supera el tamaño máximo permitido.`,
      );
    }
    if (
      (mediaKind === 'document' || mediaKind === 'generic') &&
      size > DOC_MAX_BYTES
    ) {
      await fsp.unlink(file.path).catch(() => {});
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido.`,
      );
    }

    // Prisma delegate
    const prismaModelKey =
      resourceMeta.name.charAt(0).toLowerCase() + resourceMeta.name.slice(1);
    const client = (this.prisma as any)[prismaModelKey];
    if (!client) {
      await fsp.unlink(file.path).catch(() => {});
      throw new Error(`Prisma client para '${prismaModelKey}' no encontrado`);
    }

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

    let folder: string;
    if (mediaKind === 'image')
      folder = path.join('uploads', resourceMeta.tableName);
    else if (mediaKind === 'video') folder = path.join('uploads', 'media');
    else if (mediaKind === 'document') folder = path.join('uploads', 'docs');
    else folder = path.join('uploads', resourceMeta.tableName, 'files');

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

    let filenameOnly: string;
    let previewUrl: string | undefined;

    // Caso VIDEO: Procesamiento asíncrono para evitar Timeout (502/504)
    if (mediaKind === 'video') {
      // 1. Definir nombres esperados (optimista)
      const safeBase = resourceMeta.tableName; // O slugify del título
      // Nota: MediaStorageService genera su propio uniq, así que no podemos predecirlo 100% 
      // sin refactorizar el servicio.
      // ESTRATEGIA: Delegar todo al fondo y notificar por WebSocket.
      
      // Lanzar proceso en background ("Fire and forget" desde la vista del HTTP request)
      this.processVideoBackground(
        file,
        folder,
        baseName,
        clientId,
        client,
        id,
        fieldMeta.name,
      ).catch((err) => {
        console.error('Error en background video processing:', err);
      });

      // 2. Responder INMEDIATAMENTE al cliente
      // Devolvemos el registro actual SIN cambios (o con un flag si quisiéramos)
      // El frontend esperará el evento 'video-done' para saber que terminó.
      return {
        item: existing, // Devolvemos el item sin actualizar todavía
        url: '',        // Sin preview inmediato
        kind: mediaKind,
        originalName: file.originalname,
        status: 'processing', // Señal para el frontend (si lo usara)
      };
    }

    // Caso NO video (Síncrono como siempre)
    try {
      if (mediaKind === 'image') {
        const buf = await fsp.readFile(file.path);
        const saved = await this.mediaStorage.saveImageWebp(
          { originalname: file.originalname, buffer: buf },
          { folder, baseName },
        );
        filenameOnly = path.basename(saved.path);
        previewUrl = saved.url;
        await fsp.unlink(file.path).catch(() => {});
      } else {
        const saved = await this.mediaStorage.saveRawFileFromDisk(
          {
            path: file.path,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          },
          { folder, baseName },
        );
        filenameOnly = path.basename(saved.path);
        previewUrl = `/media/documents/${filenameOnly}`;
      }
    } catch (err) {
      await fsp.unlink(file.path).catch(() => {});
      throw err;
    }

    const updated = await client.update({
      where: { id },
      data: { [fieldMeta.name]: filenameOnly },
    });

    return {
      item: updated,
      url: previewUrl,
      kind: mediaKind,
      originalName: file.originalname,
    };
  }

  // Método auxiliar para procesamiento en background
  private async processVideoBackground(
    file: Express.Multer.File,
    folder: string,
    baseName: string,
    clientId: string | undefined,
    client: any,
    id: number,
    fieldName: string,
  ) {
    try {
      // 1. Comprimir / Transcodificar
      const saved = await this.mediaStorage.saveCompressedVideoFromDisk(
        {
          path: file.path,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        { folder, baseName, clientId },
      );

      const filenameOnly = path.basename(saved.path);

      // 2. VTT / Sprite (Best effort)
      try {
        const baseNameForVtt = path.basename(
          filenameOnly,
          path.extname(filenameOnly),
        );
        const absoluteVideoPath = path.join(
          process.cwd(),
          'public',
          saved.path,
        );
        await this.mediaStorage.generateVttAndSprite(
          absoluteVideoPath,
          'uploads/media',
          baseNameForVtt,
        );
      } catch (e) {
        console.error('Error generando VTT en admin upload:', e);
      }

      // 3. Actualizar BD con el nombre final
      await client.update({
        where: { id },
        data: { [fieldName]: filenameOnly },
      });

      // 4. Notificar fin al Frontend (para que refresque)
      if (clientId) {
        this.videoGateway.emitDone(clientId);
      }
    } catch (err) {
      console.error('Error en processVideoBackground:', err);
      if (clientId) {
        this.videoGateway.emitError(
          clientId,
          err instanceof Error ? err.message : String(err),
        );
      }
      // Limpieza en caso de fallo total (si quedó el archivo temporal)
      await fsp.unlink(file.path).catch(() => {});
    }
  }
}
