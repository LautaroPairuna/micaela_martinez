import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Response, Request } from 'express';
import { MediaService } from './media.service';

@Controller('/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

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

  @Get('images/:filename')
  streamImage(@Param('filename') filename: string, @Res() res: Response) {
    const { stream, headers, status } = this.media.getImageStream(filename);
    res.status(status);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
    stream.pipe(res);
  }

  @Get('thumbnails/:filename')
  streamThumbnail(@Param('filename') filename: string, @Res() res: Response) {
    // Intentamos obtener el thumbnail del video
    try {
      const { stream, headers, status } =
        this.media.getVideoThumbnail(filename);
      res.status(status);
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
      stream.pipe(res);
    } catch (error) {
      // Si no hay thumbnail, enviamos una imagen por defecto
      res.status(404).send('Thumbnail no encontrado');
    }
  }

  @Get('images/*filename')
  streamPublicImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const { stream, headers, status } =
        this.media.getPublicImageStream(filename);
      res.status(status);
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v as any);
      stream.pipe(res);
    } catch (error) {
      res.status(404).send('Imagen no encontrada');
    }
  }
}
