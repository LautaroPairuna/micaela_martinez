export const PLACEHOLDER_IMAGE = '/images/placeholder.jpg';

/**
 * Normaliza una referencia de imagen para que funcione con el rewrite de Next.
 * Soporta:
 * - URLs absolutas (http/https)
 * - Rutas nuevas (/uploads/...) -> inyecta sufijo -thumb
 * - Rutas viejas (/images/...) -> inyecta carpeta /thumbs/
 * - Solo nombre de archivo -> asume /images/producto/ (legacy)
 */
export function resolveProductThumb(src?: string | null): string | undefined {
  if (!src || typeof src !== 'string') return undefined;

  // Remota/CDN → dejar como está
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  // NUEVO: Soporte para /uploads/
  // Convención: /uploads/{resource}/thumbs/{filename}-thumb.webp
  if (src.startsWith('/uploads/')) {
    // Si ya tiene /thumbs/ en la ruta, devolver tal cual
    if (src.includes('/thumbs/')) return src;

    // Si no tiene /thumbs/, inyectarlo antes del archivo
    // ej: /uploads/producto/foto.webp -> /uploads/producto/thumbs/foto-thumb.webp
    const parts = src.split('/');
    const filename = parts.pop();
    if (!filename) return src;
    
    // Si el filename ya es un thumb (por error o legacy reciente), no duplicar sufijo
    const thumbName = filename.includes('-thumb.') 
      ? filename 
      : filename.replace(/(\.[^.]+)$/, '-thumb$1');

    return [...parts, 'thumbs', thumbName].join('/');
  }

  // LEGACY: Soporte para /images/ (estructura vieja con carpeta /thumbs/)
  if (src.startsWith('/images/')) {
    // Si no tiene /thumbs/ en el tramo de la carpeta, lo insertamos
    if (!/\/images\/[^/]+\//.test(src)) {
      return src.replace(/^\/images\/([^/]+)\//, '/images/$1/thumbs/');
    }
    return src;
  }

  // Viene como 'producto/foo.webp' o 'producto/thumbs/foo.webp'
  if (/^[^/]+\/[^/]+/.test(src)) {
    // Si ya está el segmento thumbs, prefijamos /images/ y salimos
    if (/^[^/]+\/thumbs\//.test(src)) {
      return `/images/${src}`;
    }
    // Insertar thumbs entre la carpeta y el archivo
    return `/images/${src.replace(/^([^/]+)\//, '$1/thumbs/')}`;
  }

  // Solo filename → asumir carpeta 'producto' (legacy default)
  return `/images/producto/${src}`;
}

/**
 * Normaliza una referencia de imagen de curso.
 */
export function resolveCourseThumb(src?: string | null): string | undefined {
  if (!src || typeof src !== 'string') return undefined;

  // Remota/CDN
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  // NUEVO: /uploads/ (ej: /uploads/curso/file.webp -> /uploads/curso/thumbs/file-thumb.webp)
  if (src.startsWith('/uploads/')) {
    if (src.includes('/thumbs/')) return src;
    
    const parts = src.split('/');
    const filename = parts.pop();
    if (!filename) return src;

    const thumbName = filename.includes('-thumb.') 
      ? filename 
      : filename.replace(/(\.[^.]+)$/, '-thumb$1');

    return [...parts, 'thumbs', thumbName].join('/');
  }

  // LEGACY: /images/curso/
  if (src.startsWith('/images/')) {
    // Si ya tiene /thumbs/, dejar
    if (src.includes('/thumbs/')) return src;
    // Si es /images/curso/file.webp -> /images/curso/thumbs/file.webp
    if (src.startsWith('/images/curso/')) {
      return src.replace('/images/curso/', '/images/curso/thumbs/');
    }
    // Otras rutas -> dejar igual o intentar thumbs
    return src;
  }

  // Solo filename → asumir carpeta 'curso' (legacy default)
  return `/images/curso/thumbs/${src}`;
}

/**
 * Resuelve el thumbnail para un recurso genérico del admin.
 * @param resource Nombre del recurso/tabla (ej: 'slider', 'marca')
 * @param src Ruta o nombre de archivo
 */
export function resolveResourceThumb(resource: string, src?: string | null): string | undefined {
  if (!src || typeof src !== 'string') return undefined;

  // Remota/CDN
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  const resLower = resource.toLowerCase();

  // NUEVO: /uploads/
  if (src.startsWith('/uploads/')) {
    if (src.includes('/thumbs/')) return src;
    
    const parts = src.split('/');
    const filename = parts.pop();
    if (!filename) return src;

    const thumbName = filename.includes('-thumb.') 
      ? filename 
      : filename.replace(/(\.[^.]+)$/, '-thumb$1');

    return [...parts, 'thumbs', thumbName].join('/');
  }

  // Solo filename o path relativo: asumimos nuevo sistema /uploads/recurso/thumbs/...
  // (El usuario confirmó que "todo se sube en uploads")
  
  const filename = src.split('/').pop()!;
  const thumbName = filename.includes('-thumb.')
    ? filename
    : filename.replace(/(\.[^.]+)$/, '-thumb$1');

  return `/uploads/${resLower}/thumbs/${thumbName}`;
}

/** Para casos donde quieras el original (detalle de producto, zoom, etc.) */
export function resolveProductOriginal(src?: string | null): string | undefined {
  if (!src || typeof src !== 'string') return undefined;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;

  // NUEVO
  if (src.startsWith('/uploads/')) {
    return src.replace('-thumb.', '.');
  }

  // LEGACY
  if (src.startsWith('/images/')) {
    return src.replace('/thumbs/', '/'); // si venía con thumbs, lo quitamos
  }
  if (/^[^/]+\/thumbs\//.test(src)) {
    return `/images/${src.replace('/thumbs/', '/')}`;
  }
  if (/^[^/]+\/[^/]+/.test(src)) {
    return `/images/${src}`;
  }
  return `/images/producto/${src}`;
}
