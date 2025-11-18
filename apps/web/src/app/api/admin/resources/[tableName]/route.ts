export const dynamic = 'force-dynamic'; // Deshabilitar cacheo para todas las rutas
export const revalidate = 0; // No cachear

import { NextRequest, NextResponse } from 'next/server'

import fs                            from 'fs/promises'
import path                          from 'path'
import slugify                       from 'slugify'
import sharp                         from 'sharp'
import { allFolderNames }               from '@/lib/adminConstants'
import { isFileField, getFileTypeFromMime, getFileType, getFolderByFileType } from '../../../../admin/resources/[tableName]/utils/fileFieldDetection'

import { adminApi, AdminApiClient } from '@/lib/sdk/adminApi'
import { existsSync, statSync, createReadStream } from 'fs'

// ───────── MAPEO DE RECURSOS A NOMBRES DE TABLA ─────────
const resourceToTable: Record<string, string> = {
  // Usuarios y autenticación
  Usuario: 'Usuario',
  UsuarioRol: 'UsuarioRol',
  Favorito: 'Favorito',
  
  // Cursos y contenido educativo
  Curso: 'Curso',
  Inscripcion: 'Inscripcion',
  Modulo: 'Modulo',
  Leccion: 'Leccion',
  
  // Productos y e-commerce
  Producto: 'Producto',
  producto: 'Producto', // Mapeo para minúscula (fix para errores 404)
  ProductoImagen: 'ProductoImagen',
  Marca: 'Marca',
  Categoria: 'Categoria',
  
  // Órdenes y pagos
  Orden: 'Orden',
  ItemOrden: 'ItemOrden',
  Direccion: 'Direccion',
  
  // Reseñas y interacciones
  Resena: 'Resena',
  ResenaLike: 'ResenaLike',
  ResenaRespuesta: 'ResenaRespuesta',
  ResenaBorrador: 'ResenaBorrador',
  
  // Notificaciones
  Notificacion: 'Notificacion',
  PreferenciasNotificacion: 'PreferenciasNotificacion',
  
  // Auditoría
  AuditLog: 'AuditLog',
}

// Campos booleanos
const BOOLEAN_FIELDS = ['activo', 'destacado'] as const
// Removemos FILE_FIELD fijo, ahora usamos detección dinámica

function isFileLike(v: unknown): v is Blob {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Blob).arrayBuffer === 'function'
  )
}

function normalizeBooleans(obj: Record<string, unknown>) {
  for (const key of BOOLEAN_FIELDS) {
    if (key in obj) {
      const v = obj[key]
      obj[key] = v === true || v === 'true' || v === '1' || v === 1
    }
  }
}

function makeTimestamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

/**
 * Maneja solicitudes de archivos y thumbnails
 */
