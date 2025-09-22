import { Module, OnModuleInit } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';
import { ModuleRef } from '@nestjs/core';
import {
  IMAGE_PUBLIC_DIR,
  MEDIA_UPLOAD_DIR,
  DOC_UPLOAD_DIR,
  folderNames,
} from './constants';
import { ensureDir } from '../../common/fs.util';
import * as path from 'path';
import * as multer from 'multer';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 300 * 1024 * 1024, // 300MB
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  /**
   * Inicializa los directorios base al arrancar el módulo
   */
  async onModuleInit() {
    console.log('🔧 Inicializando directorios de almacenamiento...');

    // Crear directorios base
    await Promise.all([
      ensureDir(IMAGE_PUBLIC_DIR),
      ensureDir(MEDIA_UPLOAD_DIR),
      ensureDir(DOC_UPLOAD_DIR),
    ]);

    // Crear subdirectorios para cada tabla
    const imageSubdirs = Object.values(folderNames);

    // Crear directorios de imágenes y sus thumbs
    await Promise.all(
      imageSubdirs.map(async (folder) => {
        const dir = path.join(IMAGE_PUBLIC_DIR, folder);
        const thumbsDir = path.join(dir, 'thumbs');

        await Promise.all([ensureDir(dir), ensureDir(thumbsDir)]);
      }),
    );

    console.log('✅ Directorios de almacenamiento inicializados correctamente');
  }
}
