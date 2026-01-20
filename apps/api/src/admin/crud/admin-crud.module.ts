import { Module } from '@nestjs/common';
import { AdminCrudController } from './admin-crud.controller';
import { AdminCrudService } from './admin-crud.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AdminCrudController],
  providers: [AdminCrudService, PrismaService],
  exports: [AdminCrudService],
})
export class AdminCrudModule {}
