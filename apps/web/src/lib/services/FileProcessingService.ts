import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import sharp from 'sharp';
import { generateVideoThumbnail } from '@/lib/thumbnailGenerator';
import { allFolderNames } from '@/lib/adminConstants';
import { videoOptimizationService, DEFAULT_VIDEO_OPTIONS } from './VideoOptimizationService';
import { folderOrganizationService } from './FolderOrganizationService';
import { databaseSlugService } from './DatabaseSlugService';
import { generateImageFileName, generateVideoFileName, ImageEntityType } from '@/lib/utils/fileNaming';
// Note: This service runs on the frontend, so we don't import Prisma directly
// Instead, we'll make API calls when we need database operations

/* ─────────────────────────────────────────────────────────────────
   TIPOS Y CONFIGURACIÓN
   ───────────────────────────────────────────────────────────────── */

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface ProcessedFile {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  fileType: FileType;
  path: string;
  thumbnailPath?: string;
  publicUrl: string;
  thumbnailUrl?: string;
}

export interface FileProcessingOptions {
  tableName: string;
  fieldName: string;
  titleHint?: string;
  recordId?: string; // ID del registro para obtener datos específicos como slug
  useSlugFromTitle?: boolean; // Usar slug del título cuando no hay recordId
  clientTimestamp?: number; // Timestamp del dispositivo del usuario
  isEdit?: boolean; // Indica si es una edición de un campo existente
  maxImageWidth?: number;
  maxImageHeight?: number;
  imageQuality?: number;
  thumbnailSize?: number;
  videoQuality?: 'high' | 'medium' | 'low';
  generateThumbnail?: boolean;
}

const DEFAULT_OPTIONS: Partial<FileProcessingOptions> = {
  maxImageWidth: 1920,
  maxImageHeight: 1080,
  imageQuality: 85,
  thumbnailSize: 200,
  videoQuality: 'medium',
  generateThumbnail: true,
};

/* ─────────────────────────────────────────────────────────────────
   DETECCIÓN DE TIPOS DE ARCHIVO
   ───────────────────────────────────────────────────────────────── */

const MIME_TYPE_MAP: Record<string, FileType> = {
  // Imágenes
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  
  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/avi': 'video',
  'video/mov': 'video',
  'video/wmv': 'video',
  'video/flv': 'video',
  'video/mkv': 'video',
  'video/3gp': 'video',
  
  // Audio
  'audio/mp3': 'audio',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/aac': 'audio',
  'audio/m4a': 'audio',
  'audio/flac': 'audio',
  'audio/wma': 'audio',
  
  // Documentos
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/rtf': 'document',
};

const EXTENSION_MAP: Record<string, FileType> = {
  // Imágenes
  'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
  'webp': 'image', 'svg': 'image', 'bmp': 'image', 'tiff': 'image', 'tif': 'image',
  
  // Videos
  'mp4': 'video', 'webm': 'video', 'ogv': 'video',
  'avi': 'video', 'mov': 'video', 'wmv': 'video', 'flv': 'video',
  'mkv': 'video', '3gp': 'video', 'm4v': 'video', 'mpg': 'video', 'mpeg': 'video',
  
  // Audio
  'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'oga': 'audio',
  'aac': 'audio', 'm4a': 'audio', 'flac': 'audio', 'wma': 'audio',
  
  // Documentos
  'pdf': 'document', 'doc': 'document', 'docx': 'document',
  'xls': 'document', 'xlsx': 'document', 'ppt': 'document', 'pptx': 'document',
  'txt': 'document', 'rtf': 'document', 'odt': 'document', 'ods': 'document', 'odp': 'document',
};

/* ─────────────────────────────────────────────────────────────────
   UTILIDADES
   ───────────────────────────────────────────────────────────────── */

function getFileTypeFromMime(mimeType: string): FileType {
  return MIME_TYPE_MAP[mimeType.toLowerCase()] || 'other';
}

function getFileTypeFromExtension(filename: string): FileType {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return EXTENSION_MAP[ext] || 'other';
}

function getBaseFolder(fileType: FileType): string {
  switch (fileType) {
    case 'image': return 'images';
    case 'video': return 'uploads/media';
    case 'audio': return 'uploads/media';
    case 'document': return 'uploads/docs';
    default: return 'uploads/files';
  }
}