async function handleFileRequest(
  tableName: string,
  filename: string,
  isThumb: boolean,
  req: NextRequest,
  tempAdminApi: AdminApiClient
): Promise<NextResponse> {
  try {
    // Validar que la tabla existe
    const folderKey = (allFolderNames as Record<string, string>)[tableName]
    if (!folderKey) {
      return NextResponse.json({ error: `Tabla '${tableName}' no soportada` }, { status: 404 })
    }

    // Verificar que el archivo está registrado en la BD
    try {
      console.log('🔍 [DEBUG] Verificando archivo en BD con AdminApiClient autenticado');
      
      const response = await tempAdminApi.getTableData(tableName as any, {
        filters: {
          OR: [
            { urlArchivo: { endsWith: filename } },
            { foto: { endsWith: filename } },
            { imagen: { endsWith: filename } },
            { archivo: { endsWith: filename } }
          ]
        },
        limit: 1
      })
      
      if (!response.data || response.data.length === 0) {
        return NextResponse.json({ error: 'Archivo no registrado en BD' }, { status: 404 })
      }
    } catch (error) {
      console.error('Error verificando archivo en BD:', error)
      return NextResponse.json({ error: 'Error verificando archivo en BD' }, { status: 500 })
    }

    // Determinar tipo de archivo y carpeta
    const fileType = getFileTypeFromMime(filename)
    const baseFolder = getFolderByFileType(fileType)
    const publicDir = path.join(process.cwd(), 'public')
    
    let filePath: string
    
    if (isThumb) {
      // Solicitud de thumbnail
      const thumbsDir = path.join(publicDir, baseFolder, folderKey, 'thumbs')
      const thumbName = path.basename(filename, path.extname(filename)) + '.jpg'
      filePath = path.join(thumbsDir, thumbName)
      
      // Si el thumbnail no existe, intentar generarlo
      if (!existsSync(filePath)) {
        const originalPath = path.join(publicDir, baseFolder, folderKey, filename)
        
        if (!existsSync(originalPath)) {
          return NextResponse.json({ error: 'Archivo original no encontrado' }, { status: 404 })
        }
        
        try {
          // Crear directorio de thumbnails si no existe
          await fs.mkdir(thumbsDir, { recursive: true })
          
          // Generar thumbnail
          const { generateThumbnailAuto } = await import('@/lib/thumbnailGenerator')
          await generateThumbnailAuto(originalPath, filePath, 200)
        } catch (error) {
          console.error('Error generando thumbnail:', error)
          return NextResponse.json({ error: 'Error generando thumbnail' }, { status: 500 })
        }
      }
    } else {
      // Solicitud de archivo original
      filePath = path.join(publicDir, baseFolder, folderKey, filename)
    }

    // Verificar que el archivo existe
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    const stats = statSync(filePath)
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'No es un archivo válido' }, { status: 404 })
    }

    // Generar headers de cache
    const etag = `W/"${stats.size}-${Number(stats.mtimeMs).toString(36)}"`
    const contentType = getContentType(filename)
    
    const baseHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Last-Modified': stats.mtime.toUTCString(),
      'ETag': etag,
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    // Verificar cache
    const ifNoneMatch = req.headers.get('if-none-match')
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: baseHeaders })
    }

    // Manejar Range requests para videos
    const range = req.headers.get('range')
    if (range && contentType.startsWith('video/')) {
      const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (rangeMatch) {
        const size = stats.size
        const start = rangeMatch[1] ? Math.min(parseInt(rangeMatch[1], 10), size - 1) : 0
        const end = rangeMatch[2] ? Math.min(parseInt(rangeMatch[2], 10), size - 1) : size - 1
        const chunkSize = end - start + 1

        const buffer = await fs.readFile(filePath)
        const chunk = buffer.subarray(start, end + 1)
        
        // Convertimos el Buffer a Uint8Array que es compatible con BlobPart
        const uint8Array = new Uint8Array(chunk)

        return new NextResponse(new Blob([uint8Array]), {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': chunkSize.toString(),
          },
        })
      }
    }

    // Servir archivo completo usando streams para eficiencia
    const stream = createReadStream(filePath)
    return new NextResponse(stream as any, {
      headers: {
        ...baseHeaders,
        'Content-Length': stats.size.toString(),
      },
    })

  } catch (error) {
    console.error('[handleFileRequest] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * Determina el Content-Type basado en la extensión del archivo
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    // Imágenes
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.ico': 'image/x-icon',
    
    // Videos
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    
    // Documentos
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

/* ───────────────────────── GET (server-side table) ───────────────────────── */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName: resourceName } = await context.params
  const tableName = resourceToTable[resourceName]
  if (!tableName) {
    return NextResponse.json({ error: `Recurso "${resourceName}" no existe` }, { status: 404 })
  }

  const url = new URL(req.url)
  
  // Verificar si es una solicitud de archivo
  const filename = url.searchParams.get('file')
  const isThumb = url.searchParams.get('thumb') === 'true'
  
  if (filename) {
    // Si es una request de archivo, usar el token del middleware
    const authToken = req.headers.get('x-auth-token');
    console.log('🔑 [DEBUG] Token desde middleware:', authToken ? 'presente' : 'ausente');
    
    if (authToken) {
      // Crear instancia temporal con el token del middleware
      const tempAdminApi = new AdminApiClient();
      tempAdminApi.setToken(authToken);
      
      return await handleFileRequest(tableName, filename, isThumb, req, tempAdminApi);
    } else {
      console.log('❌ [DEBUG] No hay token de autenticación para archivo');
      return NextResponse.json(
        { error: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }
  }
  
  // Lógica original para datos de tabla
  const page     = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const pageSize = Math.max(1, Math.min(200, Number(url.searchParams.get('pageSize') ?? 10)))
  const sortBy   = url.searchParams.get('sortBy') ?? 'id'
  const sortDir  = (url.searchParams.get('sortDir') ?? 'asc') === 'desc' ? 'desc' : 'asc'
  const q        = (url.searchParams.get('q') ?? '').trim()

  // 1) Filtros: soportar JSON en ?filters= y también pares sueltos en el QS
  const CONTROL_KEYS = new Set(['page', 'pageSize', 'sortBy', 'sortDir', 'q', 'qFields', 'filters', 'file', 'thumb'])
  const where: Record<string, any> = {}

  // a) pares sueltos (marca_id=3&activo=true)
  for (const [k, v] of url.searchParams.entries()) {
    if (CONTROL_KEYS.has(k)) continue
    const all = url.searchParams.getAll(k)
    const norm = (s: string): string | number | boolean => {
      if (s === 'true' || s === 'false' || s === '1' || s === '0') return s === 'true' || s === '1'
      return /^\d+(\.\d+)?$/.test(s) ? Number(s) : s
    }
    if (all.length > 1) where[k] = { in: all.map(norm) }
    else if (v !== '')  where[k] = norm(v)
  }

  // b) JSON plano en ?filters={}
  const filtersRaw = url.searchParams.get('filters')
  if (filtersRaw) {
    try {
      const obj = JSON.parse(filtersRaw) as Record<string, unknown>
      for (const [k, v] of Object.entries(obj)) {
        if (v == null || v === '') continue
        if (Array.isArray(v)) where[k] = { in: v }
        else if (v === 'true' || v === 'false') where[k] = v === 'true'
        else if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v)) where[k] = Number(v)
        else where[k] = v
      }
    } catch {
      // ignore JSON malformado
    }
  }

  // 2) Búsqueda q: usar qFields si vienen; si no, default razonable por tabla
  const qFieldsParam = (url.searchParams.get('qFields') ?? '')
    .split(',').map(s => s.trim()).filter(Boolean)

  const DEFAULT_Q_FIELDS: Record<string, string[]> = {
    CfgMarcas: ['marca', 'keywords'],
    CfgRubros: ['rubro', 'condiciones', 'keywords'],
    CfgFormasPagos: ['forma_pago', 'descripcion'],
    CfgMonedas: ['moneda', 'moneda_des'],
    CfgSlider: ['titulo'],
    Productos: ['producto', 'descripcion'],
    ProductoFotos: ['epigrafe', 'foto'],
    ProductoVersiones: ['version', 'detalle'],
    ProductoEspecificaciones: ['categoria', 'especificaciones'],
    Pedidos: [
      'comprador_nombre', 'comprador_email', 'comprador_telefono',
      'direccion_envio', 'metodo_pago', 'estado'
    ],
  }

  const qFields = qFieldsParam.length
    ? qFieldsParam
    : (DEFAULT_Q_FIELDS[tableName] ?? [])

  if (q && qFields.length) {
    const like = { contains: q, mode: 'insensitive' as const }
    where.OR = qFields.map(f => ({ [f]: like }))
  }

  // 3) Orden con fallback (ya se envía como query param)

  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      sortDir,
      ...(q && { q }),
      ...(Object.keys(where).length > 0 && { filters: JSON.stringify(where) })
    })
    
    const response = await adminApi.get(`/admin/tables/${tableName}/records?${queryParams}`)
    return NextResponse.json(response)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error al leer datos' }, { status: 500 })
  }
}


