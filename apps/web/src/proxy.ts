import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('mp_session')?.value;
  const { pathname, search } = req.nextUrl;
  const devBypass =
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' ||
    process.env.DEV_AUTH_BYPASS === 'true';

  if (pathname.startsWith('/admin')) {
    if (devBypass) return NextResponse.next();

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    const ok = await isAdminToken(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/api/')) {
    console.log(`[MIDDLEWARE] ${req.method} ${pathname}${search}`);
  }

  if (
    pathname.startsWith('/api/admin/resources/') &&
    (search.includes('file=') || search.includes('thumb='))
  ) {
    if (!token) {
      if (!devBypass) {
        return NextResponse.json(
          { error: 'Acceso no autorizado a recursos' },
          { status: 401 },
        );
      }
      return NextResponse.next();
    }

    const response = NextResponse.next();
    response.headers.set('x-auth-token', token);
    return response;
  }

  if (pathname.startsWith('/curso/detalle/')) {
    const rest = pathname.slice('/curso/detalle/'.length);
    const firstSeg = rest.split('/')[0] || '';
    if (FILTER_PREFIXES.some((p) => firstSeg.startsWith(p))) {
      const to = req.nextUrl.clone();
      to.pathname = `/cursos/${rest}`;
      to.search = search;
      return NextResponse.redirect(to, 308);
    }
  }

  if (pathname.startsWith('/cursos/detalle/')) {
    const rest = pathname.slice('/cursos/detalle/'.length);
    const firstSeg = rest.split('/')[0] || '';
    if (FILTER_PREFIXES.some((p) => firstSeg.startsWith(p))) {
      const to = req.nextUrl.clone();
      to.pathname = `/cursos/${rest}`;
      to.search = search;
      return NextResponse.redirect(to, 308);
    }
  }

  const needsAuth =
    pathname.startsWith('/mi-aprendizaje') ||
    pathname.startsWith('/mi-cuenta') ||
    pathname.startsWith('/checkout');

  if (needsAuth && !token) {
    const url = req.nextUrl.clone();
    if (devBypass) {
      return NextResponse.next();
    }
    url.pathname = '/auth';
    url.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'cursos' && segments.length === 2) {
    if (!token && !devBypass) {
      const url = req.nextUrl.clone();
      url.pathname = `/cursos/detalle/${segments[1]}`;
      return NextResponse.redirect(url, 308);
    }
  }

  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  return proxy(req);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/mi-aprendizaje/:path*',
    '/mi-cuenta/:path*',
    '/checkout/:path*',
    '/curso/detalle/:path*',
    '/cursos/:path*',
    '/api/:path*',
    '/api/admin/resources/:path*',
  ],
};
