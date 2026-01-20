// src/admin/meta/admin-meta.types.ts

export type FieldKind = 'scalar' | 'relation';

export type FileKind = 'video' | 'doc' | 'generic';

export interface FieldMeta {
  name: string;
  type: string;
  kind: FieldKind; // 'scalar' | 'relation'

  isId: boolean;
  isRequired: boolean;
  isList: boolean;
  isEnum: boolean;

  // Relaciones
  relationModel?: string; // p.ej. 'Marca', 'Categoria' para campos relation

  // Enums (ej: TipoLeccion)
  enumName?: string;
  enumValues?: string[];

  // Heurísticas de UI
  isImage?: boolean; // campos de imagen (portada, imagen_archivo, etc.)
  isParentChildCount?: boolean; // relaciones hijos (arrays) para mostrar conteo
  isForeignKey?: boolean; // ej: marcaId, categoriaId, cursoId
  fkResource?: string; // modelo Prisma de la FK: 'Marca', 'Categoria'

  // Archivos (ej: Leccion.rutaSrc)
  isFile?: boolean;
  fileKind?: FileKind; // 'video' | 'doc' | 'generic' (por ahora usamos 'generic')

  showInList: boolean;
  showInForm: boolean;
}

export interface ResourceMeta {
  name: string; // Nombre del modelo Prisma: 'Producto'
  tableName: string; // Nombre físico: 'producto'
  displayName: string; // Para UI: 'Producto'

  fields: FieldMeta[];
}
