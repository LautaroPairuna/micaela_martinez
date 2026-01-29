// src/media/media.module.ts
import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaStorageService } from './media-storage.service';
import { VideoProgressGateway } from './video-progress.gateway';
import { AdminMetaModule } from '../admin/meta/admin-meta.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AdminMetaModule],
  controllers: [MediaController],
  providers: [MediaService, MediaStorageService, VideoProgressGateway],
  exports: [MediaService, MediaStorageService, VideoProgressGateway],
})
export class MediaModule {}
