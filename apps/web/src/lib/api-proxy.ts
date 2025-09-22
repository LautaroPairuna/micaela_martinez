type NextInit = RequestInit & { next?: { revalidate?: number | false; tags?: string[] } };
type HeadersLike = { get(name: string): string | null };

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
  if (typeof window !== 'undefined') return undefined;
  try {
    const mod: { headers?: () => HeadersLike | Promise<HeadersLike> } = await import('next/headers');
    const headersFn: undefined | (() => HeadersLike | Promise<HeadersLike>) = mod?.headers;
    const h: HeadersLike | undefined = headersFn ? await headersFn() : undefined;
    if (!h) return undefined;

    const cookie = h.get('cookie') || '';
    const hdrs: Record<string, string> = {};
    if (cookie) hdrs.cookie = cookie;
    return hdrs;
  } catch {
    return undefined;
  }
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

  // 2) Normalizar y prefijar /api si falta (tras rewrite)
  let rel = input.startsWith('/') ? input : `/${input}`;
  if (!rel.startsWith('/api')) rel = `/api${rel}`;

  // 3) En el navegador, la relativa funciona
  if (typeof window !== 'undefined') return rel;

  // 4) En server, construir origin desde headers de Next (sync o async)
  try {
    const mod: { headers?: () => HeadersLike | Promise<HeadersLike> } = await import('next/headers');
    const headersFn: undefined | (() => HeadersLike | Promise<HeadersLike>) = mod?.headers;
    const h: HeadersLike | undefined = headersFn ? await headersFn() : undefined;

    if (h) {
      const proto = h.get('x-forwarded-proto') ?? 'http';
      const host  = h.get('x-forwarded-host') ?? h.get('host');
      if (host) return `${proto}://${host}${rel}`;
    }
  } catch {
    /* noop */
  }

  // 5) Fallback explícito (dev/local)
  const site = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  return new URL(rel, site).toString();
}
