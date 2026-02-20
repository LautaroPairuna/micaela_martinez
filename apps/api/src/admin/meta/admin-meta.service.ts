// apps/api/src/admin/meta/admin-meta.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ResourceMeta,
  FieldMeta,
  FieldKind,
  FileKind,
  FilterMeta,
  FilterOperator,
  FilterGroup,
  VirtualFilter,
} from './admin-meta.types';
import { RESOURCE_DEFINITIONS, RESOURCE_LABELS } from './resource-definitions';

import { Prisma } from '@prisma/client';

const SYSTEM_DATE_FIELDS = [
  'creadoEn',
  'createdAt',
  'actualizadoEn',
  'updatedAt',
  'emailVerificadoEn',
  'emailVerifiedAt',
];

const LONG_TEXT_FIELDS = [
  'descripcionMD',
  'descripcion',
  'resumen',
  'requisitos',
  'comentario',
];

const READONLY_FORM_FIELDS = ['ratingProm', 'ratingConteo'];

const IMAGE_FIELD_HINTS = [
  'imagen',
  'image',
  'photo',
  'foto',
  'portada',
  'thumbnail',
  'avatar',
  'archivo',
  'preview',
];

const STRING_FILTER_OPS: FilterOperator[] = [
  'contains',
  'equals',
  'startsWith',
  'endsWith',
];
const NUMBER_FILTER_OPS: FilterOperator[] = [
  'equals',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
];
const DATE_FILTER_OPS: FilterOperator[] = ['equals', 'gt', 'gte', 'lt', 'lte'];
const BOOLEAN_FILTER_OPS: FilterOperator[] = ['equals'];
const ENUM_FILTER_OPS: FilterOperator[] = ['equals', 'in'];
const RELATION_FILTER_OPS: FilterOperator[] = ['equals', 'in'];

type AdminMetaIndex = {
  resources: ResourceMeta[];
  byName: Map<string, ResourceMeta>;
  byTable: Map<string, ResourceMeta>;
};

type ParsedSchema = {
  models: Record<string, ParsedModel>;
  enums: Record<string, string[]>;
};

type ParsedModel = {
  name: string;
  tableName?: string;
  fields: Record<string, ParsedField>;
  compositeIdFields: Set<string>;
};

type ParsedField = {
  name: string;
  type: string;
  isList: boolean;
  isRequired: boolean;
  isId: boolean;
};

function humanizeName(name: unknown): string {
  const safe = typeof name === 'string' ? name : '';
  const withSpaces = safe.replace(/([a-z])([A-Z])/g, '$1 $2');
  return withSpaces
    ? withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
    : 'Resource';
}

function isImageField(field: any): boolean {
  if (field?.type !== 'String') return false;
  const lname = String(field?.name ?? '').toLowerCase();
  return IMAGE_FIELD_HINTS.some((frag) => lname.includes(frag));
}

function detectFileField(
  model: any,
  field: any,
): { isFile: boolean; fileKind?: FileKind } {
  if (
    (model?.name === 'Leccion' &&
      field?.name === 'rutaSrc' &&
      field?.type === 'String') ||
    (model?.name === 'Curso' &&
      field?.name === 'videoPreview' &&
      field?.type === 'String')
  ) {
    return { isFile: true, fileKind: 'video' };
  }
  return { isFile: false };
}

