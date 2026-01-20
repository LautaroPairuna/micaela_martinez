// apps/api/src/admin/meta/admin-meta.controller.ts
import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { buildAdminMeta } from './admin-meta.utils';
import type { ResourceMeta } from './admin-meta.types';

@Controller('admin/meta')
export class AdminMetaController {
  @Get('resources')
  getAllResources(): ResourceMeta[] {
    return buildAdminMeta();
  }

  @Get('resources/:name')
  getResource(@Param('name') name: string): ResourceMeta {
    const all = buildAdminMeta();

    // Permitimos buscar por nombre de modelo ('Curso') o tableName ('curso')
    const found =
      all.find((r) => r.name.toLowerCase() === name.toLowerCase()) ??
      all.find((r) => r.tableName.toLowerCase() === name.toLowerCase());

    if (!found) {
      throw new NotFoundException(`Resource meta not found: ${name}`);
    }

    return found;
  }
}
