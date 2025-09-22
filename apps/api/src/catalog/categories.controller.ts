import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('catalog/categorias')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get('arbol')
  tree() {
    return this.service.tree();
  }

  @Get('con-conteos')
  withChildrenCounts() {
    return this.service.getWithChildrenCounts();
  }

  @Get(':id/hijos/conteo')
  getChildrenCount(@Param('id') parentId: string) {
    return this.service.getChildrenCount(parentId);
  }

  @Post('conteos-multiples')
  getMultipleChildrenCounts(@Body() body: { parentIds: string[] }) {
    return this.service.getMultipleChildrenCounts(body.parentIds);
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.bySlug(slug);
  }
}
