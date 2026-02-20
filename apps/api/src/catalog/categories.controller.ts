import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('catalog/categorias')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('arbol')
  tree() {
    return this.service.tree();
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.bySlug(slug);
  }
}
