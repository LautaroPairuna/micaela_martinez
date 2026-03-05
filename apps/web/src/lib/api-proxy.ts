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
  const rewritten = rewritePath(path.startsWith('/') ? path : `/${path}`);
  const url = await resolveApiUrl(rewritten);

  const ssrHeaders = await getSSRRequestHeaders();

  // ✅ Normalizar body + headers
  const body = (init as any)?.body;

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const isStringBody = typeof body === 'string';

  const isPlainObjectBody =
    body != null &&
    typeof body === 'object' &&
    !isFormData &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof Blob) &&
    !(body instanceof URLSearchParams);

  // Si es objeto plano, lo convertimos a JSON string
  const normalizedBody =
    isPlainObjectBody ? JSON.stringify(body) : body;

  const finalHeaders: HeadersInit = {
    ...(ssrHeaders || {}),
    ...(init?.headers || {}),
    // Si detectamos que es un objeto plano o un string JSON, forzamos application/json
    ...(isPlainObjectBody || (isStringBody && (body.trim().startsWith('{') || body.trim().startsWith('[')))
      ? { 'Content-Type': 'application/json', Accept: 'application/json' }
      : {}),
  };

  const res = await fetch(url, {
    ...init,
    body: normalizedBody as any,
    headers: finalHeaders,
    credentials: 'include',
    cache: init?.cache,
    next: init?.next,
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}\n${bodyText}`);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    if (!text.trim()) return undefined as T;
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'} — ${url}\n${text}`);
  }

  return (await res.json()) as T;
}

async function resolveApiUrl(input: string): Promise<string> {
  try {
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

    // 4) Rama browser → SIEMPRE usar URLs relativas para evitar problemas de CORS
    if (typeof window !== 'undefined') {
      // Aseguramos que la ruta comience con /api si no lo hace ya
      return rel.startsWith('/api') ? rel : `/api${rel}`;
    }

    // 5) Rama server (SSR/Route Handlers) → siempre red interna
    const internal = process.env.BACKEND_INTERNAL_URL;
    if (internal) return joinApi(internal, rel);

    // 6) (Opcional) último respaldo: usa el host del request (mismo frontend)
    try {
      const { headers } = await import('next/headers');
      const h: Headers | undefined = headers ? await headers() : undefined;

      const proto = h?.get('x-forwarded-proto') ?? 'https';
      const host  = h?.get('x-forwarded-host') ?? h?.get('host');

      if (host) {
        return `${proto}://${host}${rel.startsWith('/api') ? rel : `/api${rel}`}`;
      }
    } catch (error) {
      console.warn('Error al obtener headers:', error);
    }

    // 7) Fallback a URL relativa en caso de error
    return rel.startsWith('/api') ? rel : `/api${rel}`;
  } catch (error) {
    console.error('Error al resolver URL de API:', error);
    // En caso de cualquier error, siempre devolver URL relativa como último recurso
    const safeRel = input.startsWith('/') ? input : `/${input}`;
    return safeRel.startsWith('/api') ? safeRel : `/api${safeRel}`;
  }
}

