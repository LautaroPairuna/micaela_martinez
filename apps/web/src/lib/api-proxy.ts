import { getServerHeaders } from './server-utils';

type NextInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };

/** Rewrites locales (front SDK → backend) */
const REWRITES: Array<[RegExp, string]> = [
  [/^\/user\/addresses$/, '/account/addresses'],
  [/^\/user\/addresses\/([^/]+)$/, '/account/addresses/$1'],
  [/^\/user\/favorites$/, '/account/favorites'],
  [/^\/user\/favorites\/([^/]+)$/, '/account/favorites/$1'],
  [/^\/user\/orders$/, '/account/orders'],
  [/^\/user\/enrollments$/, '/account/enrollments'],
  [/^\/users\/me\/enrollments\/progress$/, '/users/me/enrollments/progress'],
  // Removed incorrect rewrite: [/^\/catalog\/cursos\/([^/]+)\/contenido$/, '/lms/courses/$1/content'],
  // The backend controller is already at /catalog/cursos/:slug/contenido
  // Note: /users/me should NOT be rewritten - it's the correct backend endpoint
];

function rewritePath(p: string) {
  for (const [re, to] of REWRITES) {
    if (re.test(p)) return p.replace(re, to);
  }
  return p;
}

async function getSSRRequestHeaders(): Promise<HeadersInit | undefined> {
  return await getServerHeaders();
}

export async function apiProxy<T>(path: string, init?: NextInit) {
  // 0) Rewrite SDK → backend
  const rewritten = rewritePath(path.startsWith('/') ? path : `/${path}`);

  // 1) Construir URL absoluta o relativa según entorno
  const url = await resolveApiUrl(rewritten);

  // 2) En SSR, adjuntar cookies entrantes (para sesiones httpOnly)
  const ssrHeaders = await getSSRRequestHeaders();

  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(ssrHeaders || {}),
      ...(init?.headers || {}),
    },
    credentials: 'include', // 👈 Enviar cookies automáticamente en cliente
    cache: init?.cache,
    next: init?.next,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}\n${body}`);
  }
  
  // Manejar respuesta vacía (204 No Content)
  if (res.status === 204) {
    return undefined as T;
  }
  
  // Verificar si la respuesta contiene JSON válido
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    if (!text.trim()) {
      return undefined as T;
    }
    throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'} — ${url}\n${text}`);
  }
  
  try {
    return await res.json() as T;
  } catch (jsonError) {
    const text = await res.text().catch(() => '');
    throw new Error(`Invalid JSON response — ${url}\n${text}\nJSON Error: ${jsonError}`);
  }
}

async function resolveApiUrl(input: string): Promise<string> {
  // 1) Absoluta → dejar tal cual
  if (/^https?:\/\//i.test(input)) return input;

  // 2) Normalizar relativo (si no empieza con /, prefijar)
  const rel = input.startsWith('/') ? input : `/${input}`;

  // 3) Helpers de base URLs
  const strip = (s = '') => s.replace(/\/+$/, '');
  const hasApi = (s = '') => /\/api\/?$/i.test(s);
  const joinApi = (base: string, path: string) => {
    // Si base termina en /api, NO dupliques /api
    if (hasApi(base)) return `${strip(base)}${path.startsWith('/api') ? path.replace(/^\/api/, '') : path}`;
    // Si base no tiene /api, asegúralo
    const p = path.startsWith('/api') ? path : `/api${path}`;
    return `${strip(base)}${p}`;
  };

  // 4) Rama browser → siempre dominio público o relativo
  if (typeof window !== 'undefined') {
    // Si estamos en desarrollo, usar URLs relativas para evitar problemas de CORS
    if (process.env.NODE_ENV === 'development') {
      return rel; // Usar URL relativa en desarrollo
    }
    
    const pub = process.env.NEXT_PUBLIC_API_URL;
    if (!pub) {
      // Si no hay URL pública configurada, usar URL relativa como fallback
      console.warn('Falta NEXT_PUBLIC_API_URL para llamadas desde el navegador, usando URL relativa');
      return rel;
    }
    return joinApi(pub, rel);
  }

  // 5) Rama server (SSR/Route Handlers) → siempre red interna
  const internal = process.env.BACKEND_INTERNAL_URL;
  if (internal) return joinApi(internal, rel);

  // 6) (Opcional) último respaldo: usa el host del request (mismo frontend) solo si querés saltar por el proxy del propio Next.
  try {
    const { headers } = await import('next/headers');
    // headers() puede devolver sincrónico o promesa; lo normalizamos con await
    const h: Headers | undefined = headers ? await headers() : undefined;

    const proto = h?.get('x-forwarded-proto') ?? 'https';
    const host  = h?.get('x-forwarded-host') ?? h?.get('host');

    if (host) {
      return `${proto}://${host}${rel.startsWith('/api') ? rel : `/api${rel}`}`;
    }
  } catch { /* noop */ }

  // 7) Fallback a URL relativa en caso de error
  console.warn('No se pudo resolver la URL de API, usando URL relativa como fallback');
  return rel;
}

