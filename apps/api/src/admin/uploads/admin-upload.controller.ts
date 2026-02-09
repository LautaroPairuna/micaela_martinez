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
    @Query('chunkIndex') chunkIndex?: string,
    @Query('totalChunks') totalChunks?: string,
    @Query('uploadId') uploadId?: string,
    @Query('originalName') originalName?: string,
  ) {
    // ----------------------------------------------------------------------
    // SOPORTE CHUNKED UPLOAD
    // ----------------------------------------------------------------------
    if (
      chunkIndex !== undefined &&
      totalChunks !== undefined &&
      uploadId &&
      originalName
    ) {
      if (!file) {
        throw new BadRequestException('No chunk file received');
      }

      const idx = parseInt(chunkIndex, 10);
      const total = parseInt(totalChunks, 10);

      // Sanitizar uploadId para evitar path traversal
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9-]/g, '');
      const tmpDir = path.join(
        process.cwd(),
        'public',
        'tmp',
        'chunks',
        safeUploadId,
      );

      try {
        await fsp.mkdir(tmpDir, { recursive: true });
        const chunkPath = path.join(tmpDir, `chunk-${idx}`);

        // Mover (rename) puede fallar entre discos/particiones, copy+unlink es más seguro
        try {
          await fsp.rename(file.path, chunkPath);
        } catch (e) {
          await fsp.copyFile(file.path, chunkPath);
          await fsp.unlink(file.path).catch(() => {});
        }

        // VERIFICACIÓN EXTRA: Asegurar que el archivo existe y tiene tamaño
        try {
          const stats = await fsp.stat(chunkPath);
          if (stats.size === 0) {
            throw new Error('File is empty after save');
          }
        } catch (verifyErr) {
          console.error(
            `[ChunkUpload] Error verifying chunk ${idx}:`,
            verifyErr,
          );
          throw new BadRequestException(
            `Error verificando chunk ${idx}: ${verifyErr}`,
          );
        }
      } catch (err) {
        console.error('Error saving chunk:', err);
        throw new BadRequestException(`Error guardando chunk ${idx}: ${err}`);
      }

      if (idx === total - 1) {
        this.assembleAndProcessVideo(
          uploadId,
          originalName,
          total,
          tmpDir,
          resource,
          id,
          field,
          clientId,
        ).catch((err: unknown) => {
          console.error('[BackgroundUpload] Error crítico no manejado:', err);
        });

        return {
          status: 'processing',
          message:
            'El video se está ensamblando y procesando en segundo plano.',
          chunkIndex: idx,
        };
      } else {
        return { status: 'chunk_received', chunkIndex: idx };
      }
    }
    // ----------------------------------------------------------------------

    if (!file?.path)
      throw new BadRequestException('No se recibió ningún archivo.');

    // ... Resto del flujo síncrono para archivos pequeños ...
    return this.handleFileSync(file, resource, id, field, clientId);
  }

  // Lógica extraída para manejo síncrono (reutilizable)
  private async handleFileSync(
    file: Express.Multer.File,
    resource: string,
    id: number,
    field: string,
    clientId?: string,
  ) {
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

    if (mediaKind === 'video') {
      const isLesson =
        resourceMeta.tableName === 'leccion' || resourceMeta.name === 'Leccion';
      this.processVideoBackground(
        file,
        folder,
        baseName,
        clientId,
        client,
        id,
        fieldMeta.name,
        isLesson,
      ).catch((err: unknown) => {
        console.error('Error en background video processing:', err);
      });

      return {
        item: existing,
        url: '',
        kind: mediaKind,
        originalName: file.originalname,
        status: 'processing',
      };
    }

    let filenameOnly: string;
    let previewUrl: string | undefined;

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

  private async assembleAndProcessVideo(
    uploadId: string,
    originalName: string,
    totalChunks: number,
    tmpDir: string,
    resource: string,
    id: number,
    field: string,
    clientId?: string,
  ) {
    const lockPath = path.join(tmpDir, '.lock');
    if (fs.existsSync(lockPath)) {
      return;
    }
    await fsp.writeFile(lockPath, '').catch(() => {});
    const assembleStart = Date.now();

    if (clientId) {
      this.videoGateway.server.to(clientId).emit('video-stage', {
        clientId,
        stage: 'assembling',
        progress: 0,
      });
    }

    const finalName = `${uploadId}-${originalName}`;
    const finalPath = path.join(process.cwd(), 'public', 'tmp', finalName);

    try {
      if (fs.existsSync(finalPath)) await fsp.unlink(finalPath);

      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(tmpDir, `chunk-${i}`);

        let retries = 0;
        while (!fs.existsSync(chunkPath) && retries < 20) {
          await new Promise((r) => setTimeout(r, 500));
          retries++;
        }

        if (!fs.existsSync(chunkPath)) {
          throw new Error(`Chunk ${i} perdido durante el ensamblaje.`);
        }

        const data = await fsp.readFile(chunkPath);
        await fsp.appendFile(finalPath, data);

        if (clientId && i % 10 === 0) {
          const progress = Math.round((i / totalChunks) * 100);
          this.videoGateway.server.to(clientId).emit('video-stage', {
            clientId,
            stage: 'assembling',
            progress,
          });
        }
      }

      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

      const stats = await fsp.stat(finalPath);
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: originalName,
        encoding: '7bit',
        mimetype: 'video/mp4',
        destination: path.dirname(finalPath),
        filename: finalName,
        path: finalPath,
        size: stats.size,
        stream: fs.createReadStream(finalPath),
        buffer: Buffer.alloc(0),
      };

      console.info('video_assemble_done', {
        uploadId,
        resource,
        id,
        field,
        totalChunks,
        size: stats.size,
        ms: Date.now() - assembleStart,
      });

      const resourceMeta = await this.adminMeta.getResourceMeta(resource);
      const fieldMeta = await this.adminMeta.getFieldMeta(resource, field);
      const isLesson =
        resourceMeta.tableName === 'leccion' || resourceMeta.name === 'Leccion';

      const prismaModelKey =
        resourceMeta.name.charAt(0).toLowerCase() + resourceMeta.name.slice(1);
      const client = (this.prisma as any)[prismaModelKey];
      const existing = await client.findUnique({ where: { id } });

      const baseName =
        existing.slug ?? existing.titulo ?? `${resourceMeta.tableName}-${id}`;
      const folder = path.join('uploads', 'media');

      if (clientId) {
        this.videoGateway.server.to(clientId).emit('video-stage', {
          clientId,
          stage: 'processing',
          progress: 0,
        });
      }

      await this.processVideoBackground(
        file,
        folder,
        baseName,
        clientId,
        client,
        id,
        fieldMeta.name,
        isLesson,
      );
    } catch (err) {
      console.error('video_assemble_error', {
        uploadId,
        resource,
        id,
        field,
        totalChunks,
        ms: Date.now() - assembleStart,
        error: err instanceof Error ? err.message : String(err),
      });
      if (fs.existsSync(finalPath)) await fsp.unlink(finalPath).catch(() => {});

      if (clientId) {
        this.videoGateway.server.to(clientId).emit('video-error', {
          clientId,
          message: `Error procesando video: ${err instanceof Error ? err.message : err}`,
        });
      }
    } finally {
      await fsp.unlink(lockPath).catch(() => {});
    }
  }
  private async processVideoBackground(
    file: Express.Multer.File,
    folder: string,
    baseName: string,
    clientId: string | undefined,
    client: any,
    id: number,
    fieldName: string,
    isLesson: boolean,
  ) {
    const processStart = Date.now();
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
      const absoluteVideoPath = path.join(process.cwd(), 'public', saved.path);
      let durationS: number | null = null;
      try {
        const duration =
          await this.mediaStorage.getVideoDurationSeconds(absoluteVideoPath);
        durationS = Math.round(duration);
      } catch (e) {
        console.error('Error obteniendo duración de video:', e);
      }

      let previewVttUrl: string | null = null;
      let thumbUrl: string | null = null;
      // 2. VTT / Sprite (Best effort)
      try {
        const baseNameForVtt = path.basename(
          filenameOnly,
          path.extname(filenameOnly),
        );
        const preview = await this.mediaStorage.generateVttAndSprite(
          absoluteVideoPath,
          'uploads/media',
          baseNameForVtt,
        );
        previewVttUrl = preview?.vttUrl ?? null;
        const thumb = await this.mediaStorage.generateVideoThumbnailWebp(
          absoluteVideoPath,
          'uploads/thumbnails',
          baseNameForVtt,
        );
        thumbUrl = thumb.thumbUrl ?? null;
      } catch (e) {
        console.error('Error generando VTT en admin upload:', e);
      }

      // 3. Actualizar BD con el nombre final
      const updateData: Record<string, unknown> = {
        [fieldName]: filenameOnly,
      };
      if (isLesson && fieldName === 'rutaSrc') {
        // Asignar duración (MINUTOS)
        // Convertimos segundos a minutos (con decimales)
        if (typeof durationS === 'number' && durationS > 0) {
          updateData.duracion = parseFloat((durationS / 60).toFixed(2));
        }

        // Asignar previewUrl (Miniatura/Thumbnail hardcodeado)
        // El usuario pidió "ruta hardcodeada" y "primer frame".
        // thumbUrl viene de generateVideoThumbnailWebp como /api/media/thumbnails/xxx-thumb.webp
        if (thumbUrl) {
          updateData.previewUrl = thumbUrl;
        } else if (previewVttUrl) {
          // Fallback al VTT si no hay thumb (aunque thumb debería generarse siempre si hay ffmpeg)
          // Pero idealmente previewUrl es una imagen.
          console.warn(
            'No se generó thumbUrl, usando VTT para previewUrl como fallback',
          );
          // updateData.previewUrl = previewVttUrl; // Comentado para no ensuciar si se espera imagen
        }
      }

      await client.update({
        where: { id },
        data: updateData,
      });

      console.info('video_process_done', {
        id,
        fieldName,
        filename: filenameOnly,
        durationS,
        previewVttUrl,
        thumbUrl,
        updateData, // Log para verificar qué se guardó
        ms: Date.now() - processStart,
      });

      // 4. Notificar fin al Frontend (para que refresque)
      if (clientId) {
        this.videoGateway.emitDone(clientId);
      }
    } catch (err) {
      console.error('video_process_error', {
        id,
        fieldName,
        ms: Date.now() - processStart,
        error: err instanceof Error ? err.message : String(err),
      });
      if (clientId) {
        this.videoGateway.emitError(
          clientId,
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      // Limpieza final de temporales (siempre intentar borrar el input original si quedó)
      // saveCompressedVideoFromDisk debería haberlo borrado, pero por seguridad:
      await fsp.unlink(file.path).catch(() => {});
    }
  }
}
