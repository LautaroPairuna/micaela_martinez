// apps/api/src/admin/crud/admin-crud.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminCrudService, AdminListQuery } from './admin-crud.service';

@Controller('admin/resources')
export class AdminCrudController {
  constructor(private readonly crud: AdminCrudService) {}

  @Get(':resource')
  list(@Param('resource') resource: string, @Query() query: AdminListQuery) {
    return this.crud.list(resource, query);
  }

  @Get(':resource/:id')
  findOne(@Param('resource') resource: string, @Param('id') id: string) {
    return this.crud.findOne(resource, id);
  }

  @Post(':resource')
  create(@Param('resource') resource: string, @Body() body: any) {
    return this.crud.create(resource, body);
  }

  @Patch(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.crud.update(resource, id, body);
  }

  @Delete(':resource/:id')
  remove(@Param('resource') resource: string, @Param('id') id: string) {
    return this.crud.delete(resource, id);
  }
}
