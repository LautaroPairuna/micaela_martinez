// src/media/media.module.ts
import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaStorageService } from './media-storage.service';
import { VideoProgressGateway } from './video-progress.gateway';
import { AdminUploadController } from '../admin/uploads/admin-upload.controller';

@Module({
  controllers: [MediaController, AdminUploadController],
  providers: [MediaService, MediaStorageService, VideoProgressGateway],
  exports: [MediaService, MediaStorageService],
})
export class MediaModule {}
