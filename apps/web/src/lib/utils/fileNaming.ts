import { databaseSlugService } from '../services/DatabaseSlugService';

/**
 * Tipos de archivos soportados
 */
export type FileType = 'video' | 'image';

/**
 * Tipos de entidades para imágenes
 */
export type ImageEntityType = 'marca' | 'categoria' | 'producto';

/**
 * Configuración para el renombrado de archivos
 */
interface FileNamingConfig {
  fileType: FileType;
  entityType?: ImageEntityType;
  entityId: string;
  originalFileName: string;
  fieldName?: string;
}

/**
 * Convierte un texto a slug válido para nombres de archivo
 */
export function textToSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-|-$/g, ''); // Remover guiones al inicio y final
}

/**
 * Obtiene la extensión de un archivo
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
}

/**
 * Genera un nombre de archivo único basado en slug y timestamp
 */
export function generateUniqueFileName(slug: string | null, extension: string, isEdit: boolean = false): string {
  // Limpiar el slug si existe
  const cleanSlug = slug ? textToSlug(slug) : null;
  
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

  if (cleanSlug) {
    // Si tenemos slug, usarlo con timestamp
    if (isEdit) {
      return `${cleanSlug}-editado-${timestamp}${extension}`;
    } else {
      return `${cleanSlug}-${timestamp}${extension}`;
    }
  } else {
    // Fallback: usar "nuevo-producto" para creación o "archivo" para casos sin contexto
    const prefix = isEdit ? 'archivo-editado' : 'nuevo-producto';
    return `${prefix}-${timestamp}${extension}`;
  }
}

/**
 * Genera un nombre de archivo para videos usando slug de la base de datos
 */
export async function generateVideoFileName(
  tableName: string, 
  recordId: string, 
  extension: string,
  isEdit: boolean = false
): Promise<string> {
  try {
    const slug = await databaseSlugService.getGenericSlug(tableName, recordId);
    return generateUniqueFileName(slug, extension, isEdit);
  } catch (error) {
    console.error('Error generando nombre de video:', error);
    // Fallback usando timestamp si falla la obtención del slug
    const timestamp = Date.now();
    const editSuffix = isEdit ? '-edit' : '';
    return `video${editSuffix}-${timestamp}${extension}`;
  }
}

/**
 * Genera un nombre de archivo para imágenes usando slug de la base de datos
 */
export async function generateImageFileName(
  tableName: string, 
  recordId: string, 
  extension: string,
  isEdit: boolean = false
): Promise<string> {
  console.log('🔍 generateImageFileName called with:', { tableName, recordId, extension, isEdit });
  
  try {
    const slug = await databaseSlugService.getGenericSlug(tableName, recordId);
    console.log('📝 Slug obtenido:', slug);
    
    if (!slug) {
      console.warn('⚠️ No se pudo obtener slug, usando fallback');
      const timestamp = Date.now();
      // Para imágenes, siempre usar .webp ya que se convierten automáticamente
      return `imagen-${tableName}-${timestamp}.webp`;
    }
    
    // Para imágenes, siempre usar .webp ya que se convierten automáticamente
    const filename = generateUniqueFileName(slug, '.webp', isEdit);
    console.log('📁 Filename generado:', filename);
    
    return filename;
  } catch (error) {
    console.error('❌ Error generando nombre de imagen:', error);
    // Fallback usando timestamp si falla la obtención del slug
    const timestamp = Date.now();
    // Para imágenes, siempre usar .webp ya que se convierten automáticamente
    return `imagen-${tableName}-${timestamp}.webp`;
  }
}

/**
 * Función principal para generar nombres de archivos
 */
export async function generateFileName(config: FileNamingConfig): Promise<string> {
  const { fileType, entityType, entityId, originalFileName, fieldName } = config;

  try {
    switch (fileType) {
      case 'video':
        // Para videos, usar el entityId como recordId y obtener la extensión
        const videoExtension = getFileExtension(originalFileName);
        return await generateVideoFileName('lesson', entityId, videoExtension);
      
      case 'image':
        if (!entityType) {
          throw new Error('entityType es requerido para imágenes');
        }
        const imageExtension = getFileExtension(originalFileName);
        return await generateImageFileName(entityType, entityId, imageExtension);
      
      default:
        console.warn(`Tipo de archivo no soportado: ${fileType}`);
        return originalFileName;
    }
  } catch (error) {
    console.error('Error generando nombre de archivo:', error);
    return originalFileName;
  }
}

/**
 * Detecta el tipo de archivo basado en la extensión
 */
export function detectFileType(fileName: string): FileType | null {
  const extension = getFileExtension(fileName).toLowerCase();
  
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  
  if (videoExtensions.includes(extension)) {
    return 'video';
  }
  
  if (imageExtensions.includes(extension)) {
    return 'image';
  }
  
  return null;
}

/**
 * Valida si un nombre de archivo es válido
 */
export function isValidFileName(fileName: string): boolean {
  // Verificar que no esté vacío
  if (!fileName || fileName.trim().length === 0) {
    return false;
  }
  
  // Verificar caracteres no permitidos en nombres de archivo
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    return false;
  }
  
  // Verificar longitud máxima (255 caracteres es el límite común)
  if (fileName.length > 255) {
    return false;
  }
  
  return true;
}

/**
 * Sanitiza un nombre de archivo para que sea válido
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '-') // Reemplazar caracteres no válidos
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-|-$/g, '') // Remover guiones al inicio y final
    .substring(0, 255); // Limitar longitud
}