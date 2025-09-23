// Rutas "públicas" que tu UI usa para armar URLs.
// Ojo: IMAGE_PUBLIC_URL lo dejamos en /images porque lo sirves estático desde el back.
// Para contenidos protegidos (video/doc) se usa /api/media/*

export const IMAGE_PUBLIC_URL = '/images';     // p.ej. /images/producto/slug/archivo.jpg
export const MEDIA_PUBLIC_URL = '/api/media';  // base para /api/media/videos|docs|images
export const DOC_PUBLIC_URL   = '/docs';       // si además sirves PDFs públicos

// Útil por si querés construir URLs absolutas al backend en alguna circunstancia
function computeBackendUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (backendUrl) {
    return backendUrl.replace(/\/+$/, '');
  }
  
  // Fallback para desarrollo local
  const fallback = 'http://localhost:3001';
  console.warn(`[ADMIN-CONSTANTS] NEXT_PUBLIC_BACKEND_URL no definido, usando fallback: ${fallback}`);
  return fallback;
}

export const BACKEND_URL = computeBackendUrl();

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

// Alias para mantener compatibilidad con código existente
export const allFolderNames = folderNames;

/**
 * Extensiones de archivos de imagen soportadas
 */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.tif'];

/**
 * Extensiones de archivos de video soportadas
 */
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.3gp', '.m4v', '.mpg', '.mpeg'];

/**
 * Verifica si un archivo es una imagen basándose en su extensión
 */
export function isImageFile(filePath: string): boolean {
  const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXTENSIONS.includes(extension);
}

/**
 * Verifica si un archivo es un video basándose en su extensión
 */
export function isVideoFile(filePath: string): boolean {
  const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return VIDEO_EXTENSIONS.includes(extension);
}
