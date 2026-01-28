// apps/api/src/admin/crud/admin-crud.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMetaModule } from '../meta/admin-meta.module';
import { AdminCrudService } from './admin-crud.service';
import { AdminCrudController } from './admin-crud.controller';

@Module({
  imports: [PrismaModule, AdminMetaModule],
  providers: [AdminCrudService],
  controllers: [AdminCrudController],
  exports: [AdminCrudService],
})
export class AdminCrudModule {}
