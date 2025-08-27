import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductDto } from './dto/query-product.dto';

@Controller('catalog')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get('productos')
  list(@Query() q: QueryProductDto) {
    return this.service.list(q);
  }

  @Get('productos/filtros')
  facets(@Query() q: QueryProductDto) {
    return this.service.facets(q);
  }

  @Get('productos/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.service.bySlug(slug);
  }
}
