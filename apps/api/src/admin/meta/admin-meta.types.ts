// src/admin/meta/admin-meta.types.ts

export type FieldKind = 'scalar' | 'relation';

/**
 * Tipos de archivo que reconocemos cuando `isFile === true`.
 * (Imágenes se manejan con `isImage`, no con FileKind.)
 */
export type FileKind = 'video' | 'doc' | 'generic';

export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'notNull';

/**
 * ✅ Backwards compatible:
 * - tu frontend/back ya usan 'string'
 * - agregamos 'text' como alias (por si en el futuro querés distinguir)
 */
export type FilterInput =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'relation';

/**
 * ✅ Agrupación UX
 */
export type FilterGroup =
  | 'quick'
  | 'status'
  | 'relations'
  | 'dates'
  | 'metrics'
  | 'technical';

/**
 * ✅ Filtros virtuales (derivados) para UX ecommerce real
 */
export type VirtualFilter =
  | { kind: 'hasValue'; field: string } // not null / not empty
  | { kind: 'hasImage'; field: string } // notNull
  | { kind: 'inStock'; field: string } // gt 0
  | { kind: 'outOfStock'; field: string } // equals 0
  | { kind: 'discounted'; priceField: string; listField: string } // precio < precioLista
  | { kind: 'ratingAtLeast'; field: string }; // ratingProm >= X (si quisieras)

export interface FilterMeta {
  field: string; // nombre del campo (o virtual)
  label: string;
  input: FilterInput;
  operators: FilterOperator[];

  // Enums
  enumValues?: string[];

  // Relaciones
  relationModel?: string;

  // ✅ NUEVO: UX metadata (opcionales)
  group?: FilterGroup;
  priority?: number; // mayor = más arriba
  hiddenByDefault?: boolean;

  // ✅ NUEVO: filtro virtual
  virtual?: VirtualFilter;
}

export interface FieldMeta {
  name: string;
  type: string;
  kind: FieldKind; // 'scalar' | 'relation'

  isId: boolean;
  isRequired: boolean;
  isList: boolean;
  isEnum: boolean;

  // Relaciones (para campos kind === 'relation')
  relationModel?: string; // ej: 'Marca', 'Categoria', 'Usuario', etc.

  // Enums
  enumName?: string; // ej: 'TipoLeccion'
  enumValues?: string[]; // ej: ['VIDEO','DOCUMENTO','QUIZ','TEXTO']

  // Heurísticas de UI (SIEMPRE boolean)
  isImage: boolean; // campos de imagen (portada, imagen_archivo, etc.)

  // ✅ Widget específico solicitado por config
  widget?: string; // 'video', 'markdown', 'list', 'rich-text', etc.
  isParentChildCount: boolean; // relaciones list para mostrar _count
  isForeignKey: boolean; // ej: marcaId, categoriaId, cursoId
  fkResource?: string; // modelo Prisma de la FK: 'Marca', 'Categoria', etc.

  // Archivos (SIEMPRE boolean)
  isFile: boolean;
  fileKind?: FileKind; // solo si isFile === true

  showInList: boolean;
  showInForm: boolean;

  // UI Enhancements
  label?: string; // Título amigable del campo (ej: "Precio de Venta")
  help?: string; // Tooltip o texto de ayuda
  placeholder?: string;
}

export interface ResourceMeta {
  name: string; // Nombre del modelo Prisma: 'Producto'
  tableName: string; // Nombre físico: 'producto'
  displayName: string; // Para UI: 'Producto'

  fields: FieldMeta[];
  filters: FilterMeta[];

  /**
   * ✅ define qué campos usa el buscador global q
   * si está vacío, el CRUD hace fallback
   */
  searchFields?: string[];
}
