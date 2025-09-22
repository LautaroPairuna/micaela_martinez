// src/admin/uploads/constants.ts
import * as path from 'path';

/* ─────────────────────────────────────────────────────────────────
   CONFIGURACIÓN DE DIRECTORIOS Y RUTAS
   ───────────────────────────────────────────────────────────────── */

const CWD = process.cwd();

/** Carpeta pública raíz de IMÁGENES procesadas (WebP y thumbs). */
export const IMAGE_PUBLIC_DIR =
  process.env.MEDIA_DIR_IMAGES || path.join(CWD, 'public', 'images');

/** Prefijo público para IMÁGENES. Ej.: /images */
export const IMAGE_PUBLIC_URL = process.env.MEDIA_URL_IMAGES || '/images';

/** Carpeta pública raíz de UPLOADS (binarios sin procesar). */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(CWD, 'public', 'uploads');

/** Carpeta física de VIDEOS subidos (dentro de UPLOADS). */
export const MEDIA_UPLOAD_DIR =
  process.env.MEDIA_DIR_UPLOADS || path.join(UPLOADS_DIR, 'media');

/** Carpeta física de DOCUMENTOS subidos (dentro de UPLOADS). */
export const DOC_UPLOAD_DIR =
  process.env.DOC_DIR_UPLOADS || path.join(UPLOADS_DIR, 'docs');

/** Prefijo público de VIDEOS subidos. Ej.: /uploads/media */
export const MEDIA_PUBLIC_URL =
  process.env.MEDIA_URL_UPLOADS || '/uploads/media';

/** Prefijo público de DOCUMENTOS subidos. Ej.: /uploads/docs */
export const DOC_PUBLIC_URL = process.env.DOC_URL_UPLOADS || '/uploads/docs';

/* ─────────────────────────────────────────────────────────────────
   MAPEOS DE TABLAS A CARPETAS
   ───────────────────────────────────────────────────────────────── */

/**
 * Mapeo específico para tablas que manejan archivos
 * (usado principalmente para el sistema de imágenes y uploads)
 */
export const folderNames = {
  /** Productos - carpeta: /images/producto/ */
  Producto: 'producto',
  /** Imágenes de productos - carpeta: /images/producto-imagenes/ */
  ProductoImagen: 'producto-imagenes',
  /** Usuarios - carpeta: /images/usuario/ */
  Usuario: 'usuario',
  /** Cursos - carpeta: /images/cursos/ */
  Curso: 'cursos',
  /** Lecciones - carpeta: /videos/leccion/ */
  Leccion: 'leccion',
  /** Marcas - carpeta: /images/marcas/ */
  Marca: 'marcas',
  /** Categorías - carpeta: /images/categorias/ */
  Categoria: 'categorias',
} as const;

export type PrismaTable = keyof typeof folderNames;

/**
 * Inverso: dado el nombre de carpeta, devolver la tabla Prisma.
 * Ej.: { "producto": "Producto", "marca": "Marca" }
 */
export const tableForFolder: Record<string, PrismaTable> = Object.fromEntries(
  Object.entries(folderNames).map(([tbl, folder]) => [
    folder,
    tbl as PrismaTable,
  ]),
) as Record<string, PrismaTable>;

/* ─────────────────────────────────────────────────────────────────
   HELPERS de PATHS ABSOLUTOS y URL PÚBLICA
   ───────────────────────────────────────────────────────────────── */

/**
 * Ruta absoluta a una imagen dentro de:
 *   IMAGE_PUBLIC_DIR/<folder>/<...segments>
 */
export function getImageAbsolutePath(
  folder: PrismaTable | string,
  segments: string[],
): string {
  const folderName =
    (folder as PrismaTable) in folderNames
      ? folderNames[folder as PrismaTable]
      : String(folder);

  return path.join(IMAGE_PUBLIC_DIR, folderName, ...segments);
}

/**
 * URL pública de una imagen:
 *   IMAGE_PUBLIC_URL/<folder>/<...segments>
 */
export function toPublicImageUrl(
  folder: PrismaTable | string,
  ...segments: string[]
): string {
  const folderName =
    (folder as PrismaTable) in folderNames
      ? folderNames[folder as PrismaTable]
      : String(folder);

  const base = IMAGE_PUBLIC_URL.replace(/\/$/, '');
  return [base, folderName, ...segments].join('/').replace(/\/{2,}/g, '/');
}

/**
 * Ruta absoluta a un archivo de VIDEO dentro de MEDIA_UPLOAD_DIR:
 *   MEDIA_UPLOAD_DIR/<...segments>
 */
export function getUploadAbsolutePath(...segments: string[]): string {
  return path.join(MEDIA_UPLOAD_DIR, ...segments);
}

/**
 * URL pública de un VIDEO:
 *   MEDIA_PUBLIC_URL/<...segments>
 */
export function toPublicMediaUrl(...segments: string[]): string {
  const base = MEDIA_PUBLIC_URL.replace(/\/$/, '');
  return [base, ...segments].join('/').replace(/\/{2,}/g, '/');
}

/**
 * Ruta absoluta a un DOCUMENTO dentro de DOC_UPLOAD_DIR:
 *   DOC_UPLOAD_DIR/<...segments>
 */
export function getDocAbsolutePath(...segments: string[]): string {
  return path.join(DOC_UPLOAD_DIR, ...segments);
}

/**
 * URL pública de un DOCUMENTO:
 *   DOC_PUBLIC_URL/<...segments>
 */
export function toPublicDocUrl(...segments: string[]): string {
  const base = DOC_PUBLIC_URL.replace(/\/$/, '');
  return [base, ...segments].join('/').replace(/\/{2,}/g, '/');
}

/**
 * Determina el tipo de archivo basado en el MIME
 */
export function getFileType(mimetype: string): string {
  if (mimetype.startsWith('image/')) {
    return 'imagen';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else {
    return 'documento';
  }
}

// Tipos de archivos permitidos
export const ALLOWED_MIME_TYPES = [
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
];