function makeTimestamp(clientTimestamp?: number): string {
  return (clientTimestamp || Date.now()).toString();
}

// Función para obtener el slug del producto desde la API
async function getProductSlug(productId: string): Promise<string | null> {
  try {
    // Get auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      console.warn('No auth token found for product slug lookup');
      return null;
    }

    const response = await fetch(`/api/admin/tables/Producto/records/${productId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`);
    }

    const product = await response.json();
    return product?.slug || null;
  } catch (error) {
    console.error('Error obteniendo slug del producto:', error);
    return null;
  }
}

// Función para generar nombre de archivo con timestamp y fecha
function generateFilename(hint: string, fileType: FileType, originalExt?: string, includeDateTime = false, clientTimestamp?: number): string {
  const slug = slugify(hint, { lower: true, strict: true });
  const timestamp = makeTimestamp(clientTimestamp);
  
  // Si se requiere incluir fecha y hora, agregar formato legible usando el timestamp del cliente
  const dateForSuffix = clientTimestamp ? new Date(clientTimestamp) : new Date();
  const dateTimeSuffix = includeDateTime ? `-${dateForSuffix.toISOString().slice(0, 19).replace(/[T:]/g, '-')}` : '';
  
  // Para imágenes, siempre usar .webp
  if (fileType === 'image') {
    return `${slug}-${timestamp}${dateTimeSuffix}.webp`;
  }
  
  // Para otros tipos, mantener extensión original o usar default
  const ext = originalExt || getDefaultExtension(fileType);
  return `${slug}-${timestamp}${dateTimeSuffix}${ext}`;
}

function getDefaultExtension(fileType: FileType): string {
  switch (fileType) {
    case 'video': return '.mp4';
    case 'audio': return '.mp3';
    case 'document': return '.pdf';
    default: return '.bin';
  }
}

/* ─────────────────────────────────────────────────────────────────
   SERVICIO PRINCIPAL
   ───────────────────────────────────────────────────────────────── */

export class FileProcessingService {
  private static instance: FileProcessingService;
  
  static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  /**
   * Procesa un archivo subido y lo guarda en el sistema
   */
  async processFile(
    file: File,
    options: FileProcessingOptions
  ): Promise<ProcessedFile> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    console.log('📋 LOG SUBIDA: Iniciando procesamiento de archivo', {
      originalName: file.name,
      size: file.size,
      type: file.type,
      tableName: opts.tableName,
      fieldName: opts.fieldName,
      recordId: opts.recordId || 'NUEVO',
      useSlugFromTitle: opts.useSlugFromTitle
    });
    
    // Detectar tipo de archivo
    const fileType = getFileTypeFromMime(file.type) || getFileTypeFromExtension(file.name);
    
    // Validar archivo
    this.validateFile(file, fileType);
    
    // Generar nombre usando la nueva lógica de renombrado basada en slugs
    let filename: string;
    
