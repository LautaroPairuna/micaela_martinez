// Función genérica para obtener slug desde la API
async function getGenericSlug(tableName: string, recordId: string): Promise<string | null> {
  try {
    // Get auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      console.warn('No auth token found for slug lookup');
      return null;
    }

    const response = await fetch(`/api/admin/tables/${tableName}/records/${recordId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.statusText}`);
    }

    const record = await response.json();
    return record?.slug || null;
  } catch (error) {
    console.error(`Error obteniendo slug de ${tableName}:`, error);
    return null;
  }
}

/**
 * Tipos de archivo soportados
 */
export type FileType = 'video' | 'image';

/**
 * Tipos de entidad para imágenes
 */
export type ImageEntityType = 'marca' | 'categoria' | 'producto';

/**
 * Configuración para generación de nombres de archivo
 */
interface FileNamingConfig {
  fileType: FileType;
  entityType?: ImageEntityType;
  entityId: string;
  originalFileName: string;
  fieldName?: string;
}

/**
 * Convierte texto a slug usando slugify
 */
export function textToSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .trim();
}

/**
 * Obtiene la extensión de un archivo
 */
export function getFileExtension(fileName: string): string {
  return fileName.substring(fileName.lastIndexOf('.'));
}

/**
 * Genera un nombre único de archivo usando slug
 */
export function generateUniqueFileName(slug: string | null, extension: string, isEdit: boolean = false): string {
  const timestamp = Date.now();
  const editSuffix = isEdit ? '-edit' : '';
  
  if (!slug) {
    return `archivo${editSuffix}-${timestamp}${extension}`;
  }
  
  // Limpiar el slug para asegurar que sea válido como nombre de archivo
  const cleanSlug = slug
    .replace(/[^a-z0-9\-]/gi, '') // Solo letras, números y guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-|-$/g, '') // Remover guiones al inicio y final
    .toLowerCase();
  
  if (!cleanSlug) {
    return `archivo${editSuffix}-${timestamp}${extension}`;
  }
  
  // Limitar longitud del slug
  const maxSlugLength = 50;
  const truncatedSlug = cleanSlug.length > maxSlugLength 
    ? cleanSlug.substring(0, maxSlugLength).replace(/-$/, '')
    : cleanSlug;
  
  return `${truncatedSlug}${editSuffix}-${timestamp}${extension}`;
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
    const slug = await getGenericSlug(tableName, recordId);
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
    const slug = await getGenericSlug(tableName, recordId);
    console.log('📝 Slug obtenido:', slug);
    
    if (!slug) {
      console.warn('⚠️ No se pudo obtener slug, usando fallback');
      const timestamp = Date.now();
      const editSuffix = isEdit ? '-edit' : '';
      return `imagen${editSuffix}-${timestamp}${extension}`;
    }
    
    const fileName = generateUniqueFileName(slug, extension, isEdit);
    console.log('✅ Nombre de archivo generado:', fileName);
    return fileName;
    
  } catch (error) {
    console.error('❌ Error generando nombre de imagen:', error);
    // Fallback usando timestamp si falla la obtención del slug
    const timestamp = Date.now();
    const editSuffix = isEdit ? '-edit' : '';
    return `imagen${editSuffix}-${timestamp}${extension}`;
  }
}

/**
 * Genera un nombre de archivo basado en la configuración proporcionada
 */
export async function generateFileName(config: FileNamingConfig): Promise<string> {
  const { fileType, entityId, originalFileName } = config;
  const extension = getFileExtension(originalFileName);
  
  if (fileType === 'image') {
    return await generateImageFileName('Producto', entityId, extension);
  } else if (fileType === 'video') {
    return await generateVideoFileName('Producto', entityId, extension);
  }
  
  // Fallback para otros tipos
  const timestamp = Date.now();
  return `${fileType}-${entityId}-${timestamp}${extension}`;
}

/**
 * Detecta el tipo de archivo basado en la extensión
 */
export function detectFileType(fileName: string): FileType | null {
  const extension = getFileExtension(fileName).toLowerCase();
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
  
  if (imageExtensions.includes(extension)) {
    return 'image';
  } else if (videoExtensions.includes(extension)) {
    return 'video';
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
  
  // Verificar longitud máxima
  if (fileName.length > 255) {
    return false;
  }
  
  return true;
}

/**
 * Sanitiza un nombre de archivo removiendo caracteres no válidos
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '') // Remover caracteres no válidos
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .trim();
}