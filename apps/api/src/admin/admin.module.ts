import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { AdminAuditInterceptor } from './interceptors/audit.interceptor';
import { HierarchicalDetectorService } from './utils/hierarchical-detector.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AuditService,
    HierarchicalDetectorService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminAuditInterceptor,
    },
  ],
  exports: [AdminService, AuditService, HierarchicalDetectorService],
})
export class AdminModule {}
