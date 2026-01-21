import { Module } from '@nestjs/common';
import { AdminCrudController } from './admin-crud.controller';
import { AdminCrudService } from './admin-crud.service';

@Module({
  controllers: [AdminCrudController],
  providers: [AdminCrudService],
  exports: [AdminCrudService],
})
export class AdminCrudModule {}
