// apps/api/src/admin/crud/admin-crud.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildAdminMeta } from '../meta/admin-meta.utils';
import type { ResourceMeta } from '../meta/admin-meta.types';
import { ImageUrlUtil } from '../../common/utils/image-url.util';

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString, MaxLength } from 'class-validator';

/* ─────────────────────── Tipos públicos ─────────────────────── */

export class AdminListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminListResponse = {
  items: any[];
  pagination: Pagination;
};

/* ─────────────────────── Servicio CRUD genérico ─────────────────────── */

@Injectable()
export class AdminCrudService {
  private readonly meta: ResourceMeta[] = buildAdminMeta();

  constructor(private readonly prisma: PrismaService) {}

  /** Busca la definición de recurso en el meta por tableName o nombre de modelo */
  private getResourceMeta(resource: string): ResourceMeta {
    const normalized = resource.toLowerCase();

    const found =
      this.meta.find((m) => m.tableName.toLowerCase() === normalized) ??
      this.meta.find((m) => m.name.toLowerCase() === normalized);

    if (!found) {
      throw new BadRequestException(`Recurso '${resource}' no soportado`);
    }
    return found;
  }

  /** Devuelve el cliente Prisma correspondiente al modelo */
  private getPrismaClient(meta: ResourceMeta) {
    const key = meta.name.charAt(0).toLowerCase() + meta.name.slice(1);
    const client = (this.prisma as any)[key];
    if (!client) {
      throw new Error(`Prisma client para '${key}' no encontrado`);
    }
    return client;
  }

  /** Filtro básico por q: busca en campos String, o por id si es número */
  private buildWhere(
    meta: ResourceMeta,
    query: AdminListQuery,
  ): Record<string, any> {
    const where: Record<string, any> = {};
    const q = query.q?.trim();

    if (!q) return where;

    // Campos string escaneables
    const stringFields = meta.fields.filter(
      (f) =>
        f.kind === 'scalar' &&
        f.type === 'String' &&
        !f.isList &&
        !f.isEnum &&
        !f.isId,
    );

    if (stringFields.length > 0) {
      where.OR = stringFields.map((f) => ({
        [f.name]: {
          contains: q,
          mode: 'insensitive',
        },
      }));
      return where;
    }

    // Fallback: si q es número, intentar por id
    const idField = meta.fields.find(
      (f) => f.isId && f.kind === 'scalar' && f.type === 'Int',
    );
    const asNumber = Number(q);
    if (idField && !Number.isNaN(asNumber)) {
      where[idField.name] = asNumber;
    }

    return where;
  }

  /** Orden por defecto: primero 'creadoEn', luego 'id' si existe */
  private buildOrderBy(meta: ResourceMeta): Record<string, any> {
    const createdAtField = meta.fields.find(
      (f) => f.name === 'creadoEn' && f.kind === 'scalar',
    );
    if (createdAtField) {
      return { [createdAtField.name]: 'desc' };
    }

    const idField = meta.fields.find((f) => f.isId);
    if (idField) {
      return { [idField.name]: 'desc' };
    }

    // Fallback hardcodeado
    return { id: 'desc' };
  }

  /** include para `_count` de todos los campos hijos marcados como isParentChildCount */
  private buildListInclude(meta: ResourceMeta): any {
    const countFields = meta.fields.filter((f) => f.isParentChildCount);

    const include: any = {};

    if (countFields.length > 0) {
      include._count = {
        select: Object.fromEntries(countFields.map((f) => [f.name, true])),
      };
    }

    return include;
  }