function parseInlineSchema(schema: string): ParsedSchema {
  const models: Record<string, ParsedModel> = {};
  const enums: Record<string, string[]> = {};

  let currentBlock: 'model' | 'enum' | null = null;
  let currentName = '';
  let inBlockComment = false;

  const lines = schema.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    if (line.startsWith('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (line.endsWith('*/')) inBlockComment = false;
      continue;
    }

    if (line.startsWith('//')) continue;

    if (line.startsWith('model ')) {
      currentBlock = 'model';
      currentName = line.replace('model', '').trim().replace('{', '').trim();
      models[currentName] = {
        name: currentName,
        fields: {},
        compositeIdFields: new Set<string>(),
      };
      continue;
    }

    if (line.startsWith('enum ')) {
      currentBlock = 'enum';
      currentName = line.replace('enum', '').trim().replace('{', '').trim();
      enums[currentName] = [];
      continue;
    }

    if (line === '}') {
      currentBlock = null;
      currentName = '';
      continue;
    }

    if (currentBlock === 'enum' && enums[currentName]) {
      const value = line.split(/\s+/)[0];
      if (value && value !== '}') enums[currentName].push(value);
      continue;
    }

    if (currentBlock === 'model' && models[currentName]) {
      if (line.startsWith('@@map')) {
        const match = line.match(/@@map\("([^"]+)"\)/);
        if (match?.[1]) models[currentName].tableName = match[1];
        continue;
      }

      if (line.startsWith('@@id')) {
        const match = line.match(/@@id\s*\(\s*\[([^\]]+)]/);
        if (match?.[1]) {
          const fields = match[1]
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean);
          for (const f of fields) models[currentName].compositeIdFields.add(f);
        }
        continue;
      }

      if (line.startsWith('@@')) continue;

      const [fieldName, typeToken] = line.split(/\s+/);
      if (!fieldName || !typeToken) continue;

      const isList = typeToken.endsWith('[]');
      const isOptional = typeToken.endsWith('?');

      let baseType = typeToken;
      if (isList) baseType = baseType.slice(0, -2);
      if (isOptional) baseType = baseType.slice(0, -1);

      const isId = line.includes('@id');

      models[currentName].fields[fieldName] = {
        name: fieldName,
        type: baseType,
        isList,
        isRequired: !isOptional,
        isId,
      };
    }
  }

  for (const model of Object.values(models)) {
    for (const fieldName of model.compositeIdFields) {
      if (model.fields[fieldName]) model.fields[fieldName].isId = true;
    }
  }

  return { models, enums };
}

