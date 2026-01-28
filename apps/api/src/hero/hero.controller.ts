import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';
import * as path from 'path';
import { HeroService } from './hero.service';

function safeBasename(input: string) {
  const base = path.posix.basename(input);
  if (
    !base ||
    base.includes('..') ||
    base.includes('/') ||
    base.includes('\\')
  ) {
    throw new BadRequestException('Nombre de archivo inválido');
  }
  return base;
}

function guessContentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.webp':
      return 'image/webp';
    case '.avif':
      return 'image/avif';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

@Controller('hero')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get('images')
  async getHeroImages() {
    return this.heroService.getActiveImages();
  }

  // ✅ sirve archivos reales desde apps/api/public/uploads/slider/*
  @Get('image/:filename')
  streamHeroImage(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = safeBasename(filename);

    const filePath = path.join(
      process.cwd(),
      'public',
      'uploads',
      'slider',
      safeName,
    );

    if (!existsSync(filePath))
      throw new NotFoundException('Imagen no encontrada');

    const st = statSync(filePath);
    if (!st.isFile()) throw new NotFoundException('Imagen no encontrada');

    res.setHeader('Content-Type', guessContentType(filePath));
    res.setHeader('Content-Length', String(st.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    createReadStream(filePath).pipe(res);
  }
}
