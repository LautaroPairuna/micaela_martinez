// apps/web/src/lib/admin/meta-types.ts
export type FieldKind = 'scalar' | 'relation';
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

// ✅ agregamos 'text'
export type FilterInput =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'relation';

export interface FilterMeta {
  field: string;
  label: string;
  input: FilterInput;
  operators: FilterOperator[];
  enumValues?: string[];
  relationModel?: string;
}

export interface FieldMeta {
  name: string;
  type: string;
  kind: FieldKind;

  isId: boolean;
  isRequired: boolean;
  isList: boolean;
  isEnum: boolean;

  relationModel?: string;

  enumName?: string;
  enumValues?: string[];

  // ideal: boolean siempre, pero lo dejo compatible con tu UI actual
  isImage?: boolean;
  isFile?: boolean;
  fileKind?: FileKind;

  isParentChildCount?: boolean;
  isForeignKey?: boolean;
  fkResource?: string;

  showInList: boolean;
  showInForm: boolean;

  // UI Enhancements
  label?: string;
  help?: string;
  placeholder?: string;
  widget?: string;
  readOnly?: boolean;
}

export interface ResourceMeta {
  name: string;
  tableName: string;
  displayName: string;
  fields: FieldMeta[];
  filters: FilterMeta[];
}
