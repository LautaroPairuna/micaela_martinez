/**
 * Utilidades para detectar campos de archivo en formularios del admin
 * Soporta tanto imágenes como videos
 */

// Patrones de nombres de campos que contienen archivos
const FILE_FIELD_PATTERNS = [
  'foto',
  'imagen',
  'portada',
  'archivo',
  'rutasrc',
  'productoImagen',
  'imagenArchivo',
  'portadaArchivo'
] as const

// Extensiones de archivo soportadas
const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'
] as const

const VIDEO_EXTENSIONS = [
  'mp4', 'webm', 'ogg', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'mkv', '3gp', 'm4v', 'mpg', 'mpeg'
] as const

const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'ogg', 'oga', 'aac', 'm4a', 'flac', 'wma'
] as const

const DOCUMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'
] as const

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'unknown'

/**
 * Type guard para verificar pertenencia de un string a una lista 'as const'
 * y estrechar el tipo a T[number] sin usar `any`.
 */
function includesExt<T extends readonly string[]>(
  list: T,
  value: string
): value is T[number] {
  // Cast de la lista solo al runtime para usar includes de string
  return (list as readonly string[]).includes(value)
}

/**
 * Mapa de extensiones por tipo (evita duplicación en validaciones)
 */
const EXTENSIONS_BY_TYPE: Record<Exclude<FileType, 'unknown'>, readonly string[]> = {
  image: IMAGE_EXTENSIONS,
  video: VIDEO_EXTENSIONS,
  audio: AUDIO_EXTENSIONS,
  document: DOCUMENT_EXTENSIONS,
}

/**
 * Obtiene la carpeta base según el tipo de archivo
 * @param fileType - Tipo de archivo
 * @returns Carpeta base para el tipo de archivo
 */
export function getFolderByFileType(fileType: FileType): string {
  switch (fileType) {
    case 'image': return 'images'
    case 'video': return 'uploads/media'
    case 'audio': return 'uploads/media'
    case 'document': return 'uploads/docs'
    default: return 'uploads/media'
  }
}

/**
 * Determina el tipo de archivo basándose en la extensión
 * @param extension - Extensión del archivo (con o sin punto)
 * @returns Tipo de archivo detectado
 */
export function getFileTypeFromExtension(extension: string): FileType {
  if (!extension) return 'unknown'
  
  const cleanExtension = extension.replace('.', '').toLowerCase()
  
  if (includesExt(IMAGE_EXTENSIONS, cleanExtension)) return 'image'
  if (includesExt(VIDEO_EXTENSIONS, cleanExtension)) return 'video'
  if (includesExt(AUDIO_EXTENSIONS, cleanExtension)) return 'audio'
  if (includesExt(DOCUMENT_EXTENSIONS, cleanExtension)) return 'document'
  
  return 'unknown'
}

/**
 * Detecta si un nombre de campo corresponde a un archivo
 * @param fieldName - Nombre del campo a evaluar
 * @returns true si el campo es de tipo archivo
 */
export function isFileField(fieldName: string): boolean {
  const normalizedField = fieldName.toLowerCase()
  
  return FILE_FIELD_PATTERNS.some(pattern => {
    const normalizedPattern = pattern.toLowerCase()
    return normalizedField === normalizedPattern || 
           normalizedField.includes(normalizedPattern) ||
           normalizedField.endsWith(normalizedPattern)
  })
}

/**
 * Determina el tipo de archivo basándose en la extensión del nombre de archivo
 * @param fileName - Nombre del archivo con extensión
 * @returns Tipo de archivo detectado
 */
export function getFileType(fileName: string): FileType {
  if (!fileName) return 'unknown'
  
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (!extension) return 'unknown'
  
  if (includesExt(IMAGE_EXTENSIONS, extension)) return 'image'
  if (includesExt(VIDEO_EXTENSIONS, extension)) return 'video'
  if (includesExt(AUDIO_EXTENSIONS, extension)) return 'audio'
  if (includesExt(DOCUMENT_EXTENSIONS, extension)) return 'document'
  
  return 'unknown'
}

