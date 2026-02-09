// apps/api/src/admin/meta/admin-meta.utils.ts
import type {
  FieldMeta,
  FieldKind,
  ResourceMeta,
  FileKind,
  FilterMeta,
  FilterOperator,
} from './admin-meta.types';

type DmmfLike = {
  datamodel: {
    models: any[];
    enums: any[];
  };
};

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

function humanizeName(name: string): string {
  const withSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function inferTableName(model: any): string {
  if (model.dbName) return model.dbName;
  return String(model.name ?? '').toLowerCase();
}

function isImageField(field: any): boolean {
  if (field.type !== 'String') return false;
  const lname = String(field.name ?? '').toLowerCase();
  return IMAGE_FIELD_HINTS.some((frag) => lname.includes(frag));
}

function detectFileField(
  model: any,
  field: any,
): { isFile: boolean; fileKind?: FileKind } {
  if (
    model.name === 'Leccion' &&
    field.name === 'rutaSrc' &&
    field.type === 'String'
  ) {
    return { isFile: true, fileKind: 'video' };
  }
  return { isFile: false, fileKind: undefined };
}

function inferFkResourceForField(
  models: any[],
  field: any,
  ownerModelName: string,
  fkIndex: Record<string, string>,
): string | null {
  const key = `${ownerModelName}.${field.name}`;
  if (fkIndex[key]) return fkIndex[key];

  if (field.kind !== 'scalar') return null;
  if (field.type !== 'Int') return null;
  if (
    !String(field.name ?? '')
      .toLowerCase()
      .endsWith('id')
  )
    return null;

  const base = field.name.substring(0, field.name.length - 2);
  const candidate =
    base.length > 0 ? base.charAt(0).toUpperCase() + base.slice(1) : base;
  const match = models.find((m) => m.name === candidate);
  return match ? candidate : null;
}

import { RESOURCE_DEFINITIONS } from './resource-definitions';

function buildFiltersFromFields(fields: FieldMeta[]): FilterMeta[] {
  const filters: FilterMeta[] = [];

  for (const field of fields) {
    if (field.kind !== 'scalar' || field.isList) continue;

    const label = field.label ?? humanizeName(field.name);

    if (field.isEnum) {
      filters.push({
        field: field.name,
        label,
        input: 'enum',
        operators: ENUM_FILTER_OPS,
        enumValues: field.enumValues ?? [],
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
      });
      continue;
    }

    if (field.type === 'String') {
      filters.push({
        field: field.name,
        label,
        input: 'string',
        operators: STRING_FILTER_OPS,
      });
      continue;
    }

    if (['Int', 'Float', 'Decimal'].includes(field.type)) {
      filters.push({
        field: field.name,
        label,
        input: 'number',
        operators: NUMBER_FILTER_OPS,
      });
      continue;
    }

    if (field.type === 'Boolean') {
      filters.push({
        field: field.name,
        label,
        input: 'boolean',
        operators: BOOLEAN_FILTER_OPS,
      });
      continue;
    }

    if (field.type === 'DateTime') {
      filters.push({
        field: field.name,
        label,
        input: 'date',
        operators: DATE_FILTER_OPS,
      });
    }
  }

  return filters;
}

export function buildAdminMetaFromDmmf(dmmf: DmmfLike): ResourceMeta[] {
  const models: any[] = dmmf.datamodel.models ?? [];
  const enums: any[] = dmmf.datamodel.enums ?? [];

  const enumMap: Record<string, string[]> = enums.reduce(
    (acc, e) => {
      acc[e.name] = (e.values ?? []).map((v: any) => v.name);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // Índice FK por relaciones Prisma
  const fkIndex: Record<string, string> = {};
  for (const m of models) {
    for (const f of (m.fields ?? []) as any[]) {
      if (
        f.kind === 'object' &&
        Array.isArray(f.relationFromFields) &&
        f.relationFromFields.length > 0
      ) {
        const targetModel = f.type;
        for (const fromField of f.relationFromFields) {
          fkIndex[`${m.name}.${fromField}`] = targetModel;
        }
      }
    }
  }

  const resources: ResourceMeta[] = [];

  for (const model of models) {
    const fields: FieldMeta[] = [];

    for (const field of (model.fields ?? []) as any[]) {
      const isEnum = field.kind === 'enum' || !!enumMap[field.type];
      const enumValues = isEnum ? (enumMap[field.type] ?? []) : undefined;

      const kind: FieldKind = field.kind === 'object' ? 'relation' : 'scalar';

      const isImage = isImageField(field);
      const { isFile, fileKind } = detectFileField(model, field);

      const fkResource = inferFkResourceForField(
        models,
        field,
        model.name,
        fkIndex,
      );
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

      if (SYSTEM_DATE_FIELDS.includes(field.name)) showInForm = false;
      if (READONLY_FORM_FIELDS.includes(field.name)) showInForm = false;
      if (field.name === 'passwordHash') showInForm = false;
      if (LONG_TEXT_FIELDS.includes(field.name)) showInList = false;

      // ─────────────────────────────────────────────────────────────
      // ✅ Normalización y Tooltips
      // ─────────────────────────────────────────────────────────────
      const modelDef = RESOURCE_DEFINITIONS[model.name] || {};
      const fieldDef = modelDef[field.name];

      const label = fieldDef?.label;
      const help = fieldDef?.help;
      const placeholder = fieldDef?.placeholder;

      // Sobreescribir visibilidad si está definida explícitamente
      if (fieldDef?.showInList !== undefined) showInList = fieldDef.showInList;
      if (fieldDef?.showInForm !== undefined) showInForm = fieldDef.showInForm;

      fields.push({
        name: field.name,
        type: field.type,
        kind,
        isId: field.isId,
        isRequired: field.isRequired,
        isList: field.isList,
        isEnum,
        relationModel: field.relationName ?? undefined,
        enumName: isEnum ? field.type : undefined,
        enumValues,
        isImage,
        isFile,
        fileKind,
        isParentChildCount,
        isForeignKey,
        fkResource: fkResource ?? undefined,
        showInList,
        showInForm,
        label,
        help,
        placeholder,
      });
    }

    resources.push({
      name: model.name,
      tableName: inferTableName(model),
      displayName: humanizeName(model.name),
      fields,
      filters: buildFiltersFromFields(fields),
    });
  }

  return resources;
}
