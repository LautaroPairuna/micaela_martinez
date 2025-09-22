/**
 * Convierte un string a un slug URL-friendly
 * @param text - El texto a convertir
 * @returns El slug generado
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Reemplazar caracteres especiales del español
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ç/g, 'c')
    // Reemplazar espacios y caracteres especiales con guiones
    .replace(/[^a-z0-9\-]/g, '-')
    // Eliminar múltiples guiones consecutivos
    .replace(/-+/g, '-')
    // Eliminar guiones al inicio y final
    .replace(/^-|-$/g, '');
}

/**
 * Genera un slug único agregando un sufijo numérico si es necesario
 * @param text - El texto base
 * @param existingSlugs - Array de slugs existentes para evitar duplicados
 * @returns Un slug único
 */
export function generateUniqueSlug(text: string, existingSlugs: string[] = []): string {
  const baseSlug = slugify(text);
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 1;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Convierte un slug de vuelta a texto legible
 * @param slug - El slug a convertir
 * @returns El texto legible
 */
export function unslugify(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}