/* ───────────────────────── POST (sin cambios funcionales) ───────────────────────── */
export async function POST(req: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName: resourceName } = await context.params
  const tableName = resourceToTable[resourceName]
  if (!tableName) {
    return NextResponse.json({ error: `Recurso "${resourceName}" no existe` }, { status: 404 })
  }

  const ct = req.headers.get('content-type') || ''
  let data: Record<string, any> = {}
  let file: Blob | null = null

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData()
    let fileField: string | null = null
    
    for (const [k, v] of form.entries()) {
      if (isFileField(k) && isFileLike(v)) {
        file = v
        fileField = k
      } else if (typeof v === 'string') {
        data[k] = /^\d+$/.test(v) ? Number(v) : v
      }
    }
    delete data.id
    normalizeBooleans(data)

    if (file && fileField) {
      const fileType = getFileTypeFromMime(file.type)
      const baseFolder = getFolderByFileType(fileType)
      const keyDir = (allFolderNames as Record<string, string>)[resourceName] || tableName.toLowerCase()
      
      let dir: string
      let thumbsDir: string
      
      if (fileType === 'image') {
        // Para imágenes: /public/images/{tabla}/
        dir = path.join(process.cwd(), 'public', baseFolder, keyDir)
        thumbsDir = path.join(dir, 'thumbs')
      } else {
        // Para videos/audio/docs: /public/uploads/media/ o /public/uploads/docs/
        dir = path.join(process.cwd(), 'public', baseFolder)
        thumbsDir = path.join(dir, 'thumbs')
      }
      
      // Crear directorios si no existen
      await fs.mkdir(dir, { recursive: true })
      await fs.mkdir(thumbsDir, { recursive: true })
      
      const hint = data.titulo ?? data.producto ?? tableName
      const slug = slugify(String(hint), { lower: true, strict: true })
      const buf = Buffer.from(await file.arrayBuffer())
      
      if (fileType === 'image') {
        // Procesar imagen con Sharp
        const name = `${slug}-${makeTimestamp()}.webp`
        const fullPath = path.join(dir, name)
        await sharp(buf).webp().toFile(fullPath)
        
        // Crear thumbnail
        const thumbPath = path.join(thumbsDir, name)
        await sharp(buf).resize(200).webp().toFile(thumbPath)
        
        data[fileField] = name
      } else if (fileType === 'video') {
        // Guardar video directamente
        const ext = path.extname((file as File).name || '.mp4')
        const baseName = `${slug}-${makeTimestamp()}`
        const name = `${baseName}${ext}`
        const fullPath = path.join(dir, name)
        await fs.writeFile(fullPath, buf)
        
        // Generar thumbnail del video de forma asíncrona
        const thumbName = `${baseName}.jpg`
        const thumbPath = path.join(thumbsDir, thumbName)
        
        // Importar función de generación de thumbnails
        const { generateVideoThumbnail } = await import('@/lib/thumbnailGenerator')
        
        // Generar thumbnail en background (no bloquear la respuesta)
        generateVideoThumbnail(fullPath, thumbPath, 200).catch(error => {
          console.error('Error generando thumbnail de video:', error)
        })
        
        data[fileField] = name
      } else if (fileType === 'audio') {
        // Guardar audio directamente
        const ext = path.extname((file as File).name || '.mp3')
        const name = `${slug}-${makeTimestamp()}${ext}`
        const fullPath = path.join(dir, name)
        await fs.writeFile(fullPath, buf)
        
        data[fileField] = name
      } else {
        // Archivo genérico
        const ext = path.extname((file as File).name || '.bin')
        const name = `${slug}-${makeTimestamp()}${ext}`
        const fullPath = path.join(dir, name)
        await fs.writeFile(fullPath, buf)
        
        data[fileField] = name
      }
    }
  } else {
    data = await req.json()
    delete data.id
    for (const k in data) {
      if (typeof data[k] === 'string' && /^\d+$/.test(data[k])) data[k] = Number(data[k])
    }
    normalizeBooleans(data)
  }

  try {
    const created = await adminApi.post(`/admin/tables/${tableName}/records`, data)
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 })
  }
}

