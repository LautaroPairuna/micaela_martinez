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
import { RevalidationService } from '../../common/services/revalidation.service';

const IMAGE_MAX_BYTES = 50 * 1024 * 1024;
const DOC_MAX_BYTES = 50 * 1024 * 1024;
const VIDEO_MAX_BYTES = 8 * 1024 * 1024 * 1024;

function sanitizeUploadId(uploadId: unknown): string {
  const raw = typeof uploadId === 'string' ? uploadId : '';
  return raw.replace(/[^a-zA-Z0-9-]/g, '');
}

function isChunkMode(q: any): boolean {
  return (
    q?.chunkIndex !== undefined &&
    q?.totalChunks !== undefined &&
    typeof q?.uploadId === 'string' &&
    typeof q?.originalName === 'string'
  );
}

@Controller('admin/resources')
export class AdminUploadController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: MediaStorageService,
    private readonly adminMeta: AdminMetaService,
    private readonly videoGateway: VideoProgressGateway,
    private readonly revalidationService: RevalidationService,
  ) {}

  @Post(':resource/:id/upload/:field')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const q = (req as any)?.query ?? {};

          // ✅ CHUNK MODE: escribir directo al dir final del chunk (evita rename/copy)
          if (isChunkMode(q)) {
            const safeUploadId = sanitizeUploadId(q.uploadId);
            if (!safeUploadId) {
              return cb(
                new Error('uploadId inválido'),
                path.join(process.cwd(), 'public', 'tmp'),
              );
            }

            const tmpDir = path.join(
              process.cwd(),
              'public',
              'tmp',
              'chunks',
              safeUploadId,
            );

            try {
              fs.mkdirSync(tmpDir, { recursive: true });
              return cb(null, tmpDir);
            } catch (err) {
              return cb(err as any, tmpDir);
            }
          }

          // ✅ NORMAL MODE: como antes
          const tmpDir = path.join(process.cwd(), 'public', 'tmp');
          try {
            fs.mkdirSync(tmpDir, { recursive: true });
            cb(null, tmpDir);
          } catch (err) {
            cb(err as any, tmpDir);
          }
        },
        filename: (req, file, cb) => {
          const q = (req as any)?.query ?? {};

          // ✅ CHUNK MODE: guardar con nombre determinístico chunk-<idx>
          if (isChunkMode(q)) {
            const idx = Number(q.chunkIndex);
            if (!Number.isFinite(idx) || idx < 0) {
              return cb(new Error('chunkIndex inválido'), '');
            }
            return cb(null, `chunk-${idx}`);
          }

          // ✅ NORMAL MODE: como antes
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
    const startTime = Date.now();
    // ----------------------------------------------------------------------
    // SOPORTE CHUNKED UPLOAD (OPTIMIZADO: sin rename/copy)
    // ----------------------------------------------------------------------
    if (
      chunkIndex !== undefined &&
      totalChunks !== undefined &&
      uploadId &&
      originalName
    ) {
      const idx = parseInt(chunkIndex, 10);
      const total = parseInt(totalChunks, 10);

      console.log(
        `[BACKEND-UPLOAD-DEBUG] Recibiendo chunk ${idx + 1}/${total} para ${originalName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      if (!file?.path) {
        throw new BadRequestException('No chunk file received');
      }

      // ... resto de la lógica ...
      const res = await this.executeChunkLogic(
        resource,
        id,
        field,
        file,
        clientId,
        idx,
        total,
        uploadId,
        originalName,
        startTime,
      );

      return res;
    }

    // ----------------------------------------------------------------------
    // FLUJO NORMAL (NO CHUNKS)
    // ----------------------------------------------------------------------
    if (!file?.path)
      throw new BadRequestException('No se recibió ningún archivo.');

    return this.handleFileSync(file, resource, id, field, clientId);
  }

  private async executeChunkLogic(
    resource: string,
    id: number,
    field: string,
    file: Express.Multer.File,
    clientId: string | undefined,
    idx: number,
    total: number,
    uploadId: string,
    originalName: string,
    startTime: number,
  ) {
    const safeUploadId = sanitizeUploadId(uploadId);
    if (!safeUploadId) throw new BadRequestException('uploadId inválido');

    const tmpDir = path.join(
      process.cwd(),
      'public',
      'tmp',
      'chunks',
      safeUploadId,
    );

    const normalizedClientId =
      typeof clientId === 'string' ? clientId.trim() : '';
    const clientIdPath = path.join(tmpDir, '.client');
    let resolvedClientId: string | undefined = normalizedClientId || undefined;
    let storedClientId: string | null = null;

    await fsp.mkdir(tmpDir, { recursive: true });

    try {
      storedClientId = (await fsp.readFile(clientIdPath, 'utf8')).trim();
    } catch {
      storedClientId = null;
    }

    if (!resolvedClientId && storedClientId) {
      resolvedClientId = storedClientId;
    }
    if (!resolvedClientId) {
      throw new BadRequestException(
        'clientId requerido para upload en chunks.',
      );
    }
    if (storedClientId && storedClientId !== resolvedClientId) {
      throw new BadRequestException(
        'clientId no coincide con el upload en curso.',
      );
    }
    if (!storedClientId) {
      await fsp.writeFile(clientIdPath, resolvedClientId);
    }

    try {
      // ✅ El chunk ya está guardado por multer como chunk-<idx>.
      // Verificamos que exista y tenga tamaño.
      const stats = await fsp.stat(file.path);
      if (stats.size === 0) {
        throw new Error('Chunk vacío');
      }

      // Contar chunks reales (soporta uploads paralelos/desordenados)
      const files = await fsp.readdir(tmpDir);
      const chunkCount = files.filter((f) => f.startsWith('chunk-')).length;

      if (chunkCount === total) {
        this.assembleAndProcessVideo(
          safeUploadId,
          originalName,
          total,
          tmpDir,
          resource,
          id,
          field,
          resolvedClientId,
        ).catch((err: unknown) => {
          console.error('[BackgroundUpload] Error crítico no manejado:', err);
        });

        const duration = Date.now() - startTime;
        console.log(
          `[BACKEND-UPLOAD-DEBUG] Último chunk (${idx + 1}/${total}) procesado en ${duration}ms. Iniciando ensamblado.`,
        );

        return {
          status: 'processing',
          message:
            'El video se está ensamblando y procesando en segundo plano.',
          chunkIndex: idx,
        };
      } else {
        const duration = Date.now() - startTime;
        console.log(
          `[BACKEND-UPLOAD-DEBUG] Chunk ${idx + 1}/${total} procesado en ${duration}ms. (Total en disco: ${chunkCount})`,
        );
        return { status: 'chunk_received', chunkIndex: idx };
      }
    } catch (err) {
      console.error('Error saving chunk:', err);
      throw new BadRequestException(
        `Error guardando chunk ${idx}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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

    type MediaKindFolder = 'image' | 'video' | 'document' | 'generic';
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
        resourceMeta.name,
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
        const saved = await this.mediaStorage.saveImageWebp(
          { originalname: file.originalname, path: file.path },
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

    await this.revalidationService
      .revalidateResource(resourceMeta.name)
      .catch((err) => {
        console.error('Error revalidating after upload:', err);
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
    if (fs.existsSync(lockPath)) return;

    // Bloqueo para evitar procesamientos duplicados
    await fsp.writeFile(lockPath, '').catch(() => {});

    // ✅ Medicion de rendimiento integrada
    const assembleStart = Date.now();

    if (clientId) {
      this.videoGateway.emitStage(clientId, 'assembling');
      this.videoGateway.emitProgress(clientId, 0);
    }

    const finalName = `${uploadId}-${originalName}`;
    const finalPath = path.join(process.cwd(), 'public', 'tmp', finalName);

    // ✅ Buffer de 10MB ideal para tus chunks de 50MB en NVMe
    const writeStream = fs.createWriteStream(finalPath, {
      highWaterMark: 1024 * 1024 * 10,
    });

    try {
      if (fs.existsSync(finalPath)) await fsp.unlink(finalPath);

      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(tmpDir, `chunk-${i}`);

        // Verificación directa (sin waits artificiales gracias a Nginx buffering off)
        if (!fs.existsSync(chunkPath)) {
          throw new Error(
            `Error crítico: El chunk ${i} no se encuentra en el disco.`,
          );
        }

        // Pipe de alto rendimiento
        await new Promise<void>((resolve, reject) => {
          const readStream = fs.createReadStream(chunkPath, {
            highWaterMark: 1024 * 1024 * 10,
          });
          readStream.pipe(writeStream, { end: false });
          readStream.on('end', () => resolve());
          readStream.on('error', (err) => reject(err));
        });

        // Limpieza inmediata de chunks procesados
        await fsp.unlink(chunkPath).catch(() => {});

        // Notificar progreso cada 10% para optimizar el socket
        if (
          clientId &&
          (i % Math.max(1, Math.floor(totalChunks / 10)) === 0 ||
            i === totalChunks - 1)
        ) {
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          this.videoGateway.emitProgress(clientId, progress);
        }
      }

      writeStream.end();

      // ✅ Promesa corregida para evitar el error de TypeScript
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      // Limpieza de carpeta temporal de chunks
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

      const stats = await fsp.stat(finalPath);
      const assembleDuration = (Date.now() - assembleStart) / 1000;

      // ✅ Log de telemetría para monitorear el disco de Hostinger
      console.info(`✅ Ensamblado completado: ${finalName}`, {
        duration: `${assembleDuration}s`,
        size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        speed: `${(stats.size / (1024 * 1024) / assembleDuration).toFixed(
          2,
        )} MB/s`,
      });

      // --- Uso de resource, field e id para lógica de DB ---
      const resourceMeta = await this.adminMeta.getResourceMeta(resource);
      const fieldMeta = await this.adminMeta.getFieldMeta(resource, field);
      const isLesson =
        resourceMeta.tableName === 'leccion' || resourceMeta.name === 'Leccion';

      // Acceso dinámico al modelo de Prisma
      const prismaModelKey =
        resourceMeta.name.charAt(0).toLowerCase() + resourceMeta.name.slice(1);
      const client = (this.prisma as any)[prismaModelKey];

      const existing = await client.findUnique({ where: { id } });
      if (!existing)
        throw new Error(
          `El registro ${id} ya no existe en la tabla ${resource}`,
        );

      // Generación de nombre base para el archivo final comprimido
      const baseName =
        existing.slug ?? existing.titulo ?? `${resourceMeta.tableName}-${id}`;
      const folder = path.join('uploads', 'media');

      // Reconstrucción del objeto de archivo para Multer-like compatibility
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

      if (clientId) {
        this.videoGateway.emitStage(clientId, 'processing');
        this.videoGateway.emitProgress(clientId, 0);
      }

      // Disparar proceso de FFmpeg en segundo plano
      await this.processVideoBackground(
        file,
        folder,
        baseName,
        clientId,
        client,
        id,
        fieldMeta.name, // Columna real en DB (ej: 'video_url')
        isLesson,
        resourceMeta.name,
      );
    } catch (err) {
      console.error('❌ Error en assembleAndProcessVideo:', err);
      if (fs.existsSync(finalPath)) await fsp.unlink(finalPath).catch(() => {});

      if (clientId) {
        this.videoGateway.emitError(
          clientId,
          `Error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
        );
      }
    } finally {
      // Liberar el lock siempre al final
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
    resourceName: string,
  ) {
    const processStart = Date.now();
    try {
      // 1. COMPRESIÓN (La tarea más pesada)
      // Tip: Asegúrate que saveCompressedVideoFromDisk use -threads 1
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

      // 2. TAREAS SECUNDARIAS (Metadata y Visuals)
      // Las envolvemos en Promise.all para que, si el servidor tiene un respiro,
      // FFmpeg pueda optimizar la lectura del archivo.
      let durationS: number | null = null;
      let previewVttUrl: string | null = null;
      let thumbUrl: string | null = null;

      try {
        const baseNameForVtt = path.basename(
          filenameOnly,
          path.extname(filenameOnly),
        );

        // Ejecutamos la duración primero porque es instantánea (FFprobe)
        const duration = await this.mediaStorage.getVideoDurationSeconds(
          absoluteVideoPath,
        );
        durationS = Math.round(duration);

        // Generamos VTT y Thumbnail
        // Si notas que el VPS se calienta mucho, mantén estos en 'await' secuencial.
        // Si quieres velocidad, usa Promise.allSettled.
        const [preview, thumb] = await Promise.all([
          this.mediaStorage
            .generateVttAndSprite(
              absoluteVideoPath,
              'uploads/media',
              baseNameForVtt,
            )
            .catch((e) => (console.error('VTT Error', e), null)),
          this.mediaStorage
            .generateVideoThumbnailWebp(
              absoluteVideoPath,
              'uploads/thumbnails',
              baseNameForVtt,
            )
            .catch((e) => (console.error('Thumb Error', e), null)),
        ]);

        previewVttUrl = preview?.vttUrl ?? null;
        thumbUrl = thumb?.thumbUrl ?? null;
      } catch (e) {
        console.error('Error en post-procesamiento visual:', e);
      }

      // 3. LIMPIEZA DE VIDEO ANTERIOR
      // Optimizamos: Buscamos el registro actual para saber si hay que borrar algo.
      const existingRecord = await client.findUnique({
        where: { id },
        select: { [fieldName]: true }, // Solo pedimos la columna del video
      });

      if (
        existingRecord?.[fieldName] &&
        existingRecord[fieldName] !== filenameOnly
      ) {
        const oldPath = path
          .join(folder, existingRecord[fieldName])
          .replace(/\\/g, '/');
        // No usamos await aquí para no retrasar la respuesta al usuario,
        // dejamos que se borre en "fire and forget" o con catch.
        this.mediaStorage
          .deleteVideoResources(oldPath)
          .catch((err) =>
            console.warn(`[VideoCleanup] No se pudo borrar ${oldPath}:`, err),
          );
      }

      // 4. ACTUALIZACIÓN FINAL DE BASE DE DATOS
      const updateData: Record<string, unknown> = {
        [fieldName]: filenameOnly,
      };

      if (isLesson && fieldName === 'rutaSrc') {
        if (durationS && durationS > 0) {
          updateData.duracion = parseFloat((durationS / 60).toFixed(2));
        }
        if (thumbUrl) {
          updateData.previewUrl = thumbUrl;
        }
      }

      await client.update({
        where: { id },
        data: updateData,
      });

      // 5. FINALIZACIÓN
      if (clientId) {
        this.videoGateway.emitDone(clientId);
      }

      // Revalidación (Next.js o similar)
      this.revalidationService.revalidateResource(resourceName).catch(() => {});

      console.info('✅ video_process_done', {
        id,
        filename: filenameOnly,
        totalTime: `${(Date.now() - processStart) / 1000}s`,
      });
    } catch (err) {
      console.error('❌ video_process_error', { id, error: err });
      if (clientId) {
        this.videoGateway.emitError(
          clientId,
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      // SIEMPRE borrar el archivo temporal original de 50MB-XGB
      await fsp.unlink(file.path).catch(() => {});
    }
  }
}
