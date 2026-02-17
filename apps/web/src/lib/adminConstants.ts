// apps/web/src/lib/adminConstants.ts

/**
 * Rutas "lindas" que usa el FRONT.
 *
 * Next las reescribe hacia el backend con rewrites:
 *
 *  /images/:path*      →  BACKEND /api/media/images/images/:path*
 *  /docs/:path*        →  BACKEND /api/media/documents/:path*
 *  /videos/:path*      →  BACKEND /api/media/videos/:path*
 *  /thumbnails/:path*  →  BACKEND /api/media/thumbnails/:path*
 */

// FRONT: rutas que usás en <img src="...">, <video src="...">, etc.
export const IMAGE_PUBLIC_URL = '/uploads'; // Antes /images
export const DOC_PUBLIC_URL = '/uploads/docs'; // Antes /docs
export const VIDEO_PUBLIC_URL = '/uploads/media'; // Antes /videos
export const THUMBNAIL_PUBLIC_URL = '/uploads/thumbnails'; // Antes /thumbnails

// Base genérica por si la necesitás
export const MEDIA_PUBLIC_URL = '/api/media';

/**
 * URL absoluta del backend (por si necesitás construir links directos
 * a la API, no para assets estáticos).
 */
function computeBackendUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (backendUrl) {
    return backendUrl.replace(/\/+$/, '');
  }

  const fallback = 'http://localhost:3001';
  console.warn(
    `[ADMIN-CONSTANTS] NEXT_PUBLIC_BACKEND_URL no definido, usando fallback: ${fallback}`,
  );
  return fallback;
}

export const BACKEND_URL = computeBackendUrl();

/**
 * Mapeo lógico de carpetas por recurso (útil para construir paths)
 * OJO: esto es "lógico", no la ruta completa en disco.
 */
export const folderNames = {
  Producto: 'producto',
  ProductoImagen: 'producto-imagenes',
  Usuario: 'usuario',
  Curso: 'cursos',
  Leccion: 'leccion',
  Marca: 'marcas',
  Categoria: 'categorias',
} as const;

export const allFolderNames = folderNames;

/* ---- helpers de tipo de archivo ---- */

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.tiff',
  '.tif',
];

const VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.ogg',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.mkv',
  '.3gp',
  '.m4v',
  '.mpg',
  '.mpeg',
];

export function isImageFile(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const extension = filePath.substring(dotIndex).toLowerCase();
  return IMAGE_EXTENSIONS.includes(extension);
}

export function isVideoFile(filePath: string): boolean {
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const extension = filePath.substring(dotIndex).toLowerCase();
  return VIDEO_EXTENSIONS.includes(extension);
}