    try {
      const extension = path.extname(file.name);
      
      // Determinar si es una edición (si ya existe un archivo en el campo)
      const isEdit = opts.isEdit || false;
      
      if (fileType === 'video') {
        // Para videos, usar el nuevo sistema simplificado
        console.log('🎬 Processing video with options:', { recordId: opts.recordId, tableName: opts.tableName });
        
        if (!opts.recordId || !opts.tableName) {
          console.warn('⚠️ No recordId or tableName provided for video file, using fallback naming');
          filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, extension, opts.clientTimestamp);
        } else {
          console.log('✅ Using slug-based naming for video');
          filename = await generateVideoFileName(opts.tableName, opts.recordId, extension, isEdit);
        }
      } else if (fileType === 'image') {
        // Para imágenes, usar el nuevo sistema simplificado y SIEMPRE usar .webp
        console.log('🖼️ Processing image with options:', { recordId: opts.recordId, tableName: opts.tableName, isEdit, useSlugFromTitle: opts.useSlugFromTitle });
        
        // Forzar extensión .webp para todas las imágenes
        const webpExtension = '.webp';
        
        if ((!opts.recordId || !opts.tableName) && !opts.useSlugFromTitle) {
          console.warn('⚠️ No recordId/tableName or useSlugFromTitle provided for image file, using fallback naming');
          filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, webpExtension, opts.clientTimestamp);
        } else if (opts.useSlugFromTitle && opts.titleHint) {
          console.log('✅ Using slug from titleHint for image');
          // Generar slug del titleHint para nuevos registros
          const slug = slugify(opts.titleHint, { lower: true, strict: true });
          const timestamp = opts.clientTimestamp || Date.now();
          filename = `${slug}-${timestamp}${webpExtension}`;
          console.log('📋 LOG SUBIDA: Nombre generado con slug del título:', { 
            titleHint: opts.titleHint,
            slug,
            filename
          });
        } else {
          console.log('✅ Using slug-based naming for image');
          filename = await generateImageFileName(opts.tableName, opts.recordId!, webpExtension, isEdit);
          console.log('📋 LOG SUBIDA: Nombre generado con slug del registro:', { 
            tableName: opts.tableName,
            recordId: opts.recordId,
            filename
          });
        }
      } else {
        // Para otros tipos de archivo, usar el sistema de naming anterior
        filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, extension, opts.clientTimestamp);
      }
    } catch (error) {
      console.error('Error generating filename with slug-based naming, using fallback:', error);
      filename = this.generateFallbackFilename(opts.titleHint || opts.tableName, fileType, path.extname(file.name), opts.clientTimestamp);
    }
    
    const folderStructure = folderOrganizationService.getFolderStructure(fileType, opts.tableName, opts.recordId);
    await folderOrganizationService.ensureFolderStructure(folderStructure);
    const dir = folderStructure.fullPath;
    const filePath = path.join(dir, filename);
    
    // Procesar archivo según tipo
    const buffer = Buffer.from(await file.arrayBuffer());
    let thumbnailPath: string | undefined;
    
    switch (fileType) {
      case 'image':
        await this.processImage(buffer, filePath, opts);
        if (opts.generateThumbnail) {
          thumbnailPath = await this.createImageThumbnail(buffer, dir, filename, opts.thumbnailSize!);
        }
        break;
        
      case 'video':
        await this.processVideo(buffer, filePath, opts);
        if (opts.generateThumbnail) {
          thumbnailPath = await this.createVideoThumbnail(filePath, dir, filename, opts.thumbnailSize!);
        }
        break;
        
      case 'audio':
      case 'document':
      case 'other':
      default:
        await fs.writeFile(filePath, buffer);
        break;
    }
    
    // Generar URLs públicas
    const publicUrl = `${folderStructure.publicUrl}/${filename}`.replace(/\/+/g, '/');
    const thumbnailUrl = thumbnailPath ? `${folderStructure.thumbsUrl}/${path.basename(thumbnailPath)}`.replace(/\/+/g, '/') : undefined;
    
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
    };
  }

  /**
   * Elimina un archivo y su thumbnail del sistema
   */
  /**
   * Determina el tipo de entidad para imágenes basado en el nombre de la tabla
   */
  private getImageEntityType(tableName: string): ImageEntityType | null {
    const normalizedTableName = tableName.toLowerCase();
    
    switch (normalizedTableName) {
      case 'marca':
      case 'marcas':
        return 'marca';
      
      case 'categoria':
      case 'categorias':
        return 'categoria';
      
      case 'producto':
      case 'productos':
        return 'producto';
      
      default:
        return null;
    }
  }

  /**
   * Genera un nombre de archivo usando el sistema anterior como fallback
   */
  private generateFallbackFilename(hint: string, fileType: FileType, originalExt: string, clientTimestamp?: number): string {
    const slug = slugify(hint, { lower: true, strict: true });
    const timestamp = makeTimestamp(clientTimestamp);
    
    // Para imágenes, siempre usar .webp
    if (fileType === 'image') {
      return `${slug}-${timestamp}.webp`;
    }
    
    // Para otros tipos, mantener extensión original o usar default
    const ext = originalExt || getDefaultExtension(fileType);
    return `${slug}-${timestamp}${ext}`;
  }

  async deleteFile(filename: string, tableName: string): Promise<void> {
    if (!filename) return;
    
    console.log('🗑️ [DELETE] Iniciando eliminación de archivo:', { filename, tableName });
    
    const fileType = getFileTypeFromExtension(filename);
    const baseFolder = getBaseFolder(fileType);
    const tableFolder = (allFolderNames as Record<string, string>)[tableName] || tableName.toLowerCase();
    
    const dir = path.join(process.cwd(), 'public', baseFolder, tableFolder);
    const filePath = path.join(dir, filename);
    
    console.log('🗑️ [DELETE] Rutas calculadas:', {
      fileType,
      baseFolder,
      tableFolder,
      dir,
      filePath
    });
    
    // Eliminar archivo principal
    try {
      await fs.rm(filePath, { force: true });
      console.log('✅ [DELETE] Archivo principal eliminado:', filePath);
    } catch (error) {
      console.warn('⚠️ [DELETE] Error eliminando archivo principal:', error);
    }
    
    // Eliminar thumbnail si existe
    const thumbsDir = path.join(dir, 'thumbs');
    
    // Para archivos que originalmente eran JPG pero se guardaron como WebP
    const baseName = path.basename(filename, path.extname(filename));
    const webpThumbPath = path.join(thumbsDir, baseName + '.webp');
    const originalThumbPath = path.join(thumbsDir, filename); // Con extensión original
    
    console.log('🗑️ [DELETE] Thumbnail info:', {
      thumbsDir,
      baseName,
      webpThumbPath,
      originalThumbPath
    });
    
    // Intentar eliminar thumbnail WebP (formato actual)
    try {
      await fs.rm(webpThumbPath, { force: true });
      console.log('✅ [DELETE] Thumbnail WebP eliminado:', webpThumbPath);
    } catch (error) {
      console.warn('⚠️ [DELETE] Error eliminando thumbnail WebP:', error);
    }
    
    // También intentar eliminar con el nombre original por compatibilidad
    try {
      await fs.rm(originalThumbPath, { force: true });
      console.log('✅ [DELETE] Thumbnail original eliminado:', originalThumbPath);
    } catch (error) {
      console.warn('⚠️ [DELETE] Error eliminando thumbnail original:', error);
    }
    
    // Si el archivo original era JPG, también intentar eliminar thumbnail JPG
    if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) {
      const jpgThumbPath = path.join(thumbsDir, baseName + '.jpg');
      try {
        await fs.rm(jpgThumbPath, { force: true });
        console.log('✅ [DELETE] Thumbnail JPG eliminado:', jpgThumbPath);
      } catch (error) {
        console.warn('⚠️ [DELETE] Error eliminando thumbnail JPG:', error);
      }
    }
  }

  /**
   * Valida un archivo antes de procesarlo
   */
  private validateFile(file: File, fileType: FileType): void {
    // Validar tamaño (300MB máximo)
    const maxSize = 300 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Archivo demasiado grande. Máximo permitido: ${maxSize / 1024 / 1024}MB`);
    }
    
    // Validar tipo
    if (fileType === 'other') {
      throw new Error(`Tipo de archivo no soportado: ${file.type}`);
    }
    
    // Validaciones específicas por tipo
    switch (fileType) {
      case 'image':
        if (file.size > 50 * 1024 * 1024) { // 50MB para imágenes
          throw new Error('Imagen demasiado grande. Máximo: 50MB');
        }
        break;
        
      case 'video':
        if (file.size > 300 * 1024 * 1024) { // 300MB para videos
          throw new Error('Video demasiado grande. Máximo: 300MB');
        }
        break;
        
      case 'audio':
        if (file.size > 100 * 1024 * 1024) { // 100MB para audio
          throw new Error('Audio demasiado grande. Máximo: 100MB');
        }
        break;
        
      case 'document':
        if (file.size > 100 * 1024 * 1024) { // 100MB para documentos
          throw new Error('Documento demasiado grande. Máximo: 100MB');
        }
        break;
    }
  }

  /**
   * Procesa una imagen: redimensiona y convierte a WebP
   */
  private async processImage(
    buffer: Buffer,
    outputPath: string,
    options: FileProcessingOptions
  ): Promise<void> {
    console.log('🖼️ Procesando imagen, ruta de salida:', outputPath);
    
    // Asegurarse que la ruta de salida termine en .webp
    if (!outputPath.toLowerCase().endsWith('.webp')) {
      outputPath = outputPath.replace(/\.[^/.]+$/, '') + '.webp';
      console.log('🔄 Corrigiendo extensión a WebP:', outputPath);
    }
    
    let processor = sharp(buffer);
    
    // Redimensionar si es necesario
    if (options.maxImageWidth || options.maxImageHeight) {
      processor = processor.resize(options.maxImageWidth, options.maxImageHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // Forzar conversión a WebP con calidad alta si no se especifica
    await processor
      .webp({ quality: options.imageQuality || 90 })
      .toFile(outputPath);
  }

  /**
   * Procesa un video: lo optimiza con FFmpeg si está disponible
   */
  private async processVideo(
    buffer: Buffer,
    outputPath: string,
    options: FileProcessingOptions
  ): Promise<void> {
    // Primero guardamos el archivo temporal
    const tempPath = `${outputPath}.temp`;
    await fs.writeFile(tempPath, buffer);

    try {
      // Verificar si FFmpeg está disponible
      const ffmpegAvailable = await videoOptimizationService.checkFFmpegAvailability();
      
      if (ffmpegAvailable) {
        console.log('🎬 Optimizando video con FFmpeg...');
        
        // Obtener configuración de optimización
        const videoOptions = DEFAULT_VIDEO_OPTIONS[options.videoQuality || 'medium'];
        
        // Optimizar el video
        await videoOptimizationService.optimizeVideo(tempPath, outputPath, videoOptions);
        
        // Eliminar archivo temporal
        await fs.unlink(tempPath).catch(() => {});
        
        console.log('✅ Video optimizado exitosamente');
      } else {
        console.warn('⚠️ FFmpeg no disponible, guardando video sin optimizar');
        
        // Si FFmpeg no está disponible, solo movemos el archivo
        await fs.rename(tempPath, outputPath);
      }
    } catch (error) {
      console.error('❌ Error procesando video:', error);
      
      // En caso de error, guardar el archivo sin optimizar
      try {
        await fs.rename(tempPath, outputPath);
      } catch {
        // Si falla el rename, escribir directamente
        await fs.writeFile(outputPath, buffer);
      }
    }
  }

  /**
   * Crea thumbnail de imagen
   */
  private async createImageThumbnail(
    buffer: Buffer,
    dir: string,
    filename: string,
    size: number
  ): Promise<string> {
    const thumbsDir = path.join(dir, 'thumbs');
    await fs.mkdir(thumbsDir, { recursive: true });
    
    const thumbPath = path.join(thumbsDir, filename);
    
    await sharp(buffer)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(thumbPath);
    
    return thumbPath;
  }

  /**
   * Crea thumbnail de video (asíncrono)
   */
  private async createVideoThumbnail(
    videoPath: string,
    dir: string,
    filename: string,
    size: number
  ): Promise<string> {
    const thumbsDir = path.join(dir, 'thumbs');
    await fs.mkdir(thumbsDir, { recursive: true });
    
    const baseName = path.basename(filename, path.extname(filename));
    const thumbName = `${baseName}.jpg`;
    const thumbPath = path.join(thumbsDir, thumbName);
    
    // Generar thumbnail en background
    generateVideoThumbnail(videoPath, thumbPath, size).catch(error => {
      console.error('Error generando thumbnail de video:', error);
    });
    
    return thumbPath;
  }

  /**
   * Genera URL pública para un archivo
   */
  private generatePublicUrl(baseFolder: string, tableFolder: string, filename: string): string {
    return `/${baseFolder}/${tableFolder}/${filename}`.replace(/\/+/g, '/');
  }

  /**
   * Genera URL pública para un thumbnail
   */
  private generateThumbnailUrl(baseFolder: string, tableFolder: string, thumbFilename: string): string {
    return `/${baseFolder}/${tableFolder}/thumbs/${thumbFilename}`.replace(/\/+/g, '/');
  }
}

/* ─────────────────────────────────────────────────────────────────
   EXPORTACIONES
   ───────────────────────────────────────────────────────────────── */

export const fileProcessingService = FileProcessingService.getInstance();

// Funciones de utilidad exportadas
export {
  getFileTypeFromMime,
  getFileTypeFromExtension,
  getBaseFolder,
};