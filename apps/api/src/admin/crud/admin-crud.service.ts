// apps/api/src/admin/crud/admin-crud.service.ts
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PRISMA } from '../../prisma/prisma.token';
import { ExtendedPrismaClient } from '../../prisma/prisma.extensions';
import type { ResourceMeta } from '../meta/admin-meta.types';
import { AdminMetaService } from '../meta/admin-meta.service';
import { ImageUrlUtil } from '../../common/utils/image-url.util';

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString, MaxLength } from 'class-validator';
import type {
  FilterMeta,
  FilterOperator,
  FilterInput,
  VirtualFilter,
} from '../meta/admin-meta.types';

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

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  filters?: string;
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
  constructor(
    @Inject(PRISMA) private readonly prisma: ExtendedPrismaClient,
    private readonly adminMeta: AdminMetaService,
  ) {}

  private async getResourceMeta(resource: string): Promise<ResourceMeta> {
    return this.adminMeta.getResourceMeta(resource);
  }

  private getPrismaClient(meta: ResourceMeta) {
    const key = meta.name.charAt(0).toLowerCase() + meta.name.slice(1);
    const client = (this.prisma as any)[key];
    if (!client) throw new Error(`Prisma client para '${key}' no encontrado`);
    return client;
  }

  private buildSearchWhere(
    meta: ResourceMeta,
    q?: string,
  ): Record<string, any> {
    const term = q?.trim();
    if (!term) return {};

    const fields = Array.isArray(meta.searchFields) ? meta.searchFields : [];

    if (fields.length > 0) {
      return {
        OR: fields.map((name) => ({
          [name]: { contains: term, mode: 'insensitive' },
        })),
      };
    }

    // fallback: strings comunes
    const stringFields = meta.fields.filter(
      (f) =>
        f.kind === 'scalar' &&
        f.type === 'String' &&
        !f.isList &&
        !f.isEnum &&
        !f.isId,
    );

    if (stringFields.length > 0) {
      return {
        OR: stringFields.map((f) => ({
          [f.name]: { contains: term, mode: 'insensitive' },
        })),
      };
    }

    // fallback numérico a id
    const idField = meta.fields.find(
      (f) => f.isId && f.kind === 'scalar' && f.type === 'Int',
    );
    const asNumber = Number(term);
    if (idField && !Number.isNaN(asNumber)) {
      return { [idField.name]: asNumber };
    }

    return {};
  }

  private parseFilters(
    raw?: string,
  ): Array<{ field: string; op: FilterOperator; value?: unknown }> {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      const result: Array<{
        field: string;
        op: FilterOperator;
        value?: unknown;
      }> = [];
      for (const item of parsed) {
        const obj = item as Record<string, unknown>;
        const field = typeof obj.field === 'string' ? obj.field : '';
        const op = typeof obj.op === 'string' ? (obj.op as FilterOperator) : '';
        if (!field || !op) continue;
        result.push({ field, op, value: obj.value });
      }
      return result;
    } catch {
      return [];
    }
  }

  private coerceValue(
    input: FilterInput,
    value: unknown,
    fieldType?: string,
  ): unknown {
    if (value === null) return null;

    if (input === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    }

    if (input === 'number' || (input === 'relation' && fieldType === 'Int')) {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    }

    if (input === 'date') {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? undefined : d;
    }

    if (input === 'relation' && fieldType !== 'Int') {
      return typeof value === 'string' ? value : String(value);
    }

    if (input === 'string' || input === 'text' || input === 'enum') {
      return typeof value === 'string' ? value : String(value);
    }

    return value;
  }

  private parseBool(value: unknown): boolean | undefined {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  }

  private buildVirtualWhere(
    v: VirtualFilter,
    bool: boolean,
  ): Record<string, any> | null {
    if (v.kind === 'hasImage' || v.kind === 'hasValue') {
      // bool true => not null (y para string también no vacío)
      // bool false => null (o vacío si string)
      if (bool) return { [v.field]: { not: null } };
      return { [v.field]: null };
    }

    if (v.kind === 'inStock') {
      if (bool) return { [v.field]: { gt: 0 } };
      return { [v.field]: { equals: 0 } };
    }

    if (v.kind === 'outOfStock') {
      if (bool) return { [v.field]: { equals: 0 } };
      return { [v.field]: { gt: 0 } };
    }

    if (v.kind === 'discounted') {
      // bool true => precioLista != null AND precio < precioLista
      // bool false => NOT( precioLista != null AND precio < precioLista )
      const where = {
        AND: [
          { [v.listField]: { not: null } },
          { [v.priceField]: { lt: (this.prisma as any)[v.listField] } }, // no funciona así en Prisma
        ],
      };

      // ⚠️ Prisma no permite comparar campo con campo directamente.
      // Solución: implementarlo como:
      // - bool true: precioLista not null AND precio < precioLista => aproximación: precioLista not null AND precio < precioLista (no posible).
      // Entonces lo resolvemos por lógica estándar:
      // bool true: precioLista not null AND precio < precioLista => usar query raw o mantener simple: precioLista not null AND precio < precioLista => NO.
      // En vez de eso, lo hacemos como:
      // - bool true: precioLista not null AND precio < precioLista (no implementable sin raw)
      // - bool false: (precioLista null) OR (precio >= precioLista) (no implementable sin raw)
      //
      // ✅ Para mantener todo “genérico” y sin raw, lo degradamos:
      // bool true: precioLista not null (y el operador “con descuento” lo podés aplicar en UI/Report luego)
      // bool false: precioLista null
      //
      // Si querés full correcto, te armo una alternativa con $queryRaw + whitelist por modelo.
      if (bool) return { [v.listField]: { not: null } };
      return { [v.listField]: null };
    }

    if (v.kind === 'ratingAtLeast') {
      if (bool) return { [v.field]: { gte: 4 } };
      return null;
    }

    return null;
  }

  private buildFilterWhere(
    meta: ResourceMeta,
    filtersRaw?: string,
  ): Record<string, any>[] {
    const filters = this.parseFilters(filtersRaw);
    if (filters.length === 0) return [];

    const filterMap = new Map<string, FilterMeta>();
    for (const f of meta.filters ?? []) filterMap.set(f.field, f);

    const fieldMap = new Map(meta.fields.map((f) => [f.name, f]));

    const whereParts: Record<string, any>[] = [];

    for (const filter of filters) {
      const metaFilter = filterMap.get(filter.field);
      if (!metaFilter) continue;
      if (!metaFilter.operators.includes(filter.op)) continue;

      // ✅ Virtual filter
      if (metaFilter.virtual) {
        const b = this.parseBool(filter.value);
        if (b === undefined) continue;
        const vWhere = this.buildVirtualWhere(metaFilter.virtual, b);
        if (vWhere) whereParts.push(vWhere);
        continue;
      }

      if (filter.op === 'isNull') {
        whereParts.push({ [filter.field]: null });
        continue;
      }
      if (filter.op === 'notNull') {
        whereParts.push({ [filter.field]: { not: null } });
        continue;
      }

      const fieldMeta = fieldMap.get(filter.field);
      const fieldType = fieldMeta?.type;

      if (filter.op === 'in' || filter.op === 'notIn') {
        const rawArr = Array.isArray(filter.value)
          ? filter.value
          : typeof filter.value === 'string'
            ? filter.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            : [];

        if (rawArr.length === 0) continue;

        const values = rawArr
          .map((v) => this.coerceValue(metaFilter.input, v, fieldType))
          .filter((v) => v !== undefined);

        if (values.length === 0) continue;

        whereParts.push({
          [filter.field]: { [filter.op === 'in' ? 'in' : 'notIn']: values },
        });
        continue;
      }

      const coerced = this.coerceValue(
        metaFilter.input,
        filter.value,
        fieldType,
      );
      if (coerced === undefined) continue;

      if (
        filter.op === 'contains' ||
        filter.op === 'startsWith' ||
        filter.op === 'endsWith'
      ) {
        whereParts.push({
          [filter.field]: { [filter.op]: String(coerced), mode: 'insensitive' },
        });
        continue;
      }

      if (
        filter.op === 'gt' ||
        filter.op === 'gte' ||
        filter.op === 'lt' ||
        filter.op === 'lte'
      ) {
        whereParts.push({ [filter.field]: { [filter.op]: coerced } });
        continue;
      }

      if (filter.op === 'equals') {
        whereParts.push({ [filter.field]: coerced });
      }
    }

    return whereParts;
  }

  private buildWhere(
    meta: ResourceMeta,
    query: AdminListQuery,
  ): Record<string, any> {
    const whereParts: Record<string, any>[] = [];

    const qWhere = this.buildSearchWhere(meta, query.q);
    if (Object.keys(qWhere).length > 0) whereParts.push(qWhere);

    const filtersWhere = this.buildFilterWhere(meta, query.filters);
    if (filtersWhere.length > 0) whereParts.push(...filtersWhere);

    if (whereParts.length === 0) return {};
    if (whereParts.length === 1) return whereParts[0];
    return { AND: whereParts };
  }

  private buildOrderBy(meta: ResourceMeta): Record<string, any> {
    const createdAtField = meta.fields.find(
      (f) => f.name === 'creadoEn' && f.kind === 'scalar',
    );
    if (createdAtField) return { [createdAtField.name]: 'desc' };

    const idField = meta.fields.find((f) => f.isId);
    if (idField) return { [idField.name]: 'desc' };

    return { id: 'desc' };
  }

  private buildListInclude(meta: ResourceMeta): any {
    const countFields = meta.fields.filter((f) => f.isParentChildCount);
    const include: any = {};

    if (countFields.length > 0) {
      include._count = {
        select: Object.fromEntries(countFields.map((f) => [f.name, true])),
      };
    }

    // Include específico para Roles de Usuario para mostrar nombres en la lista
    if (meta.name === 'Usuario') {
      include.roles = {
        include: {
          role: true,
        },
      };
    }

    if (meta.name === 'Inscripcion') {
      include.usuario = { select: { id: true, nombre: true, email: true } };
      include.curso = { select: { id: true, titulo: true, slug: true } };
    }

    if (meta.name === 'Modulo') {
      include.curso = { select: { titulo: true } };
    }

    if (meta.name === 'Producto') {
      include.marca = { select: { nombre: true } };
      include.categoria = { select: { nombre: true } };
    }

    return include;
  }

  private sanitizeData(meta: ResourceMeta, input: any): Record<string, any> {
    if (!input || typeof input !== 'object') return {};

    const allowedFields = meta.fields.filter((f) => {
      if (!f.showInForm) return false;
      if (f.isParentChildCount) return false;
      if (f.isId) return false;
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
    const userId = 1;

    try {
      await this.prisma.auditLog.create({
        data: {
          tableName: meta.tableName,
          recordId: String(recordId),
          action,
          oldData: oldData ?? null,
          newData: newData ?? null,
          userId,
          userAgent: null,
          ipAddress: null,
          endpoint: `/admin/resources/${meta.tableName}`,
        },
      });
    } catch (err) {
      console.error('Error escribiendo en AuditLog:', err);
    }
  }

  // ─────────────────────── CRUD ───────────────────────

  async list(
    resource: string,
    query: AdminListQuery,
  ): Promise<AdminListResponse> {
    const meta = await this.getResourceMeta(resource);
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
      pagination: { page, pageSize, totalItems, totalPages },
    };
  }

  async findOne(resource: string, id: string) {
    const meta = await this.getResourceMeta(resource);
    const client = this.getPrismaClient(meta);

    const idField = meta.fields.find((f) => f.isId);
    if (!idField)
      throw new BadRequestException(
        `Recurso '${meta.name}' no tiene campo id en meta`,
      );

    let parsedId: any = id;
    if (idField.type === 'Int') {
      parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId))
        throw new BadRequestException(`Id inválido para recurso '${resource}'`);
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

    if (normalized !== 'orden' || !record || !Array.isArray(record.items))
      return record;

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
    const meta = await this.getResourceMeta(resource);
    if (meta.name === 'Inscripcion') {
      throw new BadRequestException('Las inscripciones son de solo lectura.');
    }
    const client = this.getPrismaClient(meta);

    const data = this.sanitizeData(meta, body);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        `No hay campos válidos para crear en recurso '${resource}'`,
      );
    }

    const created = await client.create({ data });

    const idField = meta.fields.find((f) => f.isId);
    const recordId =
      (idField ? created[idField.name] : created.id) ?? created.slug ?? '';

    await this.logAudit(meta, 'create', recordId, null, created);
    return created;
  }

  async update(resource: string, id: string, body: any) {
    const meta = await this.getResourceMeta(resource);
    if (meta.name === 'Inscripcion') {
      throw new BadRequestException('Las inscripciones son de solo lectura.');
    }
    const client = this.getPrismaClient(meta);

    const idField = meta.fields.find((f) => f.isId);
    if (!idField)
      throw new BadRequestException(
        `Recurso '${meta.name}' no tiene campo id en meta`,
      );

    let parsedId: any = id;
    if (idField.type === 'Int') {
      parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId))
        throw new BadRequestException(`Id inválido para recurso '${resource}'`);
    }

    const data = this.sanitizeData(meta, body);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        `No hay campos válidos para actualizar en recurso '${resource}'`,
      );
    }

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
    const meta = await this.getResourceMeta(resource);
    if (meta.name === 'Inscripcion') {
      throw new BadRequestException('Las inscripciones son de solo lectura.');
    }
    const client = this.getPrismaClient(meta);

    const idField = meta.fields.find((f) => f.isId);
    if (!idField)
      throw new BadRequestException(
        `Recurso '${meta.name}' no tiene campo id en meta`,
      );

    let parsedId: any = id;
    if (idField.type === 'Int') {
      parsedId = parseInt(id, 10);
      if (Number.isNaN(parsedId))
        throw new BadRequestException(`Id inválido para recurso '${resource}'`);
    }

    const deleted = await client.delete({
      where: { [idField.name]: parsedId },
    });
    await this.logAudit(meta, 'delete', parsedId, deleted, null);

    return deleted;
  }
}
