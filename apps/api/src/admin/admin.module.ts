// apps/api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminMetaModule } from './meta/admin-meta.module';
import { AdminCrudModule } from './crud/admin-crud.module';
import { AdminUploadModule } from './uploads/admin-upload.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AdminMetaModule,
    AdminCrudModule,
    AdminUploadModule,
    AdminDashboardModule,
  ],
  exports: [
    AdminMetaModule,
    AdminCrudModule,
    AdminUploadModule,
    AdminDashboardModule,
  ],
})
export class AdminModule {}
