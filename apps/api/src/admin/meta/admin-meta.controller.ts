// apps/api/src/admin/meta/admin-meta.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import type { ResourceMeta } from './admin-meta.types';
import { AdminMetaService } from './admin-meta.service';

@Controller('admin/meta')
export class AdminMetaController {
  constructor(private readonly adminMeta: AdminMetaService) {}

  @Get('resources')
  getAllResources(): ResourceMeta[] {
    return this.adminMeta.getAllResources();
  }

  @Get('resources/:name')
  getResource(@Param('name') name: string): ResourceMeta {
    try {
      return this.adminMeta.getResourceMeta(name);
    } catch {
      throw new NotFoundException(`Resource meta not found: ${name}`);
    }
  }
}
