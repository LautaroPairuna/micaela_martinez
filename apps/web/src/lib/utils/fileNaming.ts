// fileNaming.ts

export type FileType = 'video' | 'image'

export type ImageEntityType = 'marca' | 'categoria' | 'producto'

interface FileNamingConfig {
  fileType: FileType
  entityType?: ImageEntityType
  entityId: string
  originalFileName: string
  fieldName?: string
}

export function textToSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx >= 0 ? fileName.substring(idx) : ''
}

/**
 * Nombre único con timestamp (modo "attach")
 */
export function generateUniqueFileName(
  slug: string | null,
  extension: string,
  isEdit: boolean = false
): string {
  const timestamp = Date.now()
  const editSuffix = isEdit ? '-edit' : ''
  const base = (slug && slug.replace(/[^a-z0-9\-]/gi, '').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()) || 'archivo'
  const truncated = base.length > 50 ? base.substring(0, 50).replace(/-$/, '') : base
  return `${truncated}${editSuffix}-${timestamp}${extension}`
}

/**
 * ✅ slug del registro vía cookies (sin localStorage)
 */
async function getGenericSlug(tableName: string, recordId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/tables/${tableName}/records/${recordId}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const record = await res.json()
    const raw = record?.slug || record?.titulo || record?.title || record?.nombre || record?.name
    return raw ? textToSlug(String(raw)) : null
  } catch (e) {
    console.error(`Error obteniendo slug de ${tableName}:`, e)
    return null
  }
}

/**
 * 🔁 Nombre determinístico (sin timestamp) para "replace"
 */
export function generateDeterministicFileName(slug: string | null, extension: string): string {
  const base = (slug && slug.replace(/[^a-z0-9\-]/gi, '').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()) || 'archivo'
  const truncated = base.length > 80 ? base.substring(0, 80).replace(/-$/, '') : base
  return `${truncated}${extension}`
}

/**
 * Video: usa (1) slug del registro, (2) titleHint, (3) 'video'
 * - attach  → nombre único (con timestamp)
 * - replace → nombre determinístico (sin timestamp)
 */
export async function generateVideoFileName(
  tableName: string,
  recordId: string,
  extension: string,
  isEdit: boolean = false,
  titleHint?: string,
  deterministic: boolean = false
): Promise<string> {
  try {
    let slug = await getGenericSlug(tableName, recordId)
    if (!slug && titleHint) slug = textToSlug(titleHint)

    if (deterministic) {
      return generateDeterministicFileName(slug || 'video', extension)
    }
    return generateUniqueFileName(slug || 'video', extension, isEdit)
  } catch (error) {
    console.error('Error generando nombre de video:', error)
    const base = titleHint ? textToSlug(titleHint) : 'video'
    return deterministic
      ? generateDeterministicFileName(base, extension)
      : generateUniqueFileName(base, extension, isEdit)
  }
}

export async function generateImageFileName(
  tableName: string,
  recordId: string,
  extension: string,
  isEdit: boolean = false,
  deterministic: boolean = false,
  titleHint?: string
): Promise<string> {
  try {
    let slug = await getGenericSlug(tableName, recordId)
    if (!slug && titleHint) slug = textToSlug(titleHint)

    if (deterministic) {
      return generateDeterministicFileName(slug || 'imagen', extension)
    }
    return generateUniqueFileName(slug || 'imagen', extension, isEdit)
  } catch (error) {
    console.error('❌ Error generando nombre de imagen:', error)
    const base = titleHint ? textToSlug(titleHint) : 'imagen'
    return deterministic
      ? generateDeterministicFileName(base, extension)
      : generateUniqueFileName(base, extension, isEdit)
  }
}

/* API opcional genérica */
export async function generateFileName(config: FileNamingConfig): Promise<string> {
  const { fileType, entityId, originalFileName } = config
  const extension = getFileExtension(originalFileName)
  if (fileType === 'image') return await generateImageFileName('Producto', entityId, extension)
  if (fileType === 'video') return await generateVideoFileName('Producto', entityId, extension)
  return `${fileType}-${entityId}-${Date.now()}${extension}`
}

export function detectFileType(fileName: string): FileType | null {
  const ext = getFileExtension(fileName).toLowerCase()
  const img = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  const vid = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv']
  if (img.includes(ext)) return 'image'
  if (vid.includes(ext)) return 'video'
  return null
}

export function isValidFileName(fileName: string): boolean {
  if (!fileName || fileName.trim().length === 0) return false
  if (/[<>:"/\\|?*]/.test(fileName)) return false
  return fileName.length <= 255
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}
