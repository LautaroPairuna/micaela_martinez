/**
 * Utilidades para detectar campos de archivo y determinar tipos de archivo
 */

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other'

/**
 * Campos que se consideran de archivo basados en su nombre
 */
const FILE_FIELD_PATTERNS = [
  'foto',
  'imagen',
  'portada',
  'rutasrc',
  'archivo',
  'productoImagen',
  'video',
  'audio',
  'documento',
  'file'
]

/**
 * Detecta si un campo es de tipo archivo basado en su nombre
 */
export function isFileField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase()
  return FILE_FIELD_PATTERNS.some(pattern => 
    lowerFieldName.includes(pattern.toLowerCase())
  )
}

/**
 * Determina el tipo de archivo basado en el MIME type
 */
export function getFileTypeFromMime(mimeType: string): FileType {
  if (!mimeType) return 'other'
  
  const mime = mimeType.toLowerCase()
  
  // Imágenes
  if (mime.startsWith('image/')) {
    return 'image'
  }
  
  // Videos
  if (mime.startsWith('video/')) {
    return 'video'
  }
  
  // Audio
  if (mime.startsWith('audio/')) {
    return 'audio'
  }
  
  // Documentos
  if ([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ].includes(mime)) {
    return 'document'
  }
  
  return 'other'
}

/**
 * Determina el tipo de archivo basado en la extensión del nombre de archivo
 */
export function getFileTypeFromExtension(fileName: string): FileType {
  if (!fileName) return 'other'
  
  const ext = fileName.toLowerCase().split('.').pop() || ''
  
  // Imágenes
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) {
    return 'image'
  }
  
  // Videos
  if (['mp4', 'webm', 'ogg', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'mkv', '3gp'].includes(ext)) {
    return 'video'
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'oga', 'aac', 'flac', 'm4a', 'wma'].includes(ext)) {
    return 'audio'
  }
  
  // Documentos
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'].includes(ext)) {
    return 'document'
  }
  
  return 'other'
}

/**
 * Determina la carpeta de destino basándose en el tipo de archivo
 */
export function getFolderByFileType(filename: string): string {
  const fileType = getFileTypeFromExtension(filename)
  
  switch (fileType) {
    case 'image':
      return 'images'
    case 'video':
      return 'videos'
    case 'audio':
      return 'audio'
    case 'document':
      return 'documents'
    default:
      return 'files'
  }
}

/**
 * Valida si un tipo de archivo es permitido
 */
export function validateFileType(mimeType: string, allowedTypes?: FileType[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) {
    return true // Permitir todos si no se especifican restricciones
  }
  
  const fileType = getFileTypeFromMime(mimeType)
  return allowedTypes.includes(fileType)
}

/**
 * Obtiene la extensión recomendada para un tipo de archivo
 */
export function getRecommendedExtension(mimeType: string): string {
  const mime = mimeType.toLowerCase()
  
  // Mapeo de MIME types a extensiones
  const mimeToExt: Record<string, string> = {
    // Imágenes
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    
    // Videos
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
    'video/avi': '.avi',
    'video/mov': '.mov',
    'video/wmv': '.wmv',
    
    // Audio
    'audio/mp3': '.mp3',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    
    // Documentos
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  }
  
  return mimeToExt[mime] || '.bin'
}

/**
 * Verifica si un archivo necesita procesamiento especial (como thumbnails)
 */
export function needsImageProcessing(mimeType: string): boolean {
  return getFileTypeFromMime(mimeType) === 'image'
}

/**
 * Obtiene el directorio base según el tipo de archivo
 */
export function getBaseDirectory(fileType: FileType): string {
  switch (fileType) {
    case 'image':
      return 'images'
    case 'video':
      return 'videos'
    case 'audio':
      return 'audio'
    case 'document':
      return 'documents'
    default:
      return 'files'
  }
}