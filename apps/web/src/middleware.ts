import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const FILTER_PREFIXES = ['nivel-', 'tag-', 'pagina-', 'orden-'];

export function middleware(req: NextRequest) {
  const token = req.cookies.get('mp_session')?.value; // cookie httpOnly que setea el backend
  const { pathname, search } = req.nextUrl;
  const devBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' || process.env.DEV_AUTH_BYPASS === 'true';

  // Log de requests API para debugging
  if (pathname.startsWith('/api/')) {
    console.log(`[MIDDLEWARE] ${req.method} ${pathname}${search}`);
  }

  // 3) Proteger rutas de archivos admin que requieren autenticación
  if (pathname.startsWith('/api/admin/resources/') && (search.includes('file=') || search.includes('thumb='))) {
    if (!token) {
      if (!devBypass) {
        return NextResponse.json(
          { error: 'Acceso no autorizado a recursos' },
          { status: 401 }
        );
      }
      // En desarrollo permitir continuar sin token
      return NextResponse.next();
    }
    // Si hay token, agregar header para que el route handler pueda acceder
    const response = NextResponse.next();
    response.headers.set('x-auth-token', token);
    return response;
  }

  // 1) Corrige URLs mal formadas: /curso/detalle/nivel-... -> /cursos/nivel-...
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

  // (Opcional) /cursos/detalle/nivel-... -> /cursos/...
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

  // 2) Áreas privadas: mi-aprendizaje, mi-cuenta y checkout
  const needsAuth =
    pathname.startsWith('/mi-aprendizaje') ||
    pathname.startsWith('/mi-cuenta') ||
    pathname.startsWith('/checkout');

  if (needsAuth && !token) {
    const url = req.nextUrl.clone();
    if (devBypass) {
      // En desarrollo, permitir acceso anon sin redirigir a /auth
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

export const config = {
  matcher: [
    '/mi-aprendizaje/:path*',
    '/mi-cuenta/:path*',
    '/checkout/:path*',
    '/curso/detalle/:path*',
    '/cursos/:path*', // Para redirigir filtros antiguos
    '/api/:path*', // Agregar logging para rutas API
    '/api/admin/resources/:path*', // Proteger rutas de archivos admin
  ],
};
