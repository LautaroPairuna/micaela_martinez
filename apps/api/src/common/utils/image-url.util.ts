/**
 * Utilidades para generar URLs de imágenes a partir de nombres de archivo
 * Centraliza la lógica de construcción de URLs para mantener consistencia
 */

export class ImageUrlUtil {
  private static readonly BASE_IMAGE_PATH = '/images';

  /**
   * Genera URL para imagen de curso (portada)
   */
  static getCourseImageUrl(filename: string | null): string | null {
    if (!filename) return null;
    return `${this.BASE_IMAGE_PATH}/cursos/${filename}`;
  }

  /**
   * Genera URL para imagen principal de producto
   */
  static getProductImageUrl(filename: string | null): string | null {
    if (!filename) return null;
    return `${this.BASE_IMAGE_PATH}/producto/${filename}`;
  }

  /**
   * Genera URL para imágenes adicionales de producto
   */
  static getProductGalleryImageUrl(filename: string): string {
    return `${this.BASE_IMAGE_PATH}/producto/${filename}`;
  }

  /**
   * Genera URL para imagen de marca
   */
  static getBrandImageUrl(filename: string | null): string | null {
    if (!filename) return null;
    return `${this.BASE_IMAGE_PATH}/marcas/${filename}`;
  }

  /**
   * Genera URL para imagen de categoría
   */
  static getCategoryImageUrl(filename: string | null): string | null {
    if (!filename) return null;
    return `${this.BASE_IMAGE_PATH}/categorias/${filename}`;
  }

  /**
   * Genera URL para imagen del hero
   */
  static getHeroImageUrl(filename: string): string {
    return `${this.BASE_IMAGE_PATH}/hero/${filename}`;
  }

  /**
   * Genera URL genérica para cualquier imagen
   */
  static getImageUrl(path: string, filename: string): string {
    return `${this.BASE_IMAGE_PATH}/${path}/${filename}`;
  }

  /**
   * Extrae el nombre del archivo de una URL completa
   * Útil para migrar datos existentes
   */
  static extractFilename(url: string): string {
    return url.split('/').pop() || url;
  }

  /**
   * Valida si un nombre de archivo es válido
   */
  static isValidFilename(filename: string): boolean {
    // Permite letras, números, guiones, puntos y guiones bajos
    const validPattern = /^[a-zA-Z0-9._-]+\.[a-zA-Z]{2,4}$/;
    return validPattern.test(filename);
  }

  /**
   * Sanitiza un nombre de archivo
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
