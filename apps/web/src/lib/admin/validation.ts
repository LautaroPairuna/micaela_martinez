// apps/web/src/lib/admin/validation.ts
import { z } from 'zod';
import type { FieldMeta } from './meta-types';

type ZodAny = z.ZodTypeAny;

function mapFieldToZod(field: FieldMeta): ZodAny {
  // En tu meta solo tenemos isRequired, no isNullable / isGenerated.
  const isRequired = field.isRequired && !field.isList;

  let base: ZodAny;

  // 1) Relaciones → de momento no las validamos fino, las dejamos "flexibles"
  if (field.kind === 'relation') {
    base = field.isList ? z.array(z.any()) : z.any();
  }
  // 2) Enums → si Prisma te mandó valores, los usamos
  else if (field.isEnum && field.enumValues && field.enumValues.length > 0) {
    // z.enum necesita un tuple, casteamos asumiendo que hay al menos 1 valor
    base = z.enum(field.enumValues as [string, ...string[]]);
  }
  // 3) Escalares según tipo base
  else {
    switch (field.type) {
      case 'String':
      case 'string':
      case 'String?':
        base = z.string();
        break;

      case 'Int':
      case 'BigInt':
      case 'Int?':
      case 'number':
        base = z.number().int();
        break;

      case 'Float':
      case 'Decimal':
      case 'Float?':
        base = z.number();
        break;

      case 'Boolean':
      case 'bool':
        base = z.boolean();
        break;

      case 'DateTime':
      case 'Date':
        // según cómo manejes las fechas en el form; acá dejo string o Date
        base = z.union([z.string(), z.date()]);
        break;

      default:
        // Tipos raros o no mapeados los dejamos libres por ahora
        base = z.any();
        break;
    }
  }

  // Si no es requerido en tu meta → lo volvemos opcional/nullable
  if (!isRequired) {
    base = base.optional().nullable();
  }

  return base;
}

export function buildZodSchemaFromFields(fields: FieldMeta[]) {
  const shape: Record<string, ZodAny> = {};

  for (const field of fields) {
    // Reglas básicas:
    // - Solo campos que se muestran en formularios
    // - No incluir el ID
    // - No incluir contadores de hijos
    if (!field.showInForm) continue;
    if (field.isId) continue;
    if (field.isParentChildCount) continue;

    shape[field.name] = mapFieldToZod(field);
  }

  return z.object(shape);
}
