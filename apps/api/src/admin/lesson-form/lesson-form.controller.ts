import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { LessonFormService } from './lesson-form.service';
import { UpsertLessonFormConfigDto } from './lesson-form.dto';

@Controller('admin/lesson-form-config')
export class LessonFormController {
  constructor(private readonly service: LessonFormService) {}

  @Get(':tipo')
  getByTipo(@Param('tipo') tipo: string) {
    return this.service.getByTipo(tipo);
  }

  @Put(':tipo')
  upsert(@Param('tipo') tipo: string, @Body() body: UpsertLessonFormConfigDto) {
    return this.service.upsert(tipo, body.schema, body.ui, body.version);
  }
}
