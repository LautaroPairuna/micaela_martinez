export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';

/* ========= Config ========= */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
  .trim()
  .replace(/\/+$/, '')
  .replace('://localhost', '://127.0.0.1');

type SessionResult = { valid: boolean; userId?: string };

/* ========= Helpers ========= */
async function validateSession(): Promise<SessionResult> {
  try {
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    if (!token) return { valid: false };

    const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
    const res = await fetch(`${apiUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { valid: false };
    const user = (await res.json()) as { id?: string | number } | undefined;
    return { valid: true, userId: user?.id?.toString() };
  } catch {
    return { valid: false };
  }
}

function validateOrigin(req: NextRequest): boolean {
  const referer = req.headers.get('referer');
  const origin  = req.headers.get('origin');
  const host    = req.headers.get('host') || '';

  const allowed = [
    'localhost',
    '127.0.0.1',
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/^https?:\/\//, ''),
  ].filter(Boolean);

  const check = (url?: string | null) => !!url && allowed.some(d => url.includes(d)) && url.includes(host);

  if (!origin && !referer) return false;
  if (check(origin) || check(referer)) return true;

  try {
    const od = origin ? new URL(origin).hostname : '';
    const rd = referer ? new URL(referer).hostname : '';
    return [od, rd].some(h => allowed.some(d => h.includes(d)));
  } catch {
    return false;
  }
}

function validateUserAgent(req: NextRequest): boolean {
  const ua = (req.headers.get('user-agent') || '').toLowerCase();
  if (!ua) return false;
  const bad = ['wget','curl','python','requests','urllib','httpie','bot','crawler','spider','scraper','downloader','aria2','axel','youtube-dl','yt-dlp','ffmpeg','postman','insomnia','thunder client'];
  if (bad.some(x => ua.includes(x))) return false;
  const ok = ['mozilla','chrome','safari','firefox','edge','opera'];
  return ok.some(x => ua.includes(x));
}

function isDirectNavigation(req: NextRequest): boolean {
  const accept = (req.headers.get('accept') || '').toLowerCase();
  if (accept.includes('text/html')) return true;

  const mode = (req.headers.get('sec-fetch-mode') || '').toLowerCase();
  if (mode === 'navigate') return true;

  const dest = (req.headers.get('sec-fetch-dest') || '').toLowerCase();
  if (dest === 'document') return true;

  return false;
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'webm': return 'video/webm';
    case 'ogg':  return 'video/ogg';
    case 'mov':  return 'video/quicktime';
    case 'avi':  return 'video/x-msvideo';
    default:     return 'video/mp4';
  }
}

async function getVideoPathLocal(videoId: string): Promise<string | null> {
  const safe = videoId.replace(/[^a-zA-Z0-9._-]/g, '');

  const possible = [
    join(process.cwd(), 'public', 'videos', safe),
    join(process.cwd(), 'public', 'videos', 'leccion', safe),
    join(process.cwd(), 'public', 'uploads', 'media', safe),
    join(process.cwd(), 'public', 'uploads', 'media', 'leccion', safe),
    join(process.cwd(), 'public', 'uploads', 'videos', safe),
    join(process.cwd(), 'public', 'media', safe),
    join(process.cwd(), '..', 'api', 'public', 'uploads', 'media', safe),
    join(process.cwd(), '..', 'api', 'public', 'videos', safe),
    ...(!safe.includes('.') ? [
      join(process.cwd(), 'public', 'videos', `${safe}.mp4`),
      join(process.cwd(), 'public', 'videos', `${safe}.webm`),
      join(process.cwd(), 'public', 'videos', `${safe}.mov`),
      join(process.cwd(), 'public', 'uploads', 'media', `${safe}.mp4`),
      join(process.cwd(), 'public', 'uploads', 'videos', `${safe}.mp4`),
      join(process.cwd(), '..', 'api', 'public', 'uploads', 'media', `${safe}.mp4`),
    ] : []),
  ];

  for (const p of possible) {
    try {
      const s = await stat(p);
      if (s.isFile()) return p;
    } catch {}
  }
  return null;
}

/** Proxy server-side al backend, preservando Range y sin cache */
async function proxyFromBackend(req: NextRequest, filename: string): Promise<NextResponse> {
  const api = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
  const url = `${api}/media/videos/${encodeURIComponent(filename)}`;

  const headers = new Headers();
  const range = req.headers.get('range');
  if (range) headers.set('range', range);

  // reenviamos auth si tu backend lo espera por Authorization
  const jar = await cookies();
  const session = jar.get('mp_session')?.value;
  if (session) headers.set('authorization', `Bearer ${session}`);

  const beRes = await fetch(url, { headers, cache: 'no-store' });

  // Copiamos sólo headers seguros/útiles para streaming
  const outHeaders = new Headers();
  const pass = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
    'last-modified',
    'x-content-type-options',
  ];
  for (const [k, v] of beRes.headers.entries()) {
    if (pass.includes(k.toLowerCase())) outHeaders.set(k, v);
  }

  outHeaders.set('Cache-Control', 'private, no-store');
  outHeaders.set('X-Content-Type-Options', 'nosniff');
  outHeaders.set('Cross-Origin-Resource-Policy', 'same-origin');

  return new NextResponse(beRes.body, {
    status: beRes.status,
    headers: outHeaders,
  });
}

/* ========= HANDLERS ========= */
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return new NextResponse('Video ID required', { status: 400 });

    // Anti-abuso
    if (!validateOrigin(req))    return new NextResponse('Forbidden (origin)', { status: 403 });
    if (!validateUserAgent(req)) return new NextResponse('Forbidden (ua)', { status: 403 });
    if (isDirectNavigation(req)) return new NextResponse('Forbidden (direct navigation)', { status: 403 });

    // Sesión
    const session = await validateSession();
    if (!session.valid) return new NextResponse('Unauthorized', { status: 401 });

    // Rate-limit simple por usuario (opcional: podés reusar el tuyo)
    // — omitido por brevedad —

    // ¿Existe local?
    const localPath = await getVideoPathLocal(id);
    if (!localPath) {
      // ✅ PROXY directo al backend (sin redirect)
      return proxyFromBackend(req, id);
    }

    // Stream local (con Range)
    const st = await stat(localPath);
    const fileSize = st.size;
    const mime = getMimeType(id);
    const range = req.headers.get('range');

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m) return new NextResponse('Bad Range', { status: 416 });

      const start = m[1] ? Math.min(parseInt(m[1], 10), fileSize - 1) : 0;
      const end   = m[2] ? Math.min(parseInt(m[2], 10), fileSize - 1) : fileSize - 1;
      const size  = end - start + 1;

      const stream = createReadStream(localPath, { start, end });

      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': `${size}`,
          'Content-Type': mime,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'Cross-Origin-Resource-Policy': 'same-origin',
        },
      });
    }

    const stream = createReadStream(localPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': `${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch (err) {
    console.error('[VIDEO-API] error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return new NextResponse(null, { status: 400 });

    // (opcional) autenticación mínima
    const session = await validateSession();
    if (!session.valid) return new NextResponse(null, { status: 401 });

    // Si existe local → devolvemos headers correctos
    const localPath = await getVideoPathLocal(id);
    if (localPath) {
      const st = await stat(localPath);
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': getMimeType(id),
          'Content-Length': `${st.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // ⚠️ Backend no tiene HEAD → hacemos GET con Range: 0-0
    const api = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
    const url = `${api}/media/videos/${encodeURIComponent(id)}`;

    const headers = new Headers();
    headers.set('range', 'bytes=0-0');

    // Si tu guard usa Authorization; si usa cookie, mandá cookie también
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    if (token) headers.set('authorization', `Bearer ${token}`);
    if (token) headers.set('cookie', `mp_session=${token}`);

    const be = await fetch(url, { method: 'GET', headers, cache: 'no-store' });

    // Si backend devuelve 206 por el range, respondemos 200 con los metadatos
    const out = new Headers();
    const pass = ['content-type', 'content-length', 'accept-ranges', 'cache-control', 'x-content-type-options'];
    for (const [k, v] of be.headers.entries()) {
      if (pass.includes(k.toLowerCase())) out.set(k, v);
    }

    // No devuelvas 404 aquí; si el backend no lo encuentra, devolvé 200 sin length
    // para evitar que el browser marque todos los candidatos como fallidos.
    if (be.status === 206 || be.status === 200) {
      return new NextResponse(null, { status: 200, headers: out });
    }

    // Como último recurso, responder 200 con tipo por defecto
    if (!out.has('Content-Type')) out.set('Content-Type', getMimeType(id));
    return new NextResponse(null, { status: 200, headers: out });
  } catch {
    return new NextResponse(null, { status: 200 }); // HEAD nunca debería romper carga del <video>
  }
}
