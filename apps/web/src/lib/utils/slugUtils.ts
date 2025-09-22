import slugify from 'slugify';

/**
 * Configuración estándar para slugify
 */
const SLUG_CONFIG = {
  lower: true,
  strict: true,
  remove: /[*+~.()'"!:@]/g, // Remover caracteres especiales adicionales
  replacement: '-'
};

/**
 * Genera un slug limpio y consistente a partir de un texto
 */
export function generateSlug(text: string): string {
  if (!text || typeof text !== 'string') {
    return 'archivo';
  }
  
  // Limpiar el texto antes de slugificar
  const cleanText = text
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .replace(/[^\w\s\-áéíóúñüÁÉÍÓÚÑÜ]/g, '') // Mantener solo letras, números, espacios, guiones y acentos
    .substring(0, 100); // Limitar longitud
  
  const slug = slugify(cleanText, SLUG_CONFIG);
  
  // Asegurar que el slug no esté vacío
  return slug || 'archivo';
}

/**
 * Genera un nombre de archivo con timestamp y extensión
 */
export function generateFilename(
  baseText: string, 
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other',
  originalExtension?: string,
  includeDateTime = false,
  clientTimestamp?: number
): string {
  const slug = generateSlug(baseText);
  const timestamp = (clientTimestamp || Date.now()).toString();
  
  // Si se requiere incluir fecha y hora, agregar formato legible
  let dateTimeSuffix = '';
  if (includeDateTime) {
    const date = clientTimestamp ? new Date(clientTimestamp) : new Date();
    dateTimeSuffix = `-${date.toISOString().slice(0, 19).replace(/[T:]/g, '-')}`;
  }
  
  // Para imágenes, siempre usar .webp (se optimizan automáticamente)
  if (fileType === 'image') {
    return `${slug}-${timestamp}${dateTimeSuffix}.webp`;
  }
  
  // Para otros tipos, mantener extensión original o usar default
  const ext = originalExtension || getDefaultExtension(fileType);
  return `${slug}-${timestamp}${dateTimeSuffix}${ext}`;
}

/**
 * Obtiene la extensión por defecto según el tipo de archivo
 */
function getDefaultExtension(fileType: string): string {
  switch (fileType) {
    case 'video': return '.mp4';
    case 'audio': return '.mp3';
    case 'document': return '.pdf';
    default: return '.bin';
  }
}

/**
 * Valida que un slug sea válido
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  
  // Un slug válido debe contener solo letras minúsculas, números y guiones
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug) && slug.length >= 1 && slug.length <= 100;
}

/**
 * Limpia un slug existente para asegurar consistencia
 */
export function cleanSlug(slug: string): string {
  return generateSlug(slug);
}