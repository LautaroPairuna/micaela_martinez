// BACK ─ src/admin/uploads/uploads.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt.guard';
import { UploadsService } from './uploads.service';
import { Usuario } from '@prisma/client';
import { GetUser } from '../../auth/get-user.decorator';

// Alineado con el front y service
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // ⬇⬇ IMPORTANTE: 300MB para videos grandes (coincide con MulterModule)
      limits: { fileSize: 300 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new UnsupportedMediaTypeException(
              'Tipo de archivo no permitido. Solo: imágenes (JPEG/PNG/WebP/SVG), videos (MP4/WebM) y PDF.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('table') table: string,
    @Body('recordId') recordId?: string,
    @Body('title') title?: string,
    @Body('alt') alt?: string,
    @Body('oldFilename') oldFilename?: string, // 👈
    @GetUser() _user?: Usuario,
  ) {
    if (!file)
      throw new BadRequestException('No se proporcionó ningún archivo');
    if (!table)
      throw new BadRequestException('Se requiere el parámetro "table"');

    try {
      return await this.uploadsService.uploadFile(
        file,
        table,
        recordId,
        title,
        alt,
        oldFilename,
      );
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException('El archivo excede 300MB');
      }
      throw error;
    }
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    return this.uploadsService.deleteFile(id);
  }

  @Get(':id')
  async getFile(@Param('id') id: string) {
    return this.uploadsService.getFile(id);
  }
}
