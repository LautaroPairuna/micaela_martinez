/**
 * Utilidades para generar URLs seguras para videos/documentos
 * que pasan por el proxy de Next => Nest (/api/media/**)
 */

// 🔥 Quitado: imports no usados
// import { MEDIA_PUBLIC_URL, BACKEND_URL } from './adminConstants';

/** Extrae el nombre de archivo de una URL/ruta */
function extractFilename(url: string): string {
  if (!url) return '';
  const clean = url.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || '';
}

export type MediaKind = 'video' | 'document' | 'unknown';

export function getMediaType(filename: string): MediaKind {
  if (!filename) return 'unknown';
  const ext = filename.toLowerCase().split('.').pop() || '';
  const video = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv'];
  const docs  = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  if (video.includes(ext)) return 'video';
  if (docs.includes(ext))  return 'document';
  return 'unknown';
}

/** ¿Ya es una URL /api/media segura? */
export function isSecureMediaUrl(url: string): boolean {
  return typeof url === 'string' && (
    url.startsWith('/api/media/videos/') ||
    url.startsWith('/api/media/docs/')
  );
}

// ---------- token base64 (simple) ----------
type SimpleTokenPayload = {
  videoId: string;
  userId?: string;
  exp: number;
  iat: number;
  jti: string;
};

// La autenticación se maneja automáticamente a través de las cookies de sesión (mp_session)

function b64encode(str: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(str);
  }
  return Buffer.from(str, 'utf8').toString('base64');
}

/** Genera un “token” temporal (no-JWT) */
export function generateVideoToken(
  videoId: string,
  userId?: string,
  bustCache = false
): string {
  const now = Math.floor(Date.now() / 1000);
  const period = 15 * 60; // 15 min
  const iat = bustCache ? now : Math.floor(now / period) * period;
  const exp = iat + 4 * 60 * 60; // 4 h
  const base = `${videoId}-${userId || 'anon'}`;
  const jtiBase = b64encode(base).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  const jti = bustCache ? `${jtiBase}-${now}` : `${jtiBase}-${Math.floor(now / period)}`;
  const payload: SimpleTokenPayload = { videoId, userId, exp, iat, jti };
  return b64encode(JSON.stringify(payload));
}

// ---------- URLs seguras ----------
export async function getSecureVideoUrl(
  videoSrc: string,
  lessonId?: string,
  bustCache = false,
  _userId?: string // ← prefijo _ para evitar warning de var sin uso
): Promise<string> {
  if (!videoSrc || typeof videoSrc !== 'string') return '';

  // Externa -> no tocar
  if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
    return videoSrc;
  }

  const filename = extractFilename(videoSrc) || videoSrc;

  // Usamos el proxy API configurado en next.config.ts
  const backendUrl = `/api/media/videos/${encodeURIComponent(filename)}`;

  // Agregamos parámetros de cache busting si es necesario
  const params = new URLSearchParams();
  if (bustCache) params.set('_t', Date.now().toString());
  if (lessonId) params.set('lessonId', lessonId);

  const queryString = params.toString();
  const out = queryString ? `${backendUrl}?${queryString}` : backendUrl;

  return out;
}

export async function getSecureDocumentUrl(
  docSrc: string,
  lessonId?: string,
  bustCache = false,
  _userId?: string // ← prefijo _
): Promise<string> {
  if (!docSrc || typeof docSrc !== 'string') return '';

  // Externa -> no tocar
  if (docSrc.startsWith('http://') || docSrc.startsWith('https://')) {
    return docSrc;
  }

  const filename = extractFilename(docSrc) || docSrc;

  // Usamos el proxy API configurado en next.config.ts
  const backendUrl = `/api/media/documents/${encodeURIComponent(filename)}`;

  // Agregamos parámetros de cache busting si es necesario
  const params = new URLSearchParams();
  if (bustCache) params.set('_t', Date.now().toString());
  if (lessonId) params.set('lessonId', lessonId);

  const queryString = params.toString();
  const out = queryString ? `${backendUrl}?${queryString}` : backendUrl;

  return out;
}

/**
 * Obtiene una URL segura para imágenes que estaban en la carpeta public
 * Redirige la petición a través del backend para servir las imágenes
 */
export function getPublicImageUrl(
  imageSrc: string,
  bustCache = false
): string {
  if (!imageSrc || typeof imageSrc !== 'string') return '';

  // URL externa -> no tocar
  if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
    return imageSrc;
  }

  // Si ya es una URL segura con el formato correcto, no la modificamos
  if (imageSrc.startsWith('/api/media/images/')) {
    return imageSrc;
  }

  // Si tiene el formato antiguo, lo corregimos directamente
  if (imageSrc.startsWith('/api/media/public/')) {
    return imageSrc.replace('/api/media/public/', '/api/media/images/');
  }

  // Procesamos la ruta para asegurar el formato correcto
  let cleanPath = imageSrc;

  // Limpiamos la ruta de cualquier prefijo no deseado
  if (cleanPath.startsWith('/public/')) {
    cleanPath = cleanPath.substring(8);
  } else if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  // Aseguramos que las imágenes apunten directamente a la ruta correcta
  // Usamos el formato correcto para el controlador de imágenes
  const backendUrl = `/api/media/images/${encodeURIComponent(cleanPath)}`;

  // Agregamos parámetros de cache busting si es necesario
  const params = new URLSearchParams();
  if (bustCache) params.set('_t', Date.now().toString());

  const queryString = params.toString();
  return queryString ? `${backendUrl}?${queryString}` : backendUrl;
}

/**
 * URL segura para thumbnail del video.
 * Genera URL directa al backend para el thumbnail
 */
export function getSecureVideoThumbnailUrl(
  videoSrc: string | null | undefined,
  _userId?: string, // ← prefijo _
  lessonId?: string
): string {
  if (!videoSrc || typeof videoSrc !== 'string' || videoSrc.trim() === '') return '';
  if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) return videoSrc;

  const filename = extractFilename(videoSrc);
  if (!filename) return '';

  // Usamos el proxy API configurado en next.config.ts
  // La autenticación se maneja automáticamente a través de las cookies de sesión
  const backendUrl = `/api/media/thumbnails/${encodeURIComponent(filename)}`;
  const params = new URLSearchParams();
  if (lessonId) params.set('lessonId', lessonId);

  const queryString = params.toString();
  return queryString ? `${backendUrl}?${queryString}` : backendUrl;
}

export function debugMediaUrl(url: string) {
  const filename = extractFilename(url);
  const kind = getMediaType(filename);
  const secure = isSecureMediaUrl(url);
  return {
    originalUrl: url,
    filename,
    kind,
    secure,
    sampleSecureVideoUrl: `/api/media/videos/${filename}?token=...`,
    sampleSecureDocUrl: `/api/media/docs/${filename}?token=...`,
  };
}
