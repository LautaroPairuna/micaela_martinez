// fileProcessingService.ts
import 'server-only'
import fs from 'fs/promises'
import path from 'path'
import slugify from 'slugify'
import sharp from 'sharp'
import { generateVideoThumbnail } from '@/lib/thumbnailGenerator'
import { videoOptimizationService, DEFAULT_VIDEO_OPTIONS } from './VideoOptimizationService'
import { folderOrganizationService } from './FolderOrganizationService'

import {
  generateImageFileName,
  generateVideoFileName,
  ImageEntityType,
} from '@/lib/utils/fileNaming'

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other'

export interface ProcessedFile {
  filename: string
  originalName: string
  size: number
  mimeType: string
  fileType: FileType
  path: string
  thumbnailPath?: string
  publicUrl: string
  thumbnailUrl?: string
}

export interface FileProcessingOptions {
  tableName: string
  fieldName: string
  titleHint?: string
  recordId?: string
  useSlugFromTitle?: boolean
  clientTimestamp?: number
  isEdit?: boolean
  maxImageWidth?: number
  maxImageHeight?: number
  imageQuality?: number
  thumbnailSize?: number
  videoQuality?: 'high' | 'medium' | 'low'
  generateThumbnail?: boolean

  /** 👇 NUEVO: instrucción del cliente y nombre previo si lo hay */
  intent?: 'attach' | 'replace'
  previousFilename?: string
}

const DEFAULT_OPTIONS: Partial<FileProcessingOptions> = {
  maxImageWidth: 1920,
  maxImageHeight: 1080,
  imageQuality: 85,
  thumbnailSize: 200,
  videoQuality: 'medium',
  generateThumbnail: true,
  intent: 'attach',
}

const MIME_TYPE_MAP: Record<string, FileType> = {
  'image/jpeg': 'image', 'image/jpg': 'image', 'image/png': 'image', 'image/gif': 'image',
  'image/webp': 'image', 'image/svg+xml': 'image', 'image/bmp': 'image', 'image/tiff': 'image',
  'video/mp4': 'video', 'video/webm': 'video', 'video/ogg': 'video', 'video/avi': 'video',
  'video/mov': 'video', 'video/wmv': 'video', 'video/flv': 'video', 'video/mkv': 'video', 'video/3gp': 'video',
  'audio/mp3': 'audio', 'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/ogg': 'audio',
  'audio/aac': 'audio', 'audio/m4a': 'audio', 'audio/flac': 'audio', 'audio/wma': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document', 'text/rtf': 'document',
}

const EXTENSION_MAP: Record<string, FileType> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', tiff: 'image', tif: 'image',
  mp4: 'video', webm: 'video', ogv: 'video', avi: 'video', mov: 'video', wmv: 'video', flv: 'video', mkv: 'video', '3gp': 'video', m4v: 'video', mpg: 'video', mpeg: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', oga: 'audio', aac: 'audio', m4a: 'audio', flac: 'audio', wma: 'audio',
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document', xlsx: 'document', ppt: 'document', pptx: 'document',
  txt: 'document', rtf: 'document', odt: 'document', ods: 'document', odp: 'document',
}

function getFileTypeFromMime(mimeType: string): FileType {
  return MIME_TYPE_MAP[mimeType.toLowerCase()] || 'other'
}
function getFileTypeFromExtension(filename: string): FileType {
  const ext = path.extname(filename).toLowerCase().slice(1)
  return EXTENSION_MAP[ext] || 'other'
}
function getBaseFolder(fileType: FileType): string {
  switch (fileType) {
    case 'image': return 'images'
    case 'video':
    case 'audio': return 'uploads/media'
    case 'document': return 'uploads/docs'
    default: return 'uploads/files'
  }
}
function makeTimestamp(clientTimestamp?: number): string {
  return (clientTimestamp || Date.now()).toString()
}

function getDefaultExtension(fileType: FileType): string {
  switch (fileType) {
    case 'video': return '.mp4'
    case 'audio': return '.mp3'
    case 'document': return '.pdf'
    default: return '.bin'
  }
}

