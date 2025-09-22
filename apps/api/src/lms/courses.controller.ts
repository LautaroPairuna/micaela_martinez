import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { QueryCourseDto } from './dto/query-course.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';

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

  @UseGuards(JwtAuthGuard)
  @Get('cursos/:slug/contenido')
  getCourseContent(@Param('slug') slug: string, @CurrentUser() user: JwtUser) {
    return this.service.getCourseContentForUser(slug, user.sub);
  }
}
