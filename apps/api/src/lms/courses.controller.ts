import { Controller, Get, Param, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { QueryCourseDto } from './dto/query-course.dto';

@Controller('catalog')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get('cursos')
  list(@Query() q: QueryCourseDto) {
    return this.service.list(q);
  }

  @Get('cursos/filtros')
  facets(@Query() q: QueryCourseDto) {
    return this.service.facets(q);
  }

  @Get('cursos/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.bySlug(slug);
  }
}
