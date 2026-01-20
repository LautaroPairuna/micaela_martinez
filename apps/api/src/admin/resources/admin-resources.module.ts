// src/admin/resources/admin-resources.module.ts

import { Module } from '@nestjs/common';
import { AdminResourcesService } from './admin-resources.service';
import { AdminResourcesController } from './admin-resources.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminResourcesService],
  controllers: [AdminResourcesController],
})
export class AdminResourcesModule {}
