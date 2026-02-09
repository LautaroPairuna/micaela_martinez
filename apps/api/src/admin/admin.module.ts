// apps/api/src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminMetaModule } from './meta/admin-meta.module';
import { AdminCrudModule } from './crud/admin-crud.module';
import { AdminUploadModule } from './uploads/admin-upload.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { LessonFormModule } from './lesson-form/lesson-form.module';

@Module({
  imports: [
    PrismaModule,
    AdminMetaModule,
    AdminCrudModule,
    AdminUploadModule,
    AdminDashboardModule,
    LessonFormModule,
  ],
  exports: [
    AdminMetaModule,
    AdminCrudModule,
    AdminUploadModule,
    AdminDashboardModule,
    LessonFormModule,
  ],
})
export class AdminModule {}
