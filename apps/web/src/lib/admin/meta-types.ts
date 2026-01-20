// apps/web/src/lib/admin/meta-types.ts
export type FieldKind = 'scalar' | 'relation';
export type FileKind = 'video' | 'doc' | 'generic';

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

  isImage?: boolean;
  isFile?: boolean;
  fileKind?: FileKind;

  isParentChildCount?: boolean;
  isForeignKey?: boolean;
  fkResource?: string;

  showInList: boolean;
  showInForm: boolean;
}

export interface ResourceMeta {
  name: string;
  tableName: string;
  displayName: string;
  fields: FieldMeta[];
}
