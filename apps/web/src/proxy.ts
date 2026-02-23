import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FILTER_PREFIXES = ['nivel-', 'tag-', 'pagina-', 'orden-'];

function computeApiBase(): string {
  const raw =
    (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
      .trim()
      .replace(/\/+$/, '')
      .replace('://localhost', '://127.0.0.1');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

type JwtPayload = { roles?: unknown };

function decodeBase64UrlToString(input: string): string | null {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');

  try {
    if (typeof atob === 'function') return atob(padded);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

function getJwtRoles(token: string): string[] {
  const parts = token.split('.');
  if (parts.length < 2) return [];
  const jsonStr = decodeBase64UrlToString(parts[1] ?? '');
  if (!jsonStr) return [];

  try {
    const payload = JSON.parse(jsonStr) as JwtPayload;
    if (!Array.isArray(payload.roles)) return [];
    return payload.roles.filter((r): r is string => typeof r === 'string');
  } catch {
    return [];
  }
}

async function isAdminToken(token: string): Promise<boolean> {
  const roles = getJwtRoles(token);
  return roles.some((r) => r.toUpperCase() === 'ADMIN');
}

// Helper para inyectar headers de seguridad a cualquier respuesta
function withSecurityHeaders(response: NextResponse): NextResponse {
  // 🛡️ Security Headers
  response.headers.set('X-Frame-Options', 'DENY'); // Previene clickjacking
  response.headers.set('X-Content-Type-Options', 'nosniff'); // Previene MIME sniffing
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  return response;
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('mp_session')?.value;
  const { pathname, search } = req.nextUrl;
  const devBypass =
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' ||
    process.env.DEV_AUTH_BYPASS === 'true';

  // Preparar headers base (Nonce, URL) para inyectar en request
  const requestHeaders = new Headers(req.headers);
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-url', req.url);

  // 1. Lógica para /admin
  if (pathname.startsWith('/admin')) {
    if (devBypass) {
      return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
    }

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
      return withSecurityHeaders(NextResponse.redirect(url));
    }

    const ok = await isAdminToken(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  // 2. Logging de API
  if (pathname.startsWith('/api/')) {
    console.log(`[PROXY] ${req.method} ${pathname}${search}`);
  }

  // 3. Lógica específica para recursos admin
  if (
    pathname.startsWith('/api/admin/resources/') &&
    (search.includes('file=') || search.includes('thumb='))
  ) {
    if (!token) {
      if (!devBypass) {
        return withSecurityHeaders(NextResponse.json(
          { error: 'Acceso no autorizado a recursos' },
          { status: 401 },
        ));
      }
      return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
    }

    // Pasar token en header interno si es necesario
    requestHeaders.set('x-auth-token', token);
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  // 4. Respuesta default para todo lo demás
  return withSecurityHeaders(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
