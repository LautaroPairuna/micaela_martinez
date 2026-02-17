// apps/api/src/media/media.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { MediaService } from './media.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { MediaStorageService } from './media-storage.service';

@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly storage: MediaStorageService,
  ) {}

  // ✅ NUEVO: Upload a DISCO (public/tmp) + transcode opcional
  // POST /api/media/videos?baseName=mi-video&clientId=...
  @Post('videos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: path.join(process.cwd(), 'public', 'tmp'),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '.mp4';
          const name = randomBytes(8).toString('hex');
          cb(null, `${name}-raw${ext}`);
        },
      }),
      limits: {
        // hardcode: 20GB (ajustá si querés)
        fileSize: 20 * 1024 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype.startsWith('video/') ||
          file.mimetype === 'application/octet-stream';
        if (!ok)
          return cb(
            new BadRequestException('El archivo no es un video.'),
            false,
          );
        cb(null, true);
      },
    }),
  )
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Query('baseName') baseName?: string,
    @Query('clientId') clientId?: string,
  ) {
    if (!file?.path) throw new BadRequestException('No se recibió el archivo.');

    const result = await this.storage.saveCompressedVideoFromDisk(
      {
        path: file.path,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      {
        folder: 'uploads/media',
        baseName:
          baseName ?? file.originalname.replace(/\.[^.]+$/, '') ?? 'video',
        clientId,
      },
    );

    // Para el front: stream por tu GET /media/videos/:filename
    const filename = path.posix.basename(result.path);

    // ✅ Generar previews (VTT + Sprite)
    // Esto es async y puede tardar, pero no queremos bloquear la respuesta del upload excesivamente?
    // Mejor await para devolver la URL ya lista, o hacerlo background.
    // Dado que el usuario pidió implementarlo, mejor await para devolver la data completa.
    const previews = await this.storage.generateVttAndSprite(
      path.join(process.cwd(), 'public', result.path), // Full path al video ya movido
      'uploads/media', // Donde guardar los previews (mismo dir que video)
      path.basename(filename, path.extname(filename)), // baseName
      clientId,
    );

    // ✅ Generar Thumbnail estático (WebP) para admin/listados
    const thumbWebp = await this.storage.generateVideoThumbnailWebp(
      path.join(process.cwd(), 'public', result.path),
      'uploads/thumbnails', // Carpeta específica para thumbs
      path.basename(filename, path.extname(filename)),
    );

    return {
      ...result,
      filename,
      streamUrl: `/api/media/videos/${filename}`,
      previewUrl: previews.vttUrl, // Front usará esto
      spriteUrl: previews.spriteUrl,
      thumbnailUrl: thumbWebp.thumbUrl,
    };
  }

  // ✅ Ruta para assets genéricos (vtt, sprites) en uploads/media
  @Get('assets/:filename')
  streamAsset(@Param('filename') filename: string, @Res() res: Response) {
    // Reutilizamos logic de getVideoStream para buscar en roots
    // pero con mimetype más flexible
    try {
      // Usamos getVideoStream internamente porque ya busca en 'media' y 'uploads/media'
      // pero ojo que getVideoStream fuerza video/* content-type a veces.
      // Mejor usamos una lógica simplificada similar a getPublicImageStream

      // Asumimos que los assets están donde los videos (uploads/media)
      const { stream, headers, status } = this.media.getAssetStream(filename);
      res.status(status);
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
      stream.pipe(res);
    } catch {
      res.status(404).send('Asset no encontrado');
    }
  }

  @Get('videos/:filename')
  streamVideo(
    @Param('filename') filename: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const range = req.headers.range;

    const { stream, headers, status } = this.media.getVideoStream(
      filename,
      range,
      { token },
    );

    res.status(status);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
    stream.pipe(res);
  }

  @Get('documents/:filename')
  streamDoc(
    @Param('filename') filename: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const asAttachment = download === 'true';

    const { stream, headers, status } = this.media.getDocumentStream(
      filename,
      asAttachment,
    );
    res.status(status);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
    stream.pipe(res);
  }

  // ✅ Ruta única para imágenes con subcarpetas
  // Ej: /api/media/images/uploads/producto/foo.webp
  @Get('images/*path')
  streamPublicImage(@Param('path') pathParam: string, @Res() res: Response) {
    const { stream, headers, status } =
      this.media.getPublicImageStream(pathParam);

    res.status(status);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
    stream.pipe(res);
  }

  @Get('thumbnails/:filename')
  streamThumbnail(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const { stream, headers, status } =
        this.media.getVideoThumbnail(filename);
      res.status(status);
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
      stream.pipe(res);
    } catch {
      res.status(404).send('Thumbnail no encontrado');
    }
  }
}
