import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LessonFormController } from './lesson-form.controller';
import { LessonFormService } from './lesson-form.service';

@Module({
  imports: [PrismaModule],
  controllers: [LessonFormController],
  providers: [LessonFormService],
  exports: [LessonFormService],
})
export class LessonFormModule {}