function lowerFirst(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * ✅ Hints UX para filtros (agrupación + orden + ocultar por defecto)
 */
function guessFilterHints(
  fieldName: string,
  field: FieldMeta,
): {
  group: FilterGroup;
  priority: number;
  hiddenByDefault?: boolean;
} {
  const n = fieldName.toLowerCase();

  // QUICK: cosas típicas de ecommerce / status
  if (
    ['publicado', 'destacado', 'activa', 'predeterminada', 'leida'].includes(n)
  ) {
    return { group: 'quick', priority: 100 };
  }
  if (n === 'estado') return { group: 'quick', priority: 95 };

  // Relaciones
  if (field.isForeignKey) return { group: 'relations', priority: 80 };

  // Fechas
  if (field.type === 'DateTime') return { group: 'dates', priority: 70 };

  // Enums
  if (field.isEnum) return { group: 'status', priority: 85 };

  // Booleanos
  if (field.type === 'Boolean') return { group: 'status', priority: 75 };

  // Métricas
  if (
    ['precio', 'stock', 'total', 'ratingprom', 'ratingconteo', 'monto'].some(
      (k) => n.includes(k),
    )
  ) {
    return { group: 'metrics', priority: 60 };
  }

  // Strings: normalmente no queremos mostrarlos porque ya existe q
  if (field.type === 'String') {
    return { group: 'technical', priority: 10, hiddenByDefault: true };
  }

  // ids y cosas técnicas
  if (
    n === 'id' ||
    n.endsWith('id') ||
    n.includes('slug') ||
    n.includes('orden')
  ) {
    return { group: 'technical', priority: 5, hiddenByDefault: true };
  }

  return { group: 'technical', priority: 1, hiddenByDefault: true };
}

/**
 * ✅ Definir campos ideales para q (búsqueda global)
 * - evitamos imágenes/archivos y textos largos
 * - priorizamos titulo/nombre/email/slug/resumen
 */
function buildSearchFields(fields: FieldMeta[]): string[] {
  const prefer = (name: string) =>
    ['titulo', 'nombre', 'email', 'slug', 'resumen', 'referencia'].some((k) =>
      name.toLowerCase().includes(k),
    );

  const blocked = (name: string) => {
    const ln = name.toLowerCase();
    if (ln === 'passwordhash') return true;
    if (LONG_TEXT_FIELDS.map((x) => x.toLowerCase()).includes(ln)) return true;
    if (IMAGE_FIELD_HINTS.some((h) => ln.includes(h))) return true;
    return false;
  };

  const stringFields = fields.filter(
    (f) => f.kind === 'scalar' && f.type === 'String' && !f.isList && !f.isEnum,
  );

  const preferred = stringFields
    .map((f) => f.name)
    .filter((n) => prefer(n) && !blocked(n));
  if (preferred.length > 0) return preferred;

  // fallback más amplio pero aún evitando bloqueados
  return stringFields.map((f) => f.name).filter((n) => !blocked(n));
}

function buildFiltersFromFields(
  fields: FieldMeta[],
  resourceName: string,
): FilterMeta[] {
  const filters: FilterMeta[] = [];

  for (const field of fields) {
    if (field.kind !== 'scalar' || field.isList) continue;

    const label = humanizeName(field.name);
    const hints = guessFilterHints(field.name, field);

    if (field.isEnum) {
      filters.push({
        field: field.name,
        label,
        input: 'enum',
        operators: ENUM_FILTER_OPS,
        enumValues: field.enumValues ?? [],
        group: hints.group,
        priority: hints.priority,
        hiddenByDefault: hints.hiddenByDefault,
      });
      continue;
    }

    if (field.isForeignKey && field.fkResource) {
      filters.push({
        field: field.name,
        label,
        input: 'relation',
        operators: RELATION_FILTER_OPS,
        relationModel: field.fkResource,
        group: hints.group,
        priority: hints.priority,
        hiddenByDefault: hints.hiddenByDefault,
      });
      continue;
    }

    if (field.type === 'String') {
      filters.push({
        field: field.name,
        label,
        input: 'string',
        operators: STRING_FILTER_OPS,
        group: hints.group,
        priority: hints.priority,
        hiddenByDefault: hints.hiddenByDefault,
      });
      continue;
    }

    if (['Int', 'Float', 'Decimal'].includes(field.type)) {
      filters.push({
        field: field.name,
        label,
        input: 'number',
        operators: NUMBER_FILTER_OPS,
        group: hints.group,
        priority: hints.priority,
        hiddenByDefault: hints.hiddenByDefault,
      });
      continue;
    }

    if (field.type === 'Boolean') {
      filters.push({
        field: field.name,
        label,
        input: 'boolean',
        operators: BOOLEAN_FILTER_OPS,
        group: hints.group,
        priority: hints.priority,
        hiddenByDefault: hints.hiddenByDefault,
      });
      continue;
    }

    if (field.type === 'DateTime') {
      filters.push({
        field: field.name,
        label,
        input: 'date',
        operators: DATE_FILTER_OPS,
        group: hints.group,
        priority: hints.priority,
        hiddenByDefault: hints.hiddenByDefault,
      });
      continue;
    }
  }

  // ✅ Virtual filters por recurso (ecommerce “real”)
  const virtuals: FilterMeta[] = [];

  if (resourceName === 'Producto') {
    // Tiene imagen: imagen != null
    virtuals.push({
      field: '__hasImage',
      label: 'Tiene imagen',
      input: 'boolean',
      operators: ['equals'],
      group: 'quick',
      priority: 110,
      virtual: { kind: 'hasImage', field: 'imagen' } satisfies VirtualFilter,
    });

    // En stock: stock > 0
    virtuals.push({
      field: '__inStock',
      label: 'En stock',
      input: 'boolean',
      operators: ['equals'],
      group: 'quick',
      priority: 105,
      virtual: { kind: 'inStock', field: 'stock' } satisfies VirtualFilter,
    });

    // Sin stock: stock == 0
    virtuals.push({
      field: '__outOfStock',
      label: 'Sin stock',
      input: 'boolean',
      operators: ['equals'],
      group: 'quick',
      priority: 104,
      virtual: { kind: 'outOfStock', field: 'stock' } satisfies VirtualFilter,
    });

    // Con precio lista: precioLista not null
    virtuals.push({
      field: '__hasListPrice',
      label: 'Tiene precio lista',
      input: 'boolean',
      operators: ['equals'],
      group: 'quick',
      priority: 103,
      virtual: {
        kind: 'hasValue',
        field: 'precioLista',
      } satisfies VirtualFilter,
    });

    // Con descuento: precioLista not null AND precio < precioLista
    virtuals.push({
      field: '__discounted',
      label: 'Con descuento',
      input: 'boolean',
      operators: ['equals'],
      group: 'quick',
      priority: 102,
      virtual: {
        kind: 'discounted',
        priceField: 'precio',
        listField: 'precioLista',
      } satisfies VirtualFilter,
    });
  }

  if (resourceName === 'Curso') {
    virtuals.push({
      field: '__hasCover',
      label: 'Tiene portada',
      input: 'boolean',
      operators: ['equals'],
      group: 'quick',
      priority: 110,
      virtual: { kind: 'hasImage', field: 'portada' } satisfies VirtualFilter,
    });
  }

  // Orden final: virtuals arriba + resto por priority desc
  const merged = [...virtuals, ...filters];

  return merged.sort(
    (a, b) =>
      (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label),
  );
}

function inferFkResourceForField(models: any[], field: any): string | null {
  if (field?.kind !== 'scalar') return null;
  if (field?.type !== 'Int') return null;

  const n = String(field?.name ?? '');
  if (!n.toLowerCase().endsWith('id')) return null;

  const base = n.substring(0, n.length - 2);
  if (!base) return null;

  const candidate = base.charAt(0).toUpperCase() + base.slice(1);
  const match = models.find((m) => m?.name === candidate);
  return match ? candidate : null;
}

@Injectable()
export class AdminMetaService {
  private cache: AdminMetaIndex | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private readDmmfDatamodel(): { models: any[]; enums: any[] } {
    const client: any = this.prisma;

    const dmmf1 = client?._dmmf;
    if (dmmf1?.datamodel?.models?.length) {
      return {
        models: dmmf1.datamodel.models,
        enums: dmmf1.datamodel.enums ?? [],
      };
    }

    const dmmf2 = (Prisma as any)?.dmmf;
    if (dmmf2?.datamodel?.models?.length) {
      return {
        models: dmmf2.datamodel.models,
        enums: dmmf2.datamodel.enums ?? [],
      };
    }

    const runtime = client?._runtimeDataModel;
    const modelsArr: any[] = runtime?.models
      ? Object.entries(runtime.models).map(([name, m]: [string, any]) => ({
          name,
          dbName: m.dbName ?? null,
          fields: m.fields ?? [],
        }))
      : [];

    const enumsArr: any[] = runtime?.enums
      ? Object.values(runtime.enums).map((e: any) => ({
          name: e.name,
          values: (e.values ?? []).map((v: any) =>
            typeof v === 'string' ? { name: v } : v,
          ),
        }))
      : [];

    if (modelsArr.length) {
      const enums = enumsArr.map((e) => ({
        name: e.name,
        values: e.values.map((v: any) => v.name),
      }));
      return { models: modelsArr, enums };
    }

    throw new Error(
      'No pude leer _dmmf.datamodel.models del PrismaClient (o vino vacío). Revisá tu PrismaClient/PrismaService.',
    );
  }

  private buildIndex(): AdminMetaIndex {
    const client: any = this.prisma;
    const inlineSchema = client?._engineConfig?.inlineSchema;
    if (inlineSchema) {
      const schema = parseInlineSchema(String(inlineSchema));
      return this.buildIndexFromSchema(schema);
    }

    const { models, enums } = this.readDmmfDatamodel();

    const enumMap: Record<string, string[]> = {};
    for (const e of enums ?? []) {
      const values = Array.isArray(e?.values) ? e.values : [];
      enumMap[e.name] = values
        .map((v: any) => (typeof v === 'string' ? v : v?.name))
        .filter(Boolean);
    }

    const resources: ResourceMeta[] = [];

    for (const model of models) {
      const fields: FieldMeta[] = [];

      const tableName = model?.dbName
        ? String(model.dbName)
        : String(model?.name ?? '').toLowerCase();

      for (const field of model.fields ?? []) {
        const rawKind = field?.kind;
        const kind: FieldKind = rawKind === 'object' ? 'relation' : 'scalar';

        const isEnum = rawKind === 'enum' || !!enumMap[field.type];
        const enumValues = isEnum ? (enumMap[field.type] ?? []) : undefined;

        const isImage = isImageField(field);
        const { isFile, fileKind } = detectFileField(model, field);

        const fkResource = inferFkResourceForField(models, field);
        const isForeignKey = !!fkResource;

        const isParentChildCount =
          kind === 'relation' && field?.isList === true;

        let showInList = false;
        let showInForm = false;

        if (kind === 'scalar') {
          if (field?.isId) {
            showInList = true;
            showInForm = false;
          } else {
            if (
              ['String', 'Int', 'Boolean', 'Decimal'].includes(field?.type) ||
              isEnum
            ) {
              showInList = true;
            }
            showInForm = true;
          }
        }

        const fname = String(field?.name ?? '');

        if (SYSTEM_DATE_FIELDS.includes(fname)) showInForm = false;
        if (READONLY_FORM_FIELDS.includes(fname)) showInForm = false;
        if (fname === 'passwordHash') showInForm = false;
        if (LONG_TEXT_FIELDS.includes(fname)) showInList = false;

        // ✅ Normalización y Tooltips
        const modelDef = RESOURCE_DEFINITIONS[String(model?.name ?? '')] || {};
        const fieldDef = modelDef[fname];

        const label = fieldDef?.label;
        const help = fieldDef?.help;
      const placeholder = fieldDef?.placeholder;
        const readOnly = fieldDef?.readOnly;// Sobreescribir visibilidad si está definida explícitamente
        if (fieldDef?.showInList !== undefined)
          showInList = fieldDef.showInList;
        if (fieldDef?.showInForm !== undefined)
          showInForm = fieldDef.showInForm;

        fields.push({
          name: fname,
          label,
          help,
          placeholder,
          type: String(field?.type ?? ''),
          kind,
          isId: !!field?.isId,
          isRequired: !!field?.isRequired,
          isList: !!field?.isList,
          isEnum,

          relationModel:
            kind === 'relation' ? String(field?.type ?? '') : undefined,

          enumName: isEnum ? String(field?.type ?? '') : undefined,
          enumValues,

          isImage,
          isFile,
          fileKind,

          widget: fieldDef?.widget,
          readOnly,

          isParentChildCount,
          isForeignKey,
          fkResource: fkResource ?? undefined,

          showInList,
          showInForm,
        });
      }

      const resourceName = String(model?.name ?? '');
      const searchFields = buildSearchFields(fields);

      resources.push({
        name: resourceName,
        tableName,
        displayName: RESOURCE_LABELS[resourceName] || humanizeName(resourceName),
        fields,
        searchFields,
        filters: buildFiltersFromFields(fields, resourceName),
      });
    }

    const byName = new Map<string, ResourceMeta>();
    const byTable = new Map<string, ResourceMeta>();
    for (const r of resources) {
      byName.set(r.name.toLowerCase(), r);
      byTable.set(r.tableName.toLowerCase(), r);
    }

    return { resources, byName, byTable };
  }

  private buildIndexFromSchema(schema: ParsedSchema): AdminMetaIndex {
    const resources: ResourceMeta[] = [];
    const modelNames = new Set(Object.keys(schema.models));

    for (const model of Object.values(schema.models)) {
      const fields: FieldMeta[] = [];
      const tableName = model.tableName
        ? String(model.tableName)
        : model.name.toLowerCase();

      const fkMap = new Map<string, string>();
      for (const f of Object.values(model.fields)) {
        if (!modelNames.has(f.type) || f.isList) continue;
        const candidate1 = `${f.name}Id`;
        const candidate2 = `${lowerFirst(f.type)}Id`;
        if (model.fields[candidate1]) fkMap.set(candidate1, f.type);
        else if (model.fields[candidate2]) fkMap.set(candidate2, f.type);
      }

      for (const field of Object.values(model.fields)) {
        const isEnum = !!schema.enums[field.type];
        const enumValues = isEnum ? schema.enums[field.type] : undefined;

        const kind: FieldKind = modelNames.has(field.type)
          ? 'relation'
          : 'scalar';

        const isImage = isImageField(field);
        const { isFile, fileKind } = detectFileField(model, field);

        const fkResource = fkMap.get(field.name) ?? null;
        const isForeignKey = !!fkResource;

        const isParentChildCount = kind === 'relation' && field.isList === true;

        let showInList = false;
        let showInForm = false;

        if (kind === 'scalar') {
          if (field.isId) {
            showInList = true;
            showInForm = false;
          } else {
            if (
              ['String', 'Int', 'Boolean', 'Decimal'].includes(field.type) ||
              isEnum
            ) {
              showInList = true;
            }
            showInForm = true;
          }
        }

        const fname = String(field.name ?? '');

        if (SYSTEM_DATE_FIELDS.includes(fname)) showInForm = false;
        if (READONLY_FORM_FIELDS.includes(fname)) showInForm = false;
        if (fname === 'passwordHash') showInForm = false;
        if (LONG_TEXT_FIELDS.includes(fname)) showInList = false;

        // ✅ Normalización y Tooltips
        const modelDef = RESOURCE_DEFINITIONS[model.name] || {};
        const fieldDef = modelDef[fname];

        const label = fieldDef?.label;
        const help = fieldDef?.help;
        const placeholder = fieldDef?.placeholder;
        const readOnly = fieldDef?.readOnly;

        // Sobreescribir visibilidad si está definida explícitamente
        if (fieldDef?.showInList !== undefined)
          showInList = fieldDef.showInList;
        if (fieldDef?.showInForm !== undefined)
          showInForm = fieldDef.showInForm;

        fields.push({
          name: fname,
          label,
          help,
          placeholder,
          type: String(field.type ?? ''),
          kind,
          isId: !!field.isId,
          isRequired: !!field.isRequired,
          isList: !!field.isList,
          isEnum,
          relationModel:
            kind === 'relation' ? String(field.type ?? '') : undefined,
          enumName: isEnum ? String(field.type ?? '') : undefined,
          enumValues,
          isImage,
          isFile,
          fileKind,

          widget: fieldDef?.widget,
          readOnly,

          isParentChildCount,
          isForeignKey,
          fkResource: fkResource ?? undefined,
          showInList,
          showInForm,
        });
      }

      const searchFields = buildSearchFields(fields);

      resources.push({
        name: model.name,
        tableName,
        displayName: RESOURCE_LABELS[model.name] || humanizeName(model.name),
        fields,
        searchFields,
        filters: buildFiltersFromFields(fields, model.name),
      });
    }

    const byName = new Map<string, ResourceMeta>();
    const byTable = new Map<string, ResourceMeta>();
    for (const r of resources) {
      byName.set(r.name.toLowerCase(), r);
      byTable.set(r.tableName.toLowerCase(), r);
    }

    return { resources, byName, byTable };
  }

  private get index(): AdminMetaIndex {
    if (!this.cache) this.cache = this.buildIndex();
    return this.cache;
  }

  getAllResources(): ResourceMeta[] {
    return this.index.resources;
  }

  getResourceMeta(resource: string): ResourceMeta {
    const key = String(resource ?? '').toLowerCase();
    const found = this.index.byTable.get(key) ?? this.index.byName.get(key);
    if (!found)
      throw new BadRequestException(`Recurso '${resource}' no encontrado`);
    return found;
  }

  /** ✅ helper que tu AdminUploadController usa */
  getFieldMeta(resource: string, field: string): FieldMeta {
    const meta = this.getResourceMeta(resource);
    const f = meta.fields.find((x) => x.name === field);
    if (!f)
      throw new BadRequestException(
        `Campo '${field}' no encontrado en recurso '${resource}'`,
      );
    return f;
  }

  invalidateCache() {
    this.cache = null;
  }
}
