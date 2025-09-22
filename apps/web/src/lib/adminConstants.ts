// Rutas "públicas" que tu UI usa para armar URLs.
// Ojo: IMAGE_PUBLIC_URL lo dejamos en /images porque lo sirves estático desde el back.
// Para contenidos protegidos (video/doc) se usa /api/media/*

export const IMAGE_PUBLIC_URL = '/images';     // p.ej. /images/producto/slug/archivo.jpg
export const MEDIA_PUBLIC_URL = '/api/media';  // base para /api/media/videos|docs|images
export const DOC_PUBLIC_URL   = '/docs';       // si además sirves PDFs públicos

// Útil por si querés construir URLs absolutas al backend en alguna circunstancia
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
