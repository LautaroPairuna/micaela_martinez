import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceMeta, FieldMeta } from '../meta/admin-meta.types';
import { buildAdminMeta } from '../meta/admin-meta.utils';

@Injectable()
export class AdminResourcesService {
  private readonly meta: ResourceMeta[];

  constructor(private readonly prisma: PrismaService) {
    this.meta = buildAdminMeta();
  }

  private getResourceMeta(resource: string): ResourceMeta {
    const match = this.meta.find(
      (m) =>
        m.tableName.toLowerCase() === resource.toLowerCase() ||
        m.name.toLowerCase() === resource.toLowerCase(),
    );

    if (!match) {
      throw new BadRequestException(`Recurso '${resource}' no encontrado`);
    }
    return match;
  }

  private getPrismaModelClient(meta: ResourceMeta): any {
    const clientKey =
      meta.tableName.charAt(0).toLowerCase() + meta.tableName.slice(1);
    const client = (this.prisma as any)[clientKey];
    if (!client) {
      throw new Error(`Prisma client para '${clientKey}' no encontrado`);
    }
    return client;
  }

  // ───────────────── helpers de mapeo/body ─────────────────

  private isReadOnlyField(field: FieldMeta): boolean {
    if (field.isId) return true;
    // nombres típicos que no tiene sentido editar desde el admin genérico
    if (
      ['creadoEn', 'createdAt', 'actualizadoEn', 'updatedAt'].includes(
        field.name,
      )
    )
      return true;
    return false;
  }

  private coerceValue(field: FieldMeta, value: any): any {
    if (value === null || value === undefined) return undefined;

    // FKs a Int
    if (field.isForeignKey || field.type === 'Int') {
      if (value === '') return undefined;
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new BadRequestException(
          `El campo '${field.name}' debe ser numérico`,
        );
      }
      return num;
    }

    if (field.type === 'Boolean') {
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      throw new BadRequestException(
        `El campo '${field.name}' debe ser booleano`,
      );
    }

    if (field.type === 'Decimal') {
      if (value === '') return undefined;
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new BadRequestException(
          `El campo '${field.name}' debe ser decimal`,
        );
      }
      // Prisma acepta number o string, usamos string para más precisión
      return num.toString();
    }

    if (field.type === 'DateTime') {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(
          `El campo '${field.name}' debe ser una fecha válida`,
        );
      }
      return d;
    }

    // JSON (se puede mandar ya como objeto o como stringified)
    if (field.type === 'Json') {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          throw new BadRequestException(
            `El campo '${field.name}' debe ser JSON válido`,
          );
        }
      }
      return value;
    }

    // Enums: dejamos el valor tal cual, se valida en nivel Prisma
    if (field.isEnum) {
      return value;
    }

    // String / otros scalars
    return value;
  }

  private buildDataFromBody(
    resourceMeta: ResourceMeta,
    body: Record<string, any>,
    mode: 'create' | 'update',
  ) {
    const data: Record<string, any> = {};
    const formFields = resourceMeta.fields.filter(
      (f) => f.showInForm && f.kind === 'scalar' && !this.isReadOnlyField(f),
    );

    // Para create, validamos requeridos
    if (mode === 'create') {
      const missingRequired = formFields.filter((f) => {
        // algunos required los maneja la DB (por default)
        if (
          ['creadoEn', 'createdAt', 'actualizadoEn', 'updatedAt'].includes(
            f.name,
          )
        )
          return false;
        if (!f.isRequired) return false;

        const val = body[f.name];
        return val === undefined || val === null || val === '';
      });

      if (missingRequired.length) {
        const names = missingRequired.map((f) => f.name).join(', ');
        throw new BadRequestException(`Faltan campos requeridos: ${names}`);
      }
    }

    for (const field of formFields) {
      const raw = body[field.name];
      if (raw === undefined) {
        // en update, no tocar campos que no vengan; en create, dejamos que la DB aplique defaults
        continue;
      }
      const coerced = this.coerceValue(field, raw);
      if (coerced === undefined) continue;
      data[field.name] = coerced;
    }

    return data;
  }

  // ───────────────── list / findOne ─────────────────

  async list(resource: string) {
    const resMeta = this.getResourceMeta(resource);
    const client = this.getPrismaModelClient(resMeta);

    const childRelations = resMeta.fields
      .filter((f) => f.isParentChildCount && f.kind === 'relation' && f.isList)
      .map((f) => f.name);

    const query: any = {
      orderBy: { id: 'desc' },
    };

    if (childRelations.length) {
      query.include = {
        _count: {
          select: childRelations.reduce(
            (acc, name) => {
              acc[name] = true;
              return acc;
            },
            {} as Record<string, boolean>,
          ),
        },
      };
    }

    const items = await client.findMany(query);

    return {
      meta: resMeta,
      items,
    };
  }

  async findOne(resource: string, id: number) {
    const resMeta = this.getResourceMeta(resource);
    const client = this.getPrismaModelClient(resMeta);

    const item = await client.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(
        `Registro con id=${id} no encontrado en '${resource}'`,
      );
    }

    return {
      meta: resMeta,
      item,
    };
  }

  // ───────────────── create / update / delete ─────────────────

  async create(resource: string, body: Record<string, any>) {
    const resMeta = this.getResourceMeta(resource);
    const client = this.getPrismaModelClient(resMeta);

    const data = this.buildDataFromBody(resMeta, body, 'create');

    const item = await client.create({ data });

    return {
      meta: resMeta,
      item,
    };
  }

  async update(resource: string, id: number, body: Record<string, any>) {
    const resMeta = this.getResourceMeta(resource);
    const client = this.getPrismaModelClient(resMeta);

    // Nos aseguramos de que exista
    const existing = await client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        `Registro con id=${id} no encontrado en '${resource}'`,
      );
    }

    const data = this.buildDataFromBody(resMeta, body, 'update');

    const item = await client.update({
      where: { id },
      data,
    });

    return {
      meta: resMeta,
      item,
    };
  }

  async remove(resource: string, id: number) {
    const resMeta = this.getResourceMeta(resource);
    const client = this.getPrismaModelClient(resMeta);

    // si querés soft-delete para algún modelo, acá se puede hacer switch
    const item = await client.delete({
      where: { id },
    });

    return {
      meta: resMeta,
      item,
    };
  }
}
