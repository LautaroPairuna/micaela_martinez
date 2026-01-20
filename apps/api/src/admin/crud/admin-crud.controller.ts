import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { AdminCrudService, AdminListQuery } from './admin-crud.service';

@Controller('admin/resources')
export class AdminCrudController {
  constructor(private readonly service: AdminCrudService) {}

  // GET /admin/resources/:resource
  @Get(':resource')
  list(@Param('resource') resource: string, @Query() query: AdminListQuery) {
    return this.service.list(resource, query);
  }

  // GET /admin/resources/:resource/:id
  @Get(':resource/:id')
  findOne(@Param('resource') resource: string, @Param('id') id: string) {
    return this.service.findOne(resource, id);
  }

  // POST /admin/resources/:resource
  @Post(':resource')
  create(@Param('resource') resource: string, @Body() body: any) {
    return this.service.create(resource, body);
  }

  // PUT /admin/resources/:resource/:id
  @Put(':resource/:id')
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(resource, id, body);
  }

  // DELETE /admin/resources/:resource/:id
  @Delete(':resource/:id')
  delete(@Param('resource') resource: string, @Param('id') id: string) {
    return this.service.delete(resource, id);
  }
}
