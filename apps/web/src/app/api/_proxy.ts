// apps/web/src/app/api/_proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function computeApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
    .trim()
    .replace(/\/+$/, '');
  const hostFixed = raw.replace('://localhost', '://127.0.0.1');
  return hostFixed.endsWith('/api') ? hostFixed : `${hostFixed}/api`;
}
const API_BASE = computeApiBase();

function buildTarget(req: NextRequest, path: string) {
  const qs = req.nextUrl.searchParams.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

export async function proxy(req: NextRequest, path: string) {
  const jar = await cookies();
  const token = jar.get('mp_session')?.value;

  // Debug logging
  console.log(`[API-PROXY] ${req.method} ${path}`);
  console.log(`[API-PROXY] Token found: ${token ? 'YES' : 'NO'}`);
  if (token) {
    console.log(`[API-PROXY] Token preview: ${token.substring(0, 50)}...`);
  }

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
  // usar arrayBuffer para no tocar el payload y evitar issues de encoding
  const body = hasBody ? await req.arrayBuffer() : undefined;
  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const target = buildTarget(req, path);
  
  try {
    const upstream = await fetch(target, { 
      method: req.method, 
      headers, 
      body, 
      redirect: 'manual',
      // Timeout para evitar requests colgados
      signal: AbortSignal.timeout(30000)
    });

    const respHeaders = new Headers();
    const ct = upstream.headers.get('content-type'); 
    if (ct) respHeaders.set('content-type', ct);
    
    const reqId = upstream.headers.get('x-request-id') || upstream.headers.get('x-correlation-id');
    if (reqId) respHeaders.set('x-request-id', reqId);

    // Log de errores para debugging
    if (!upstream.ok) {
      console.error(`[API-PROXY] ${upstream.status} ${upstream.statusText} - ${req.method} ${target}`);
      
      // Para 404s, agregar información adicional
      if (upstream.status === 404) {
        console.error(`[API-PROXY] 404 Details - Original path: ${path}, Target: ${target}`);
      }
    }

    return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
  } catch (error) {
    console.error(`[API-PROXY] Network error - ${req.method} ${target}:`, error);
    
    // Detectar diferentes tipos de errores de conexión
    const isConnectionRefused = error instanceof Error && 
      (error.message.includes('ECONNREFUSED') || error.message.includes('connect ECONNREFUSED'));
    
    const isTimeout = error instanceof Error && 
      (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'));
    
    let errorMessage = 'Unable to connect to backend service';
    let errorDetails = '';
    
    if (isConnectionRefused) {
      errorMessage = 'Backend service is not available';
      errorDetails = 'The backend server is not running or not accessible. Please check if the backend service is started.';
    } else if (isTimeout) {
      errorMessage = 'Backend service timeout';
      errorDetails = 'The backend service took too long to respond. Please try again later.';
    }
    
    // Retornar error 502 Bad Gateway para errores de red
    return new NextResponse(
      JSON.stringify({ 
        error: 'Backend unavailable', 
        message: errorMessage,
        details: errorDetails,
        path,
        target,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 502, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}