export class FileProcessingService {
  private static instance: FileProcessingService
  static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) FileProcessingService.instance = new FileProcessingService()
    return FileProcessingService.instance
  }

  async processFile(file: File, options: FileProcessingOptions): Promise<ProcessedFile> {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    console.log('📋 LOG SUBIDA: Iniciando procesamiento de archivo', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      tableName: opts.tableName,
      fieldName: opts.fieldName,
      recordId: opts.recordId || 'NUEVO',
      intent: opts.intent,
    })

    const fileType = getFileTypeFromMime(file.type) || getFileTypeFromExtension(file.name)
    this.validateFile(file, fileType)

    let filename: string
    try {
      const extension = path.extname(file.name)
      const isEdit = opts.isEdit || false
      const isReplace = opts.intent === 'replace'

      if (fileType === 'video') {
        if (isReplace) {
          // 1) Si el backend nos pasó el nombre previo, lo reutilizamos (sobrescribe)
          if (opts.previousFilename) {
            filename = opts.previousFilename
          } else if (opts.recordId && opts.tableName) {
            // 2) Nombre determinístico por slug (sin timestamp) para overwriting
            filename = await generateVideoFileName(
              opts.tableName,
              opts.recordId,
              extension,
              /*isEdit*/ false,
              opts.titleHint || opts.tableName,
              /*deterministic*/ true
            )
          } else {
            // 3) Fallback determinístico con titleHint
            const base = slugify(opts.titleHint || opts.tableName || 'video', { lower: true, strict: true })
            filename = `${base}${extension}`
          }
        } else {
          // attach → nombre único (con timestamp)
          if (!opts.recordId || !opts.tableName) {
            filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, extension, opts.clientTimestamp)
          } else {
            filename = await generateVideoFileName(
              opts.tableName,
              opts.recordId,
              extension,
              isEdit,
              opts.titleHint || opts.tableName,
              /*deterministic*/ false
            )
          }
        }
      } else if (fileType === 'image') {
        const webpExtension = '.webp'
        if (isReplace) {
          if (opts.previousFilename) {
            filename = opts.previousFilename.endsWith('.webp')
              ? opts.previousFilename
              : opts.previousFilename.replace(/\.[^.]+$/, '') + '.webp'
          } else if (opts.recordId && opts.tableName) {
            filename = await generateImageFileName(
              opts.tableName,
              opts.recordId,
              webpExtension,
              /*isEdit*/ false,
              /*deterministic*/ true,
              opts.titleHint
            )
          } else {
            const base = slugify(opts.titleHint || opts.tableName || 'imagen', { lower: true, strict: true })
            filename = `${base}.webp`
          }
        } else {
          if ((!opts.recordId || !opts.tableName) && !opts.useSlugFromTitle) {
            filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, webpExtension, opts.clientTimestamp)
          } else if (opts.useSlugFromTitle && opts.titleHint) {
            const slug = slugify(opts.titleHint, { lower: true, strict: true })
            const timestamp = opts.clientTimestamp || Date.now()
            filename = `${slug}-${timestamp}${webpExtension}`
          } else {
            filename = await generateImageFileName(
              opts.tableName,
              opts.recordId!,
              webpExtension,
              isEdit,
              /*deterministic*/ false,
              opts.titleHint
            )
          }
        }
      } else {
        filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, extension, opts.clientTimestamp)
      }
    } catch (error) {
      console.error('Error generating filename, using fallback:', error)
      filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, path.extname(file.name), opts.clientTimestamp)
    }

    const folderStructure = folderOrganizationService.getFolderStructure(fileType, opts.tableName, opts.recordId)
    await folderOrganizationService.ensureFolderStructure(folderStructure)
    const dir = folderStructure.fullPath
    const filePath = path.join(dir, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    let thumbnailPath: string | undefined

    switch (fileType) {
      case 'image':
        await this.processImage(buffer, filePath, opts)
        if (opts.generateThumbnail) {
          thumbnailPath = await this.createImageThumbnail(buffer, dir, filename, opts.thumbnailSize!)
        }
        break
      case 'video':
        await this.processVideo(buffer, filePath, opts)
        if (opts.generateThumbnail) {
          thumbnailPath = await this.createVideoThumbnail(filePath, dir, filename, opts.thumbnailSize!)
        }
        break
      default:
        await fs.writeFile(filePath, buffer)
        break
    }

    const publicUrl = `${folderStructure.publicUrl}/${filename}`.replace(/\/+/g, '/')
    const thumbnailUrl = thumbnailPath ? `${folderStructure.thumbsUrl}/${path.basename(thumbnailPath)}`.replace(/\/+/g, '/') : undefined

    return {
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      fileType,
      path: filePath,
      thumbnailPath,
      publicUrl,
      thumbnailUrl,
    }
  }

  private getImageEntityType(tableName: string): ImageEntityType | null {
    const t = tableName.toLowerCase()
    if (t.startsWith('marca')) return 'marca'
    if (t.startsWith('categoria')) return 'categoria'
    if (t.startsWith('producto')) return 'producto'
    return null
  }

  private generateFallbackFilename(hint: string | undefined, fileType: FileType, originalExt: string, clientTimestamp?: number): string {
    const slug = slugify(hint || 'archivo', { lower: true, strict: true })
    const timestamp = makeTimestamp(clientTimestamp)
    if (fileType === 'image') return `${slug}-${timestamp}.webp`
    const ext = originalExt || getDefaultExtension(fileType)
    return `${slug}-${timestamp}${ext}`
  }

  async deleteFile(filename: string, tableName: string, recordId?: string): Promise<void> {
    if (!filename) return
    const fileType = getFileTypeFromExtension(filename)
    
    // Usar el servicio de organización de carpetas para obtener la estructura correcta
    const folderStructure = folderOrganizationService.getFolderStructure(fileType, tableName, recordId)
    const filePath = path.join(folderStructure.fullPath, filename)
    
    console.log('🗑️ Eliminando archivo:', filePath)
    
    // Eliminar el archivo principal
    await fs.rm(filePath, { force: true }).catch((err) => {
      console.error(`Error al eliminar archivo ${filePath}:`, err)
    })
    
    // Si es imagen o video, eliminar también las miniaturas
    if (fileType === 'image' || fileType === 'video') {
      const baseName = path.basename(filename, path.extname(filename))
      
      // Asegurarse de que thumbsPath existe
      if (folderStructure.thumbsPath) {
        // Para imágenes, intentar eliminar con extensión .webp
        if (fileType === 'image') {
          await fs.rm(path.join(folderStructure.thumbsPath, `${baseName}.webp`), { force: true })
            .catch(() => {})
          await fs.rm(path.join(folderStructure.thumbsPath, filename), { force: true })
            .catch(() => {})
        }
        
        // Para videos, intentar eliminar con extensión .jpg (formato estándar de miniaturas de video)
        if (fileType === 'video') {
          await fs.rm(path.join(folderStructure.thumbsPath, `${baseName}.jpg`), { force: true })
            .catch((err) => {
              console.error(`Error al eliminar miniatura de video ${baseName}.jpg:`, err)
            })
        }
      }
    }
    
    console.log('✅ Archivo eliminado correctamente:', filename)
  }

  private validateFile(file: File, fileType: FileType): void {
    const maxSize = 300 * 1024 * 1024
    if (file.size > maxSize) throw new Error(`Archivo demasiado grande. Máximo permitido: ${maxSize / 1024 / 1024}MB`)
    if (fileType === 'other') throw new Error(`Tipo de archivo no soportado: ${file.type}`)
    if (fileType === 'image' && file.size > 50 * 1024 * 1024) throw new Error('Imagen demasiado grande. Máximo: 50MB')
    if (fileType === 'video' && file.size > 300 * 1024 * 1024) throw new Error('Video demasiado grande. Máximo: 300MB')
    if (fileType === 'audio' && file.size > 100 * 1024 * 1024) throw new Error('Audio demasiado grande. Máximo: 100MB')
    if (fileType === 'document' && file.size > 100 * 1024 * 1024) throw new Error('Documento demasiado grande. Máximo: 100MB')
  }

  private async processImage(buffer: Buffer, outputPath: string, options: FileProcessingOptions): Promise<void> {
    let out = outputPath
    if (!out.toLowerCase().endsWith('.webp')) out = out.replace(/\.[^/.]+$/, '') + '.webp'
    let processor = sharp(buffer)
    if (options.maxImageWidth || options.maxImageHeight) {
      processor = processor.resize(options.maxImageWidth, options.maxImageHeight, { fit: 'inside', withoutEnlargement: true })
    }
    await processor.webp({ quality: options.imageQuality || 90 }).toFile(out)
  }

  private async processVideo(buffer: Buffer, outputPath: string, options: FileProcessingOptions): Promise<void> {
    const tempPath = `${outputPath}.temp`
    await fs.writeFile(tempPath, buffer)

    try {
      const ffmpegAvailable = await videoOptimizationService.checkFFmpegAvailability()
      if (ffmpegAvailable) {
        const videoOptions = DEFAULT_VIDEO_OPTIONS[options.videoQuality || 'medium']
        await videoOptimizationService.optimizeVideo(tempPath, outputPath, videoOptions) // ffmpeg usa -y (overwrite)
        await fs.unlink(tempPath).catch(() => {})
      } else {
        await fs.rename(tempPath, outputPath).catch(async () => {
          await fs.writeFile(outputPath, buffer)
        })
      }
    } catch (error) {
      console.error('❌ Error procesando video:', error)
      try {
        await fs.rename(tempPath, outputPath)
      } catch {
        await fs.writeFile(outputPath, buffer)
      }
    }
  }

  private async createImageThumbnail(buffer: Buffer, dir: string, filename: string, size: number): Promise<string> {
    const thumbsDir = path.join(dir, 'thumbs')
    await fs.mkdir(thumbsDir, { recursive: true })
    const thumbPath = path.join(thumbsDir, filename)
    await sharp(buffer).resize(size, size, { fit: 'cover', position: 'center' }).webp({ quality: 80 }).toFile(thumbPath)
    return thumbPath
  }

  private async createVideoThumbnail(videoPath: string, dir: string, filename: string, size: number): Promise<string> {
    const thumbsDir = path.join(dir, 'thumbs')
    await fs.mkdir(thumbsDir, { recursive: true })
    const baseName = path.basename(filename, path.extname(filename))
    const thumbName = `${baseName}.jpg`
    const thumbPath = path.join(thumbsDir, thumbName)
    generateVideoThumbnail(videoPath, thumbPath, size).catch((e) => console.error('Error generando thumbnail de video:', e))
    return thumbPath
  }

  private generatePublicUrl(baseFolder: string, tableFolder: string, filename: string): string {
    return `/${baseFolder}/${tableFolder}/${filename}`.replace(/\/+/g, '/')
  }
  private generateThumbnailUrl(baseFolder: string, tableFolder: string, thumbFilename: string): string {
    return `/${baseFolder}/${tableFolder}/thumbs/${thumbFilename}`.replace(/\/+/g, '/')
  }
}

export const fileProcessingService = FileProcessingService.getInstance()
export { getFileTypeFromMime, getFileTypeFromExtension, getBaseFolder }
