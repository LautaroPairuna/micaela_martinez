import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('catalog/categorias')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get('arbol')
  tree() { return this.service.tree(); }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) { return this.service.bySlug(slug); }
}