/* ───────────────────────── PUT (update by ID from URL path) ───────────────────────── */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName: resourceName } = await context.params
  const tableName = resourceToTable[resourceName]
  if (!tableName) {
    return NextResponse.json({ error: `Recurso "${resourceName}" no existe` }, { status: 404 })
  }

  // Extraer ID de la URL path - asumiendo formato /api/admin/resources/TableName/id
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const idIndex = pathParts.findIndex(part => part === resourceName) + 1
  
  if (idIndex >= pathParts.length) {
    return NextResponse.json({ error: 'ID requerido para actualización' }, { status: 400 })
  }
  
  const id = pathParts[idIndex]

  try {
    // Verificar si el registro existe
    const existing = await adminApi.get(`/admin/tables/${tableName}/records/${id}`)
    if (!existing) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const ct = req.headers.get('content-type') || ''
    let data: Record<string, any> = {}
    let file: Blob | null = null
    const existingRecord = existing as Record<string, any>

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      let fileField: string | null = null
      
      for (const [k, v] of form.entries()) {
        if (isFileField(k) && isFileLike(v)) {
          file = v
          fileField = k
        } else if (typeof v === 'string') {
          data[k] = /^\d+$/.test(v) ? Number(v) : v
        }
      }
      delete data.id
      normalizeBooleans(data)

      if (file && fileField) {
        const fileType = getFileTypeFromMime(file.type)
        const baseFolder = getFolderByFileType(fileType)
        const keyDir = (allFolderNames as Record<string, string>)[resourceName] || tableName.toLowerCase()
        
        let dir: string
        let thumbsDir: string
        
        if (fileType === 'image') {
          // Para imágenes: /public/images/{tabla}/
          dir = path.join(process.cwd(), 'public', baseFolder, keyDir)
          thumbsDir = path.join(dir, 'thumbs')
        } else {
          // Para videos/audio/docs: /public/uploads/media/ o /public/uploads/docs/
          dir = path.join(process.cwd(), 'public', baseFolder)
          thumbsDir = path.join(dir, 'thumbs')
        }

        // Crear directorios si no existen
        await fs.mkdir(dir, { recursive: true })
        await fs.mkdir(thumbsDir, { recursive: true })

        // Eliminar archivo anterior si existe
        if (existingRecord[fileField]) {
          const oldFileName = existingRecord[fileField] as string
          await fs.rm(path.join(dir, oldFileName), { force: true }).catch(() => {})
          await fs.rm(path.join(thumbsDir, oldFileName), { force: true }).catch(() => {})
        }

        const hint = data.titulo ?? data.producto ?? tableName
        const slug = slugify(String(hint), { lower: true, strict: true })
        const buf = Buffer.from(await file.arrayBuffer())
        
        if (fileType === 'image') {
          // Procesar imagen con Sharp
          const name = `${slug}-${makeTimestamp()}.webp`
          const fullPath = path.join(dir, name)
          await sharp(buf).webp().toFile(fullPath)
          
          // Crear thumbnail
          const thumbPath = path.join(thumbsDir, name)
          await sharp(buf).resize(200).webp().toFile(thumbPath)
          
          data[fileField] = name
        } else if (fileType === 'video') {
          // Guardar video directamente
          const ext = path.extname((file as File).name || '.mp4')
          const baseName = `${slug}-${makeTimestamp()}`
          const name = `${baseName}${ext}`
          const fullPath = path.join(dir, name)
          await fs.writeFile(fullPath, buf)
          
          // Generar thumbnail del video de forma asíncrona
          const thumbName = `${baseName}.jpg`
          const thumbPath = path.join(thumbsDir, thumbName)
          
          const { generateVideoThumbnail } = await import('@/lib/thumbnailGenerator')
          generateVideoThumbnail(fullPath, thumbPath, 200).catch(error => {
            console.error('Error generando thumbnail de video:', error)
          })
          
          data[fileField] = name
        } else if (fileType === 'audio') {
          // Guardar audio directamente
          const ext = path.extname((file as File).name || '.mp3')
          const name = `${slug}-${makeTimestamp()}${ext}`
          const fullPath = path.join(dir, name)
          await fs.writeFile(fullPath, buf)
          
          data[fileField] = name
        } else {
          // Archivo genérico
          const ext = path.extname((file as File).name || '.bin')
          const name = `${slug}-${makeTimestamp()}${ext}`
          const fullPath = path.join(dir, name)
          await fs.writeFile(fullPath, buf)
          
          data[fileField] = name
        }
      }
    } else {
      data = await req.json()
      delete data.id
      for (const k in data) {
        if (typeof data[k] === 'string' && /^\d+$/.test(data[k])) data[k] = Number(data[k])
      }
      normalizeBooleans(data)
    }

    const result = await adminApi.put(`/admin/tables/${tableName}/records/${id}`, data)
    return NextResponse.json(result)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al actualizar registro' }, { status: 500 })
  }
}