/**
 * Determina el tipo de archivo basándose en el MIME type
 * @param mimeType - MIME type del archivo
 * @returns Tipo de archivo detectado
 */
export function getFileTypeFromMime(mimeType: string): FileType {
  if (!mimeType) return 'unknown'
  
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  
  // Document MIME types
  if (mimeType === 'application/pdf' ||
      mimeType.includes('msword') ||
      mimeType.includes('officedocument') ||
      mimeType === 'text/plain' ||
      mimeType === 'text/rtf' ||
      mimeType.includes('opendocument')) {
    return 'document'
  }
  
  return 'unknown'
}

/**
 * Obtiene el accept string apropiado para un input de archivo
 * @param allowedTypes - Tipos de archivo permitidos
 * @returns String de accept para el input
 */
export function getAcceptString(allowedTypes: FileType[]): string {
  const accepts: string[] = []
  
  if (allowedTypes.includes('image')) {
    accepts.push('image/*')
    accepts.push('.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.tiff')
  }
  
  if (allowedTypes.includes('video')) {
    accepts.push('video/*')
    accepts.push('.mp4,.webm,.ogg,.ogv,.avi,.mov,.wmv,.flv,.mkv,.3gp,.m4v')
  }
  
  if (allowedTypes.includes('audio')) {
    accepts.push('audio/*')
    accepts.push('.mp3,.wav,.ogg,.oga,.aac,.m4a,.flac,.wma')
  }
  
  if (allowedTypes.includes('document')) {
    accepts.push('application/pdf,text/*')
    accepts.push('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp')
  }
  
  // Si no hay tipos específicos o incluye 'unknown', ser más permisivo
  if (allowedTypes.length === 0 || allowedTypes.includes('unknown')) {
    accepts.push('*/*')
  }
  
  return accepts.join(',')
}

/**
 * Valida si un archivo es del tipo esperado usando múltiples estrategias
 * @param file - Archivo a validar
 * @param allowedTypes - Tipos permitidos
 * @returns true si el archivo es válido
 */
export function validateFileType(file: File, allowedTypes: FileType[]): boolean {
  // Si no hay restricciones, permitir todo
  if (!allowedTypes || allowedTypes.length === 0) {
    return true
  }
  
  const fileName = file.name || ''
  const mimeType = file.type || ''
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  
  console.log('🔍 Validando archivo:', {
    fileName,
    mimeType,
    extension,
    allowedTypes
  })
  
  // Estrategia 1: Validar por MIME type
  const fileTypeFromMime = getFileTypeFromMime(mimeType)
  if (fileTypeFromMime !== 'unknown' && allowedTypes.includes(fileTypeFromMime)) {
    console.log('✅ Válido por MIME type:', fileTypeFromMime)
    return true
  }
  
  // Estrategia 2: Validar por extensión → tipo
  const fileTypeFromExt = getFileTypeFromExtension(extension)
  if (fileTypeFromExt !== 'unknown' && allowedTypes.includes(fileTypeFromExt)) {
    console.log('✅ Válido por extensión:', fileTypeFromExt)
    return true
  }
  
  // Estrategia 3: Validación directa por listas de extensiones conocidas
  for (const type of ['video', 'image', 'audio', 'document'] as const) {
    if (allowedTypes.includes(type) && includesExt(EXTENSIONS_BY_TYPE[type], extension)) {
      console.log(`✅ Válido por extensión directa (${type}):`, extension)
      return true
    }
  }
  
  // Estrategia 4: Si el tipo permitido es 'unknown', permitir archivos no reconocidos
  if (allowedTypes.includes('unknown')) {
    console.log('✅ Válido por tipo unknown permitido')
    return true
  }
  
  console.log('❌ Archivo no válido:', {
    detectedMimeType: fileTypeFromMime,
    detectedExtType: fileTypeFromExt,
    extension,
    allowedTypes
  })
  
  return false
}

