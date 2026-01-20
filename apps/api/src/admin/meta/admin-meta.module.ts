import { Module } from '@nestjs/common';
import { AdminMetaController } from './admin-meta.controller';

@Module({
  controllers: [AdminMetaController],
})
export class AdminMetaModule {}
