import { generateSlug } from './slugUtils';

/**
 * Extrae la extensión de un archivo (incluye el punto)
 */
function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
}

/**
 * Genera un preview del nombre de archivo que se usará al guardar
 * Sin hacer llamadas al servidor, usando solo información local
 */
export function generateFileNamePreview(
  file: File,
  titleHint?: string,
  tableName?: string,
  recordId?: string,
  isEdit: boolean = false
): string {
  const extension = getFileExtension(file.name);
  
  // Generar timestamp en zona horaria de Argentina
  const now = new Date();
  const argentinaTime = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const timestamp = `${argentinaTime.find(p => p.type === 'year')?.value}${argentinaTime.find(p => p.type === 'month')?.value}${argentinaTime.find(p => p.type === 'day')?.value}-${argentinaTime.find(p => p.type === 'hour')?.value}${argentinaTime.find(p => p.type === 'minute')?.value}${argentinaTime.find(p => p.type === 'second')?.value}`;

  // Determinar el slug base
  let baseSlug: string;
  
  if (titleHint) {
    // Si hay titleHint, usarlo
    baseSlug = generateSlug(titleHint);
  } else if (recordId && recordId !== 'new') {
    // Si hay recordId válido, usar placeholder que indica que se obtendrá del registro
    baseSlug = 'slug-del-registro';
  } else {
    // Fallback para nuevos registros
    baseSlug = 'nuevo-producto';
  }

  // Para imágenes, siempre usar .webp (se optimizan automáticamente)
  const finalExtension = file.type.startsWith('image/') ? '.webp' : extension;
  
  // Generar nombre final
  if (isEdit) {
    return `${baseSlug}-editado-${timestamp}${finalExtension}`;
  } else {
    return `${baseSlug}-${timestamp}${finalExtension}`;
  }
}

/**
 * Genera un preview más detallado con información adicional
 */
export function generateDetailedFileNamePreview(
  file: File,
  titleHint?: string,
  tableName?: string,
  recordId?: string,
  isEdit: boolean = false
): {
  previewName: string;
  willUseSlug: boolean;
  isOptimized: boolean;
  originalSize: string;
  estimatedSize?: string;
} {
  const previewName = generateFileNamePreview(file, titleHint, tableName, recordId, isEdit);
  const willUseSlug = !!(titleHint || (recordId && recordId !== 'new'));
  const isOptimized = file.type.startsWith('image/');
  
  // Formatear tamaño original
  const originalSize = formatFileSize(file.size);
  
  // Estimar tamaño optimizado para imágenes
  let estimatedSize: string | undefined;
  if (isOptimized) {
    // Estimación aproximada: las imágenes WebP suelen ser 25-35% más pequeñas
    const estimatedBytes = Math.round(file.size * 0.7);
    estimatedSize = formatFileSize(estimatedBytes);
  }

  return {
    previewName,
    willUseSlug,
    isOptimized,
    originalSize,
    estimatedSize
  };
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}