/* ───────────────────────── DELETE (delete by ID from URL path) ───────────────────────── */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName: resourceName } = await context.params
  const tableName = resourceToTable[resourceName]
  if (!tableName) {
    return NextResponse.json({ error: `Recurso "${resourceName}" no existe` }, { status: 404 })
  }

  // Extraer ID de la URL path
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  const idIndex = pathParts.findIndex(part => part === resourceName) + 1
  
  if (idIndex >= pathParts.length) {
    return NextResponse.json({ error: 'ID requerido para eliminación' }, { status: 400 })
  }
  
  const id = pathParts[idIndex]

  try {
    const existing = await adminApi.get(`/admin/tables/${tableName}/records/${id}`)
    const existingRecord = existing as Record<string, any> | null

    // Eliminar archivos asociados si existen
    if (existingRecord) {
      for (const field in existingRecord) {
        if (isFileField(field) && existingRecord[field]) {
          const fileName = existingRecord[field] as string
          const fileType = getFileType(fileName)
          const baseFolder = getFolderByFileType(fileType)
          const keyDir = (allFolderNames as Record<string, string>)[resourceName] || tableName.toLowerCase()
          
          let dir: string
          if (fileType === 'image') {
            dir = path.join(process.cwd(), 'public', baseFolder, keyDir)
          } else {
            dir = path.join(process.cwd(), 'public', baseFolder)
          }
          const thumbsDir = path.join(dir, 'thumbs')

          // Eliminar archivo principal
          await fs.rm(path.join(dir, fileName), { force: true }).catch(() => {})

          // Eliminar thumbnail
          if (fileType === 'video') {
            const thumbName = `${path.parse(fileName).name}.jpg`
            await fs.rm(path.join(thumbsDir, thumbName), { force: true }).catch(() => {})
          } else {
            // Para imágenes (y otros tipos si aplica), el thumbnail tiene el mismo nombre
            await fs.rm(path.join(thumbsDir, fileName), { force: true }).catch(() => {})
          }
        }
      }
    }

    await adminApi.delete(`/admin/tables/${tableName}/records/${id}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 })
  }
}
