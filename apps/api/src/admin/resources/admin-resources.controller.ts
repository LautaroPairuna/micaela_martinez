import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { AdminResourcesService } from './admin-resources.service';

@Controller('admin/resources')
export class AdminResourcesController {
  constructor(private readonly service: AdminResourcesService) {}

  @Get(':resource')
  list(@Param('resource') resource: string) {
    return this.service.list(resource);
  }

  @Get(':resource/:id')
  findOne(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(resource, id);
  }

  @Post(':resource')
  create(
    @Param('resource') resource: string,
    @Body() body: Record<string, any>,
  ) {
    return this.service.create(resource, body);
  }

  @Put(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    return this.service.update(resource, id, body);
  }

  @Delete(':resource/:id')
  remove(
    @Param('resource') resource: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(resource, id);
  }
}
