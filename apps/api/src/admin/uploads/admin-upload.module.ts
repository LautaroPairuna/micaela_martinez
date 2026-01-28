// src/admin/upload/admin-upload.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MediaModule } from '../../media/media.module';
import { AdminMetaModule } from '../meta/admin-meta.module';
import { AdminUploadController } from './admin-upload.controller';

@Module({
  imports: [PrismaModule, MediaModule, AdminMetaModule],
  controllers: [AdminUploadController],
})
export class AdminUploadModule {}
