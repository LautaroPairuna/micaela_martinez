import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomBytes } from 'crypto';

const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { VideoProgressGateway } from './video-progress.gateway';

type TranscodeMode = 'auto' | 'off';

type FfmpegProgress = {
  percent?: number;
};

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);

  private readonly publicRoot = path.join(process.cwd(), 'public');

  private readonly transcodeMode: TranscodeMode;

  private readonly minSizeForTranscodeBytes = 150 * 1024 * 1024; // 150MB

  // ✅ HARDCODE: si falla ffmpeg, NO borramos el tmp; copiamos raw a uploads y dejamos tmp para inspección
  private readonly keepTmpOnFfmpegError = true;

  constructor(private readonly videoGateway: VideoProgressGateway) {
    const modeEnv = (process.env.VIDEO_TRANSCODE_MODE ?? 'auto')
      .toLowerCase()
      .trim();

    this.transcodeMode = modeEnv === 'off' ? 'off' : 'auto';

    const ffmpegPath = (ffmpegInstaller as any).path as string | undefined;
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      this.logger.log(
        `ffmpeg inicializado desde @ffmpeg-installer/ffmpeg: ${ffmpegPath}`,
      );
    } else {
      this.logger.warn(
        'No se encontró path en @ffmpeg-installer/ffmpeg; ffmpeg intentará usar el PATH del sistema.',
      );
    }

    this.logger.log(`VIDEO_TRANSCODE_MODE=${this.transcodeMode}`);
    this.logger.log(`keepTmpOnFfmpegError=${this.keepTmpOnFfmpegError}`);
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  // ---------- IMÁGENES ----------

  async saveImageWebp(
    file: { originalname: string; buffer: Buffer },
    opts: { folder: string; width?: number; baseName?: string },
  ): Promise<{ path: string; url: string; originalName: string }> {
    const width = opts.width ?? 1200;

    const originalBase = file.originalname.replace(/\.[^.]+$/, '');
    const rawBase = opts.baseName || originalBase;
    const safeBase = this.slugify(rawBase);

    const hash = randomBytes(3).toString('hex');
    const filename = `${safeBase}-${hash}.webp`;

    const folderPath = path.join(this.publicRoot, opts.folder);
    await fs.mkdir(folderPath, { recursive: true });

    const fullPath = path.join(folderPath, filename);
    const thumbName = `${safeBase}-${hash}-thumb.webp`;
    const thumbPath = path.join(folderPath, thumbName);

    const webpBuffer = await sharp(file.buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await fs.writeFile(fullPath, webpBuffer);

    const thumbBuffer = await sharp(file.buffer)
      .resize({ width: 320, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    await fs.writeFile(thumbPath, thumbBuffer);

    const relativePath = path.join(opts.folder, filename).replace(/\\/g, '/');
    const url = `/api/media/images/${relativePath}`;

    return {
      path: relativePath,
      url,
      originalName: file.originalname,
    };
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(this.publicRoot, relativePath);
    await fs.rm(fullPath, { force: true });
    if (
      relativePath.endsWith('.webp') &&
      !relativePath.endsWith('-thumb.webp')
    ) {
      const thumbPath = relativePath.replace(/\.webp$/i, '-thumb.webp');
      const fullThumbPath = path.join(this.publicRoot, thumbPath);
      await fs.rm(fullThumbPath, { force: true });
    }
  }

  // ---------- VIDEO: (VIEJO) buffer -> tmp -> ffmpeg ----------
  // Lo dejamos por compatibilidad. Para 8GB NO es ideal.
  async saveCompressedVideo(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    opts: {
      folder: string;
      baseName: string;
      clientId?: string;
    },
  ): Promise<{ path: string; url: string; originalName: string }> {
    const { clientId } = opts;

    if (this.transcodeMode === 'off') {
      this.logger.warn(
        `VIDEO_TRANSCODE_MODE=off → se guarda video sin comprimir: ${file.originalname}`,
      );
      return this.saveRawFile(file, opts);
    }

    if (file.size < this.minSizeForTranscodeBytes) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      this.logger.log(
        `Video de ${mb}MB < ${(
          this.minSizeForTranscodeBytes /
          (1024 * 1024)
        ).toFixed(0)}MB → se guarda sin comprimir: ${file.originalname}`,
      );
      return this.saveRawFile(file, opts);
    }

    const tmpDir = path.resolve(this.publicRoot, 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });

    const ext = path.extname(file.originalname) || '.mp4';

    const safeBase =
      opts.baseName
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'video';

    const uniq = Date.now().toString(36);
    const tmpInputName = `${safeBase}-${uniq}-raw${ext}`;
    const tmpInputPath = path.join(tmpDir, tmpInputName);

    await fs.writeFile(tmpInputPath, file.buffer);

    // log de tamaño tmp
    try {
      const st = await fs.stat(tmpInputPath);
      this.logger.log(
        `[TMP(buffer)] wrote tmp=${tmpInputPath} disk.size=${st.size} buf.size=${file.size}`,
      );
    } catch {
      this.logger.warn(`[TMP(buffer)] No se pudo stat tmp: ${tmpInputPath}`);
    }

    const targetDir = path.resolve(this.publicRoot, opts.folder);
    await fs.mkdir(targetDir, { recursive: true });

    const finalName = `${safeBase}-${uniq}.mp4`;
    const finalPath = path.join(targetDir, finalName);

    let transcodeOk = false;

    try {
      await this.runFfmpegFluent(tmpInputPath, finalPath, clientId);
      transcodeOk = true;
    } catch (err) {
      this.logger.error(
        `Fallo la transcodificación (buffer), se guardará el crudo. Error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      // fallback: guardar crudo desde buffer (esto sí usa RAM, por eso es “viejo”)
      return this.saveRawFile(file, opts);
    } finally {
      if (transcodeOk || !this.keepTmpOnFfmpegError) {
        try {
          await fs.unlink(tmpInputPath);
        } catch (err) {
          this.logger.warn(
            `No se pudo borrar input temporal: ${tmpInputPath} (${
              err instanceof Error ? err.message : String(err)
            })`,
          );
        }
      } else {
        this.logger.warn(
          `[TMP(buffer)] keepTmpOnFfmpegError=true -> tmp preservado: ${tmpInputPath}`,
        );
      }
    }

    const relativePath = path
      .relative(this.publicRoot, finalPath)
      .replace(/\\/g, '/');

    const url = `/media/${relativePath}`;

    return {
      path: relativePath,
      url,
      originalName: file.originalname,
    };
  }

  // ---------- VIDEO: NUEVO (DESDE DISCO, sin buffer) ----------
  async saveCompressedVideoFromDisk(
    file: {
      path: string; // public/tmp/xxx-raw.mp4
      originalname: string;
      mimetype: string;
      size: number;
    },
    opts: {
      folder: string; // 'uploads/media'
      baseName: string;
      clientId?: string;
    },
  ): Promise<{ path: string; url: string; originalName: string }> {
    const { clientId } = opts;

    // Diagnóstico: tamaño real en disco vs multer
    try {
      const st = await fs.stat(file.path);
      this.logger.log(
        `[TMP(disk)] path=${file.path} disk.size=${st.size} multer.size=${file.size}`,
      );
      if (st.size !== file.size) {
        this.logger.warn(
          `[TMP(disk)] Size mismatch: multer.size=${file.size} disk.size=${st.size} file=${file.path}`,
        );
      }
    } catch {
      this.logger.warn(`[TMP(disk)] No se pudo stat() del input: ${file.path}`);
    }

    const safeBase = this.slugify(opts.baseName || 'video');
    const uniq = Date.now().toString(36);

    const targetDir = path.resolve(this.publicRoot, opts.folder);
    await fs.mkdir(targetDir, { recursive: true });

    const finalMp4Name = `${safeBase}-${uniq}.mp4`;
    const finalMp4Path = path.join(targetDir, finalMp4Name);

    // Si transcode está off o es chico -> mover raw
    if (
      this.transcodeMode === 'off' ||
      file.size < this.minSizeForTranscodeBytes
    ) {
      const rawExt = path.extname(file.originalname) || '.mp4';
      const rawFinalPath = path.join(targetDir, `${safeBase}-${uniq}${rawExt}`);

      await this.safeMoveFile(file.path, rawFinalPath);

      // Si no hubo transcode, emitimos 100% y done si aplica
      if (clientId) {
        this.videoGateway.emitProgress(clientId, 100);
        // No emitimos DONE aquí porque podría haber paso 2 (assets)
        // Pero como es raw, quizás no haya paso 2?
        // Asumiremos que el controller orquesta.
        // En el modo raw, la compresión termina instantáneamente.
      }

      const relativePath = path
        .relative(this.publicRoot, rawFinalPath)
        .replace(/\\/g, '/');
      return {
        path: relativePath,
        url: `/media/${relativePath}`,
        originalName: file.originalname,
      };
    }

    // Notificar etapa: Compresión
    this.videoGateway.emitStage(clientId, 'compressing');
    this.videoGateway.emitProgress(clientId, 0);

    // Intentar transcode desde disco
    try {
      await this.runFfmpegFluent(file.path, finalMp4Path, clientId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Fallo la transcodificación (disk). Error: ${msg}`);

      // fallback: guardar crudo (pero preservar tmp si está hardcodeado)
      const rawExt = path.extname(file.originalname) || '.mp4';
      const rawFinalPath = path.join(targetDir, `${safeBase}-${uniq}${rawExt}`);

      if (this.keepTmpOnFfmpegError) {
        this.logger.warn(
          `[TMP(disk)] keepTmpOnFfmpegError=true -> tmp preservado: ${file.path}`,
        );
        await this.safeCopyFile(file.path, rawFinalPath); // copia y deja tmp
      } else {
        await this.safeMoveFile(file.path, rawFinalPath);
      }

      const relativePath = path
        .relative(this.publicRoot, rawFinalPath)
        .replace(/\\/g, '/');
      return {
        path: relativePath,
        url: `/media/${relativePath}`,
        originalName: file.originalname,
      };
    }

    // Transcode OK -> borrar tmp
    try {
      await fs.unlink(file.path);
    } catch {
      this.logger.warn(`No se pudo borrar raw tmp: ${file.path}`);
    }

    const relativePath = path
      .relative(this.publicRoot, finalMp4Path)
      .replace(/\\/g, '/');
    return {
      path: relativePath,
      url: `/media/${relativePath}`,
      originalName: file.originalname,
    };
  }

  private runFfmpegFluent(
    inputPath: string,
    outputPath: string,
    clientId?: string,
  ): Promise<void> {
    // Threads: 0 = auto (usa todos los cores). Si el usuario define ENV, lo respetamos.
    // Antes limitábamos a 2, lo cual causa "bajo uso de CPU" y lentitud.
    const threads = process.env.FFMPEG_THREADS
      ? Number(process.env.FFMPEG_THREADS)
      : 0;

    return new Promise((resolve, reject) => {
      this.logger.log(
        `Iniciando ffmpeg (fluent) → ${outputPath} con threads=${threads === 0 ? 'auto' : threads} (clientId=${clientId})`,
      );

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          // Scale con algoritmo rápido (bilinear) y mantén FPS nativo para evitar overhead de conversión
          '-vf scale=-2:720:flags=fast_bilinear',
          '-preset ultrafast', // Prioridad absoluta a velocidad
          '-crf 30', // Calidad aceptable para web, archivo más ligero
          '-b:a 96k',
          '-movflags +faststart',
          `-threads ${threads}`,
        ])
        .on('progress', (p: FfmpegProgress) => {
          if (typeof p?.percent === 'number') {
            const rawPct = Math.max(0, Math.min(100, p.percent));
            this.videoGateway.emitProgress(clientId, rawPct);
          }
        })
        .on('end', () => {
          this.logger.log(`ffmpeg OK: ${outputPath}`);
          this.videoGateway.emitProgress(clientId, 100);
          resolve();
        })
        .on('error', (err: unknown) => {
          const msg =
            err instanceof Error
              ? err.message
              : `Error desconocido: ${String(err)}`;
          this.logger.error(
            `ffmpeg error para ${inputPath} → ${outputPath}: ${msg}`,
          );
          this.videoGateway.emitError(clientId, msg);
          reject(err);
        })
        .save(outputPath);
    });
  }

  // ---------- RAW genérico (buffer) ----------
  async saveRawFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    opts: {
      folder: string;
      baseName: string;
      clientId?: string;
    },
  ): Promise<{ path: string; url: string; originalName: string }> {
    const publicRoot = this.publicRoot;

    const targetDir = path.resolve(publicRoot, opts.folder);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(file.originalname) || '';

    const safeBase =
      opts.baseName
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'file';

    const uniq = Date.now().toString(36);
    const finalName = `${safeBase}-${uniq}${ext}`;

    const finalPath = path.resolve(targetDir, finalName);
    await fs.writeFile(finalPath, file.buffer);

    const relativePath = path
      .relative(publicRoot, finalPath)
      .replace(/\\/g, '/');
    const url = `/media/${relativePath}`;

    return {
      path: relativePath,
      url,
      originalName: file.originalname,
    };
  }

  // ✅ RAW desde disco (sin buffer gigante) — NUEVO
  async saveRawFileFromDisk(
    file: {
      path: string; // tmp path
      originalname: string;
      mimetype: string;
      size: number;
    },
    opts: {
      folder: string;
      baseName: string;
    },
  ): Promise<{ path: string; url: string; originalName: string }> {
    const targetDir = path.resolve(this.publicRoot, opts.folder);
    await fs.mkdir(targetDir, { recursive: true });

    const ext = path.extname(file.originalname) || '';
    const safeBase = this.slugify(opts.baseName || 'file');
    const uniq = Date.now().toString(36);

    const finalName = `${safeBase}-${uniq}${ext}`;
    const finalPath = path.resolve(targetDir, finalName);

    await this.safeMoveFile(file.path, finalPath);

    const relativePath = path
      .relative(this.publicRoot, finalPath)
      .replace(/\\/g, '/');

    return {
      path: relativePath,
      url: `/media/${relativePath}`,
      originalName: file.originalname,
    };
  }

  // ✅ mover archivos GRANDES sin RAM
  private async safeMoveFile(from: string, to: string): Promise<void> {
    try {
      await fs.rename(from, to);
    } catch {
      await fs.copyFile(from, to);
      await fs.unlink(from);
    }
  }

  // ✅ copiar sin borrar (para preservar tmp)
  private async safeCopyFile(from: string, to: string): Promise<void> {
    await fs.copyFile(from, to);
  }

  // ---------- PREVIEWS (VTT + SPRITE) ----------
  async generateVttAndSprite(
    videoPath: string,
    outputDir: string, // 'uploads/media' (relativo a publicRoot)
    baseName: string,
    clientId?: string,
  ): Promise<{ vttUrl: string | null; spriteUrl: string | null }> {
    if (this.transcodeMode === 'off') {
      return { vttUrl: null, spriteUrl: null };
    }

    // Notificar etapa: Generando Assets
    this.videoGateway.emitStage(clientId, 'generating_assets');
    this.videoGateway.emitProgress(clientId, 0);

    const fullOutputDir = path.resolve(this.publicRoot, outputDir);
    await fs.mkdir(fullOutputDir, { recursive: true });

    const spriteName = `${baseName}-sprite.jpg`;
    const vttName = `${baseName}-preview.vtt`;
    const spritePath = path.join(fullOutputDir, spriteName);
    const vttPath = path.join(fullOutputDir, vttName);

    // Configuración OPTIMIZADA (15s / 120px)
    const interval = 15;
    const width = 120;
    const height = 68;
    const cols = 5;

    // 1. Obtener duración del video
    let duration = 0;
    try {
      duration = await this.getVideoDuration(videoPath);
    } catch (e) {
      this.logger.error(
        `Error obteniendo duración para VTT: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return { vttUrl: null, spriteUrl: null };
    }

    if (!duration || duration < 10) {
      this.logger.log('Video muy corto para generar previews.');
      return { vttUrl: null, spriteUrl: null };
    }

    const totalImages = Math.ceil(duration / interval);
    const rows = Math.ceil(totalImages / cols);

    // 2. Generar Sprite con ffmpeg
    const vf = `fps=1/${interval},scale=${width}:${height},tile=${cols}x${rows}`;

    this.logger.log(`Generando sprite: ${spritePath} (grid ${cols}x${rows})`);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .outputOptions(['-vf', vf, '-frames:v', '1', '-q:v', '3'])
          .output(spritePath)
          .on('progress', (p: FfmpegProgress) => {
            if (typeof p?.percent === 'number') {
              const rawPct = Math.max(0, Math.min(100, p.percent));
              this.videoGateway.emitProgress(clientId, rawPct);
            }
          })
          .on('end', () => {
            this.videoGateway.emitProgress(clientId, 100);
            resolve();
          })
          .on('error', (err: Error) => reject(err))
          .run();
      });
    } catch (e) {
      this.logger.error(
        `Error generando sprite: ${e instanceof Error ? e.message : String(e)}`,
      );
      return { vttUrl: null, spriteUrl: null };
    }

    // 3. Generar VTT
    let vttContent = 'WEBVTT\n\n';

    // Usar solo el nombre del archivo para la referencia dentro del VTT
    // (asumiendo que vtt y sprite están en la misma carpeta o servidos igual)
    const spriteBasename = path.basename(spriteName);

    for (let i = 0; i < totalImages; i++) {
      const startTime = i * interval;
      const endTime = Math.min((i + 1) * interval, duration);

      const startStr = this.formatVttTime(startTime);
      const endStr = this.formatVttTime(endTime);

      const x = (i % cols) * width;
      const y = Math.floor(i / cols) * height;

      vttContent += `${startStr} --> ${endStr}\n`;
      // Referencia relativa simple
      vttContent += `${spriteBasename}#xywh=${x},${y},${width},${height}\n\n`;
    }

    await fs.writeFile(vttPath, vttContent);
    this.logger.log(`VTT generado: ${vttPath}`);

    // Al final de todo (sprite + vtt), emitimos DONE
    this.videoGateway.emitDone(clientId);

    // Construir URLs públicas
    return {
      vttUrl: `/api/media/assets/${path.basename(vttPath)}`,
      spriteUrl: `/api/media/assets/${path.basename(spritePath)}`,
    };
  }

  async getVideoDurationSeconds(videoPath: string): Promise<number> {
    return this.getVideoDuration(videoPath);
  }

  async generateVideoThumbnailWebp(
    videoPath: string,
    outputDir: string,
    baseName: string,
  ): Promise<{ thumbUrl: string | null }> {
    const fullOutputDir = path.resolve(this.publicRoot, outputDir);
    await fs.mkdir(fullOutputDir, { recursive: true });

    const thumbName = `${baseName}-thumb.webp`;
    const thumbPath = path.join(fullOutputDir, thumbName);

    // Requisito: Primer frame (seek 0)
    const seek = 0;

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .inputOptions(['-ss', String(seek)])
          .outputOptions(['-frames:v', '1', '-vf', 'scale=480:-1'])
          .output(thumbPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });

      const relativePath = path.join(outputDir, thumbName).replace(/\\/g, '/');
      // Ajustar según prefijo de API. Asumimos /media/ para archivos estáticos si outputDir es uploads/thumbnails
      // O si hay un controller específico. El código original usaba /api/media/thumbnails/
      // Vamos a usar una ruta relativa estándar a public o la que usaba el controller.
      // El controller espera una URL absoluta o relativa a la raiz del sitio.
      // En saveImageWebp retorna: /api/media/images/...
      // Aquí retornaremos: /api/media/thumbnails/nombre-archivo
      return { thumbUrl: `/api/media/thumbnails/${thumbName}` };
    } catch (e) {
      this.logger.error(
        `Error generando thumbnail de video: ${e instanceof Error ? e.message : String(e)}`,
      );
      return { thumbUrl: null };
    }
  }

  private getVideoDuration(path: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err: Error | null, metadata: any) => {
        if (err) return reject(err);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const val = metadata?.format?.duration;
        const duration = parseFloat(val);
        resolve(isNaN(duration) ? 0 : duration);
      });
    });
  }

  private formatVttTime(seconds: number): string {
    const date = new Date(0);
    date.setSeconds(seconds);
    date.setMilliseconds((seconds % 1) * 1000);
    // HH:mm:ss.mmm
    return date.toISOString().substr(11, 12);
  }
}
