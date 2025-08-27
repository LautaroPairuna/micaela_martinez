import { Controller, Get, Param } from '@nestjs/common';
import { BrandsService } from './brands.service';

@Controller('catalog/marcas')
export class BrandsController {
  constructor(private service: BrandsService) {}

  @Get()
  list() { return this.service.list(); }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) { return this.service.bySlug(slug); }
}
