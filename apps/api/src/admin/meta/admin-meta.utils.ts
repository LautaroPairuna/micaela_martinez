// src/admin/meta/admin-meta.utils.ts

import { Prisma } from '../../../src/generated/prisma/client';
import type {
  FieldMeta,
  FieldKind,
  ResourceMeta,
  FileKind,
} from './admin-meta.types';

// Accedemos al DMMF
const dmmf: any = (Prisma as any).dmmf;

// Campos de fechas de sistema que no queremos editar
const SYSTEM_DATE_FIELDS = [
  'creadoEn',
  'createdAt',
  'actualizadoEn',
  'updatedAt',
  'emailVerificadoEn',
  'emailVerifiedAt',
];

// Campos de texto largos que NO queremos en columnas de tabla
const LONG_TEXT_FIELDS = [
  'descripcionMD',
  'descripcion',
  'resumen',
  'requisitos',
  'comentario',
];

// Campos derivados / internos que no queremos editar a mano
const READONLY_FORM_FIELDS = ['ratingProm', 'ratingConteo'];

// Fragments para detectar imágenes
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

// Helper para nombre legible
function humanizeName(name: string): string {
  const withSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

// Nombre de tabla (usa @@map si existe)
function inferTableName(model: any): string {
  if (model.dbName) return model.dbName;
  return model.name.toLowerCase();
}

// ¿Es un campo imagen?
function isImageField(field: any): boolean {
  if (field.type !== 'String') return false;
  const lname = field.name.toLowerCase();
  return IMAGE_FIELD_HINTS.some((frag) => lname.includes(frag));
}

// Detectar campos de archivo (por ahora solo Leccion.rutaSrc)
function detectFileField(
  model: any,
  field: any,
): { isFile: boolean; fileKind?: FileKind } {
  if (
    model.name === 'Leccion' &&
    field.name === 'rutaSrc' &&
    field.type === 'String'
  ) {
    return { isFile: true, fileKind: 'generic' };
  }
  return { isFile: false, fileKind: undefined };
}

// Inferir recurso de FK: usando índice de relaciones + heurística por nombre
function inferFkResourceForField(
  models: any[],
  field: any,
  ownerModelName: string,
  fkIndex: Record<string, string>,
): string | null {
  // 1) Relación explícita del DMMF
  const key = `${ownerModelName}.${field.name}`;
  if (fkIndex[key]) {
    return fkIndex[key]; // p.ej. 'Usuario'
  }

  // 2) Fallback heurístico por nombre (marcaId → Marca, cursoId → Curso)
  if (field.kind !== 'scalar') return null;
  if (field.type !== 'Int') return null;
  if (!field.name.toLowerCase().endsWith('id')) return null;

  const base = field.name.substring(0, field.name.length - 2); // quita "Id"
  const candidate =
    base.length > 0 ? base.charAt(0).toUpperCase() + base.slice(1) : base;

  const match = models.find((m) => m.name === candidate);
  return match ? candidate : null;
}

export function buildAdminMeta(): ResourceMeta[] {
  const models: any[] = dmmf.datamodel.models;
  const enums: any[] = dmmf.datamodel.enums;

  // Mapa de enums: nombre → lista de valores
  const enumMap: Record<string, string[]> = enums.reduce(
    (acc, e) => {
      acc[e.name] = e.values.map((v: any) => v.name);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // 🔍 Índice de FKs basado en relaciones Prisma
  // key: 'Curso.instructorId' → 'Usuario'
  const fkIndex: Record<string, string> = {};
  for (const m of models) {
    for (const f of m.fields as any[]) {
      if (
        f.kind === 'object' &&
        Array.isArray(f.relationFromFields) &&
        f.relationFromFields.length > 0
      ) {
        const targetModel = f.type; // p.ej. 'Usuario', 'Curso', etc.
        for (const fromField of f.relationFromFields) {
          fkIndex[`${m.name}.${fromField}`] = targetModel;
        }
      }
    }
  }

  const resources: ResourceMeta[] = [];

  for (const model of models) {
    const fields: FieldMeta[] = [];

    for (const field of model.fields as any[]) {
      // kind real del DMMF: "scalar" | "object" | "enum"
      const isEnum = field.kind === 'enum' || !!enumMap[field.type];
      const enumValues = isEnum ? (enumMap[field.type] ?? []) : undefined;

      const kind: FieldKind = field.kind === 'object' ? 'relation' : 'scalar';

      // Imagen
      const isImage = isImageField(field);

      // Archivo (Leccion.rutaSrc)
      const { isFile, fileKind } = detectFileField(model, field);

      // FK (explicita + heurística)
      const fkResource = inferFkResourceForField(
        models,
        field,
        model.name,
        fkIndex,
      );
      const isForeignKey = !!fkResource;

      // Relaciones lista → contador de hijos
      const isParentChildCount = kind === 'relation' && field.isList === true;

      // --- Heurísticas de UI ---
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

      // Campos de sistema no se editan
      if (SYSTEM_DATE_FIELDS.includes(field.name)) {
        showInForm = false;
      }

      // Campos derivados / de rating → solo lectura (no se editan desde el admin genérico)
      if (READONLY_FORM_FIELDS.includes(field.name)) {
        showInForm = false;
      }

      // passwordHash nunca se edita desde el form genérico
      if (field.name === 'passwordHash') {
        showInForm = false;
      }

      // Textos largos fuera de la tabla (para no destrozar el layout)
      if (LONG_TEXT_FIELDS.includes(field.name)) {
        showInList = false;
      }

      const fieldMeta: FieldMeta = {
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
      };

      fields.push(fieldMeta);
    }

    const resourceMeta: ResourceMeta = {
      name: model.name,
      tableName: inferTableName(model),
      displayName: humanizeName(model.name),
      fields,
    };

    resources.push(resourceMeta);
  }

  return resources;
}