  /** Filtra el body según los campos permitidos en meta */
  private sanitizeData(
    meta: ResourceMeta,
    input: any,
    mode: 'create' | 'update',
  ): Record<string, any> {
    if (!input || typeof input !== 'object') return {};

    const allowedFields = meta.fields.filter((f) => {
      // solo campos que el admin muestra en formulario
      if (!f.showInForm) return false;

      // no tocar campos de conteo
      if (f.isParentChildCount) return false;

      // nunca dejamos que el body setee el ID
      if (f.isId) return false;

      // FKs: si showInForm = true, los dejamos pasar
      return true;
    });

    const data: Record<string, any> = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(input, field.name)) {
        data[field.name] = input[field.name];
      }
    }

    return data;
  }

  // ─────────────────────── AUDITORÍA ───────────────────────

  private async logAudit(
    meta: ResourceMeta,
    action: 'create' | 'update' | 'delete',
    recordId: string | number,
    oldData?: any,
    newData?: any,
  ) {
    // TODO: cuando tengas auth integrado, reemplazá el 1 por el usuario real
    const userId = 1;

    try {
      await this.prisma.auditLog.create({
        data: {
          tableName: meta.tableName, // p.ej. "producto"
          recordId: String(recordId), // siempre string
          action, // "create" | "update" | "delete"
          oldData: oldData ?? null,
          newData: newData ?? null,
          userId,
          userAgent: null,
          ipAddress: null,
          endpoint: `/admin/resources/${meta.tableName}`,
        },
      });
    } catch (err) {
      // Nunca romper el flujo principal por un fallo en el log
      console.error('Error escribiendo en AuditLog:', err);
    }
  }

  // ─────────────────────── CRUD ───────────────────────

  async list(
    resource: string,
    query: AdminListQuery,
  ): Promise<AdminListResponse> {
    const meta = this.getResourceMeta(resource);
    const client = this.getPrismaClient(meta);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = this.buildWhere(meta, query);
    const orderBy = this.buildOrderBy(meta);
    const include = this.buildListInclude(meta);

    const [items, totalItems] = await this.prisma.$transaction([
      client.findMany({
        where,
        orderBy,
        skip,
        take,
        ...(Object.keys(include).length > 0 ? { include } : {}),
      }),
      client.count({ where }),
    ]);

    const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async findOne(resource: string, id: string) {
    const meta = this.getResourceMeta(resource);
    const client = this.getPrismaClient(meta);

    const idField = meta.fields.find((f) => f.isId);
    if (!idField) {
      throw new BadRequestException(
        `Recurso '${meta.name}' no tiene campo id definido en meta`,
      );
    }

    let parsedId: any = id;
    if (idField.type === 'Int') {
      parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId)) {
        throw new BadRequestException(`Id inválido para recurso '${resource}'`);
      }
    }

    const normalized = meta.tableName.toLowerCase();
    const include =
      normalized === 'orden'
        ? {
            usuario: { select: { email: true, nombre: true } },
            items: true,
            direccionEnvio: true,
            direccionFacturacion: true,
          }
        : undefined;

    const record = await client.findUnique({
      where: { [idField.name]: parsedId },
      ...(include ? { include } : {}),
    });

    if (normalized !== 'orden' || !record || !Array.isArray(record.items)) {
      return record;
    }

    const items = record.items as Array<{
      id: number;
      tipo: unknown;
      refId: unknown;
      [k: string]: unknown;
    }>;

    const productIds = Array.from(
      new Set(
        items
          .filter((it) => String(it.tipo).toUpperCase() === 'PRODUCTO')
          .map((it) => (typeof it.refId === 'number' ? it.refId : null))
          .filter((v): v is number => v !== null),
      ),
    );

    const courseIds = Array.from(
      new Set(
        items
          .filter((it) => String(it.tipo).toUpperCase() === 'CURSO')
          .map((it) => (typeof it.refId === 'number' ? it.refId : null))
          .filter((v): v is number => v !== null),
      ),
    );

    const [products, courses] = await Promise.all([
      productIds.length
        ? this.prisma.producto.findMany({
            where: { id: { in: productIds } },
            select: { id: true, imagen: true },
          })
        : Promise.resolve([]),
      courseIds.length
        ? this.prisma.curso.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, portada: true },
          })
        : Promise.resolve([]),
    ]);

    const productImageById = new Map(
      products.map((p) => [p.id, ImageUrlUtil.getProductImageUrl(p.imagen)]),
    );

    const courseImageById = new Map(
      courses.map((c) => [c.id, ImageUrlUtil.getCourseImageUrl(c.portada)]),
    );

    const enrichedItems = items.map((it) => {
      const tipo = String(it.tipo).toUpperCase();
      const refId = typeof it.refId === 'number' ? it.refId : null;

      const imageUrl =
        tipo === 'PRODUCTO'
          ? refId != null
            ? (productImageById.get(refId) ?? null)
            : null
          : tipo === 'CURSO'
            ? refId != null
              ? (courseImageById.get(refId) ?? null)
              : null
            : null;

      return { ...it, imageUrl };
    });

    return { ...record, items: enrichedItems };
  }

  async create(resource: string, body: any) {
    const meta = this.getResourceMeta(resource);
    const client = this.getPrismaClient(meta);

    const data = this.sanitizeData(meta, body, 'create');

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        `No hay campos válidos para crear en recurso '${resource}'`,
      );
    }

    const created = await client.create({
      data,
    });

    // Determinar el ID real del registro creado
    const idField = meta.fields.find((f) => f.isId);
    const recordId =
      (idField ? created[idField.name] : created.id) ?? created.slug ?? '';

    await this.logAudit(meta, 'create', recordId, null, created);

    return created;
  }

  async update(resource: string, id: string, body: any) {
    const meta = this.getResourceMeta(resource);
    const client = this.getPrismaClient(meta);

    const idField = meta.fields.find((f) => f.isId);
    if (!idField) {
      throw new BadRequestException(
        `Recurso '${meta.name}' no tiene campo id definido en meta`,
      );
    }

    let parsedId: any = id;
    if (idField.type === 'Int') {
      parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId)) {
        throw new BadRequestException(`Id inválido para recurso '${resource}'`);
      }
    }

    const data = this.sanitizeData(meta, body, 'update');

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        `No hay campos válidos para actualizar en recurso '${resource}'`,
      );
    }

    // Estado previo para oldData
    const before = await client.findUnique({
      where: { [idField.name]: parsedId },
    });

    const updated = await client.update({
      where: { [idField.name]: parsedId },
      data,
    });

    await this.logAudit(meta, 'update', parsedId, before, updated);

    return updated;
  }

  async delete(resource: string, id: string) {
    const meta = this.getResourceMeta(resource);
    const client = this.getPrismaClient(meta);

    const idField = meta.fields.find((f) => f.isId);
    if (!idField) {
      throw new BadRequestException(
        `Recurso '${meta.name}' no tiene campo id definido en meta`,
      );
    }

    let parsedId: any = id;
    if (idField.type === 'Int') {
      parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId)) {
        throw new BadRequestException(`Id inválido para recurso '${resource}'`);
      }
    }

    const deleted = await client.delete({
      where: { [idField.name]: parsedId },
    });

    await this.logAudit(meta, 'delete', parsedId, deleted, null);

    return deleted;
  }
}
