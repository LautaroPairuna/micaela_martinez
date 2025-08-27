import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const FILTER_PREFIXES = ['nivel-', 'tag-', 'pagina-'];

export function middleware(req: NextRequest) {
  const token = req.cookies.get('mp_session')?.value;
  const { pathname, search } = req.nextUrl;

  // 1) Corrige URLs mal formadas: /curso/detalle/nivel-... -> /cursos/nivel-...
  if (pathname.startsWith('/curso/detalle/')) {
    const rest = pathname.slice('/curso/detalle/'.length); // lo que sigue al prefijo
    const firstSeg = rest.split('/')[0] || '';
    if (FILTER_PREFIXES.some((p) => firstSeg.startsWith(p))) {
      const to = req.nextUrl.clone();
      to.pathname = `/cursos/${rest}`;
      to.search = search; // conserva ?q, ?sort, etc.
      return NextResponse.redirect(to, 308); // permanente
    }
  }

  // (Opcional, por si alguien arma /cursos/detalle/nivel-..., lo mandamos al catálogo)
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

  // 2) Protege áreas privadas
  if (!token && pathname.startsWith('/mi-aprendizaje')) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    // mejor: preservamos path + query para volver exactamente a donde estaba
    url.searchParams.set('next', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url); // 307
  }

  return NextResponse.next();
}

// Ejecutá el middleware solo donde hace falta
export const config = {
  matcher: [
    '/mi-aprendizaje/:path*',
    '/curso/detalle/:path*',   // para corregir /curso/detalle/nivel-...
  ],
};
