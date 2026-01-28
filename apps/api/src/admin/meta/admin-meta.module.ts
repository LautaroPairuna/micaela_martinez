// apps/api/src/admin/meta/admin-meta.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMetaController } from './admin-meta.controller';
import { AdminMetaService } from './admin-meta.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminMetaController],
  providers: [AdminMetaService],
  exports: [AdminMetaService],
})
export class AdminMetaModule {}