/**
 * Obtiene el label apropiado para un campo de archivo
 * @param fieldName - Nombre del campo
 * @param fileType - Tipo de archivo detectado
 * @returns Label legible para el usuario
 */
export function getFileFieldLabel(fieldName: string, fileType?: FileType): string {
  const normalizedField = fieldName.toLowerCase()
  
  // Labels específicos por campo
  const fieldLabels: Record<string, string> = {
    'foto': 'Foto',
    'imagen': 'Imagen',
    'portada': 'Portada',
    'archivo': 'Archivo',
    'rutasrc': 'Ruta del archivo',
    'productoimagen': 'Imagen del producto',
    'imagenarchivo': 'Archivo de imagen',
    'portadaarchivo': 'Archivo de portada'
  }
  
  // Buscar label específico
  for (const [key, label] of Object.entries(fieldLabels)) {
    if (normalizedField.includes(key)) {
      return label
    }
  }
  
  // Label genérico basado en tipo de archivo
  if (fileType) {
    switch (fileType) {
      case 'image': return 'Imagen'
      case 'video': return 'Video'
      case 'audio': return 'Audio'
      case 'document': return 'Documento'
      default: return 'Archivo'
    }
  }
  
  // Fallback: capitalizar el nombre del campo
  return fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
}

/**
 * Tipos de lección disponibles
 */
export type TipoLeccion = 'VIDEO' | 'DOCUMENTO' | 'QUIZ' | 'TEXTO'

/**
 * Obtiene los tipos de archivo permitidos basado en el tipo de lección
 */
export function getAllowedFileTypesByLessonType(tipoLeccion: TipoLeccion, fieldName: string): FileType[] {
  const normalizedField = fieldName.toLowerCase()
  
  // Para lecciones de video, priorizar videos
  if (tipoLeccion === 'VIDEO') {
    if (normalizedField.includes('rutasrc') || normalizedField.includes('archivo')) {
      return ['video', 'image'] // Video primero, imagen como fallback
    }
  }
  
  // Para lecciones de documento, priorizar documentos
  if (tipoLeccion === 'DOCUMENTO') {
    if (normalizedField.includes('rutasrc') || normalizedField.includes('archivo')) {
      return ['document', 'image'] // Documento primero, imagen como fallback
    }
  }
  
  // Para lecciones de quiz y texto, solo imágenes en rutasrc (opcional)
  if (tipoLeccion === 'QUIZ' || tipoLeccion === 'TEXTO') {
    if (normalizedField.includes('rutasrc') || normalizedField.includes('archivo')) {
      return ['image'] // Solo imágenes para contenido visual opcional
    }
  }
  
  // Fallback a la lógica original para otros campos
  return getAllowedFileTypes(fieldName)
}

export function getAllowedFileTypes(fieldName: string): FileType[] {
  const normalizedField = fieldName.toLowerCase()
  
  // Campos que típicamente solo aceptan imágenes
  const imageOnlyFields = ['foto', 'imagen', 'portada', 'imagenarchivo', 'portadaarchivo']
  if (imageOnlyFields.some(field => normalizedField.includes(field))) {
    return ['image']
  }
  
  // Campos que pueden aceptar videos (como rutasrc para lecciones)
  const videoFields = ['rutasrc', 'video']
  if (videoFields.some(field => normalizedField.includes(field))) {
    return ['video', 'image'] // Video primero, imagen como fallback
  }
  
  // Campos que pueden aceptar documentos
  const documentFields = ['documento', 'doc', 'pdf', 'archivo']
  if (documentFields.some(field => normalizedField.includes(field)) && 
      !normalizedField.includes('imagen') && 
      !normalizedField.includes('portada')) {
    return ['document', 'image', 'video', 'audio']
  }
  
  // Campo genérico "archivo" acepta todo
  if (normalizedField.includes('archivo') && !normalizedField.includes('imagen') && !normalizedField.includes('portada')) {
    return ['image', 'video', 'audio', 'document']
  }
  
  // Por defecto, solo imágenes
  return ['image']
}
