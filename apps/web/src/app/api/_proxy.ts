// apps/web/src/app/api/_proxy.ts
export const runtime = 'nodejs'; // ⚠️ importante: no correr esto en edge

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ---- helpers de URL ---------------------------------------------------------
const strip = (s = '') => s.replace(/\/+$/, '');
const hasApi = (s = '') => /\/api\/?$/i.test(s);
const joinApi = (base: string, path: string) => {
  const rel = path.startsWith('/') ? path : `/${path}`;
  if (hasApi(base)) return `${strip(base)}${rel.startsWith('/api') ? rel.replace(/^\/api/, '') : rel}`;
  return `${strip(base)}${rel.startsWith('/api') ? rel : `/api${rel}`}`;
};

/** SOLO server: usa la URL interna del backend (hostname del servicio Docker) */
function computeApiBase(): string {
  const base =
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://localhost:3001/api';

  return strip(base);
}
const API_BASE = computeApiBase();

function buildTarget(req: NextRequest, path: string) {
  const qs = req.nextUrl.searchParams.toString();
  // Asegura que la base tenga /api (o lo agregamos) y que path esté bien unido
  const url = joinApi(API_BASE, path);
  return qs ? `${url}?${qs}` : url;
}

// ---- proxy -----------------------------------------------------------------
export async function proxy(req: NextRequest, path: string) {
  // cookies(): En Next.js 15 necesita await
  const jar = await cookies();
  const token = jar.get('mp_session')?.value;
  
  const target = buildTarget(req, path);

  console.log(`[API-PROXY] ${req.method} ${path} -> ${target}`);
  console.log(`[API-PROXY] Token present: ${token ? 'YES (length: ' + token.length + ')' : 'NO'}`);

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('cookie'); // no reenviamos cookies al backend
  headers.set('accept', 'application/json');

  // JwtStrategy lee Authorization: Bearer ...
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
    console.log(`[API-PROXY] Authorization header set`);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;
  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });

    const respHeaders = new Headers();
    const ct = upstream.headers.get('content-type');
    if (ct) respHeaders.set('content-type', ct);

    const reqId = upstream.headers.get('x-request-id') || upstream.headers.get('x-correlation-id');
    if (reqId) respHeaders.set('x-request-id', reqId);

    if (!upstream.ok) {
      console.error(`[API-PROXY] ${upstream.status} ${upstream.statusText} - ${req.method} ${target}`);
      if (upstream.status === 404) {
        console.error(`[API-PROXY] 404 Details - Original path: ${path}, Target: ${target}`);
      }
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
  } catch (error) {
    console.error(`[API-PROXY] Network error - ${req.method} ${target}:`, error);

    const msg = (error as Error)?.message || '';
    const isConnRef = msg.includes('ECONNREFUSED') || msg.includes('connect ECONNREFUSED');
    const isTimeout = msg.includes('timeout') || msg.includes('ETIMEDOUT');

    return new NextResponse(
      JSON.stringify({
        error: 'Backend unavailable',
        message: isConnRef ? 'Backend service is not available' : isTimeout ? 'Backend service timeout' : 'Unable to connect to backend service',
        details: isConnRef
          ? 'The backend server is not running or not accessible. Please check if the backend service is started.'
          : isTimeout
          ? 'The backend service took too long to respond. Please try again later.'
          : '',
        path,
        target,
        timestamp: new Date().toISOString(),
      }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}
