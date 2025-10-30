import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL: number;

  constructor(private configService: ConfigService) {
    // TTL por defecto: 5 minutos
    this.defaultTTL = this.configService.get<number>('CACHE_TTL', 300000);
    
    // Limpiar caché expirado cada 10 minutos
    setInterval(() => this.cleanExpiredCache(), 600000);
  }

  /**
   * Obtener un valor del caché
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Verificar si el item ha expirado
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Establecer un valor en el caché
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, item);
  }

  /**
   * Eliminar un valor del caché
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Eliminar múltiples claves que coincidan con un patrón
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Limpiar todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Limpiar elementos expirados del caché
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Limpiados ${cleanedCount} elementos expirados del caché`);
    }
  }

  /**
   * Generar clave de caché para consultas de administración
   */
  generateAdminKey(
    resource: string,
    page: number,
    limit: number,
    search?: string,
    filters?: any,
    sortBy?: string,
    sortDir?: string,
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `admin:${resource}:${page}:${limit}:${search || ''}:${filterStr}:${sortBy || ''}:${sortDir || ''}`;
  }

  /**
   * Generar clave de caché para productos del catálogo
   */
  generateCatalogKey(
    page: number,
    perPage: number,
    q?: string,
    marca?: string,
    categoria?: string,
    minPrice?: number,
    maxPrice?: number,
    sort?: string,
  ): string {
    return `catalog:products:${page}:${perPage}:${q || ''}:${marca || ''}:${categoria || ''}:${minPrice || ''}:${maxPrice || ''}:${sort || ''}`;
  }
}