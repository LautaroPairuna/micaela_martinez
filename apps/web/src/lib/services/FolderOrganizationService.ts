import 'server-only';
import fs from 'fs/promises';
import { mkdirSync } from 'fs';
import path from 'path';
import { FileType } from './FileProcessingService';

export interface FolderStructure {
  baseFolder: string;
  tableFolder: string;
  fullPath: string;
  publicUrl: string;
  thumbsPath?: string;
  thumbsUrl?: string;
}

type StorageFolderReport = {
  size: number;
  sizeFormatted: string;
  fileCount: number;
  path?: string;
  error?: string;
};

export class FolderOrganizationService {
  private static instance: FolderOrganizationService;
  private readonly publicDir: string;

  constructor() {
    // Directorio public del backend (apps/api/public)
    this.publicDir = path.join(process.cwd(), '..', 'api', 'public');

    // Crear/verificar de forma sincrónica para disponibilidad inmediata
    try {
      mkdirSync(this.publicDir, { recursive: true });
      console.log('✅ Directorio public creado o verificado en el backend:', this.publicDir);
    } catch (error) {
      console.error('❌ Error creando directorio public en el backend:', error);
    }

    console.log('📂 Directorio de archivos configurado:', this.publicDir);
  }

  static getInstance(): FolderOrganizationService {
    if (!FolderOrganizationService.instance) {
      FolderOrganizationService.instance = new FolderOrganizationService();
    }
    return FolderOrganizationService.instance;
  }

  /**
   * Obtiene la estructura de carpetas para un tipo de archivo y tabla
   */
  getFolderStructure(fileType: FileType, tableName: string, recordId?: string): FolderStructure {
    const baseFolder = this.getBaseFolderName(fileType);
    let tableFolder = this.sanitizeTableName(tableName);

    // Para lecciones de video, crear carpeta específica con ID
    if (fileType === 'video' && tableName.toLowerCase() === 'leccion' && recordId) {
      tableFolder = `leccion-${recordId}`;
    }

    const fullPath = path.join(this.publicDir, baseFolder, tableFolder);
    const publicUrl = `/${baseFolder}/${tableFolder}`.replace(/\/+/g, '/');

    const structure: FolderStructure = {
      baseFolder,
      tableFolder,
      fullPath,
      publicUrl,
    };

    // Agregar carpeta de thumbnails si es necesario
    if (fileType === 'image' || fileType === 'video') {
      structure.thumbsPath = path.join(fullPath, 'thumbs');
      structure.thumbsUrl = `${publicUrl}/thumbs`.replace(/\/+/g, '/');
    }

    return structure;
  }

  /**
   * Crea toda la estructura de carpetas necesaria
   */
  async ensureFolderStructure(structure: FolderStructure): Promise<void> {
    try {
      await fs.mkdir(structure.fullPath, { recursive: true });
      if (structure.thumbsPath) {
        await fs.mkdir(structure.thumbsPath, { recursive: true });
      }
      console.log('📁 Estructura de carpetas creada:', structure.fullPath);
    } catch (error) {
      console.error('❌ Error creando estructura de carpetas:', error);
      throw new Error(`No se pudo crear la estructura de carpetas: ${String(error)}`);
    }
  }

  /**
   * Limpia archivos antiguos de una carpeta (mantiene solo los N más recientes)
   */
  async cleanupOldFiles(folderPath: string, keepCount: number = 100): Promise<void> {
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      const fileStats: Array<{ name: string; path: string; mtime: Date }> = [];

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(folderPath, file.name);
          const stats = await fs.stat(filePath);
          fileStats.push({ name: file.name, path: filePath, mtime: stats.mtime });
        }
      }

      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const filesToDelete = fileStats.slice(keepCount);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log('🗑️ Archivo antiguo eliminado:', file.name);
      }

      if (filesToDelete.length > 0) {
        console.log(`🧹 Limpieza completada: ${filesToDelete.length} archivos eliminados`);
      }
    } catch (error) {
      console.error('❌ Error en limpieza de archivos:', error);
      // Solo log; no propagamos
    }
  }

  /**
   * Obtiene el tamaño total de una carpeta
   */
  async getFolderSize(folderPath: string): Promise<number> {
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(folderPath, file.name);
        if (file.isFile()) {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } else if (file.isDirectory()) {
          totalSize += await this.getFolderSize(filePath);
        }
      }

      return totalSize;
    } catch (error) {
      console.error('❌ Error calculando tamaño de carpeta:', error);
      return 0;
    }
  }

  /**
   * Cuenta archivos (no carpetas) de forma recursiva
   */
  private async countFiles(dir: string): Promise<number> {
    let count = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) count += 1;
      else if (entry.isDirectory()) count += await this.countFiles(full);
    }
    return count;
  }

  /**
   * Genera un reporte de uso de almacenamiento
   */
  async generateStorageReport(): Promise<Record<string, StorageFolderReport>> {
    const report: Record<string, StorageFolderReport> = {};
    const baseFolders = ['images', 'videos', 'audios', 'documents'] as const;

    for (const folder of baseFolders) {
      const folderPath = path.join(this.publicDir, folder);
      try {
        const size = await this.getFolderSize(folderPath);
        const fileCount = await this.countFiles(folderPath);

        report[folder] = {
          size,
          sizeFormatted: this.formatBytes(size),
          fileCount,
          path: folderPath,
        };
      } catch (error) {
        report[folder] = {
          size: 0,
          sizeFormatted: '0 B',
          fileCount: 0,
          path: folderPath,
          error: error instanceof Error ? error.message : 'Error desconocido',
        };
      }
    }

    return report;
  }

  /**
   * Obtiene el nombre de la carpeta base según el tipo de archivo
   */
  private getBaseFolderName(fileType: FileType): string {
    switch (fileType) {
      case 'image': return 'images';
      case 'video': return 'videos';
      case 'audio': return 'audios';
      case 'document': return 'documents';
      default: return 'files';
    }
  }

  /**
   * Sanitiza el nombre de la tabla para usar como nombre de carpeta
   */
  private sanitizeTableName(tableName: string): string {
    return tableName
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Formatea bytes en formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export const folderOrganizationService = FolderOrganizationService.getInstance();
