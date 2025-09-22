export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stat } from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

/* ========= Config ========= */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
  .trim()
  .replace(/\/+$/, '')
  .replace('://localhost', '://127.0.0.1');

/* ========= Tipos ========= */
type SessionResult = { valid: boolean; userId?: string };

type VideoTokenPayload = {
  videoId: string;
  userId?: string;
  iat: number; // issued at (epoch seconds)
  exp: number; // expiry (epoch seconds)
  jti?: string;
};

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

function b64json<T = unknown>(b64: string): T {
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as T;
}

function isVideoTokenPayload(u: unknown): u is VideoTokenPayload {
  if (typeof u !== 'object' || u === null) return false;
  const o = u as Record<string, unknown>;
  return (
    typeof o.videoId === 'string' &&
    (o.userId === undefined || typeof o.userId === 'string') &&
    typeof o.iat === 'number' &&
    typeof o.exp === 'number'
  );
}

function validateVideoToken(
  token: string,
  videoId: string
): { valid: boolean; userId?: string } {
  try {
    const payloadUnknown = b64json<unknown>(token);
    if (!isVideoTokenPayload(payloadUnknown)) return { valid: false };

    const payload = payloadUnknown;
    const now = Math.floor(Date.now() / 1000);

    if (payload.videoId !== videoId) return { valid: false };
    if (now > payload.exp) return { valid: false };

    return { valid: true, userId: payload.userId };
  } catch {
    return { valid: false };
  }
}

function buildShortLivedToken(videoId: string, userId?: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: VideoTokenPayload = {
    videoId,
    userId,
    iat: now,
    exp: now + 20 * 60,
    jti: crypto.randomUUID(),
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function validateOrigin(req: NextRequest): boolean {
  const referer = req.headers.get('referer');
  const origin = req.headers.get('origin');
  const host = req.headers.get('host') || '';

  const allowed = [
    'localhost',
    '127.0.0.1',
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/^https?:\/\//, ''),
  ].filter(Boolean);

  const check = (url?: string | null) =>
    !!url && allowed.some(d => url.includes(d)) && url.includes(host);

  if (!origin && !referer) return false;
  if (check(origin) || check(referer)) return true;

  // Relajar un poco para dev local
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
  const bad = [
    'wget', 'curl', 'python', 'requests', 'urllib', 'httpie',
    'bot', 'crawler', 'spider', 'scraper', 'downloader',
    'aria2', 'axel', 'youtube-dl', 'yt-dlp', 'ffmpeg',
    'postman', 'insomnia', 'thunder client'
  ];
  if (bad.some(x => ua.includes(x))) return false;
  const ok = ['mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera'];
  return ok.some(x => ua.includes(x));
}

function validateClientIP(req: NextRequest): boolean {
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  if (!ip) return true; // no bloquear en dev
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) return true;
  return true;
}

const rateMap = new Map<string, { count: number; reset: number }>();
function checkRateLimit(id: string, max = 100, windowMs = 60_000) {
  const now = Date.now();
  const e = rateMap.get(id);
  if (!e || now > e.reset) {
    rateMap.set(id, { count: 1, reset: now + windowMs });
    return true;
  }
  if (e.count >= max) return false;
  e.count++;
  return true;
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'webm': return 'video/webm';
    case 'ogg': return 'video/ogg';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    default: return 'video/mp4';
  }
}

async function getVideoPathLocal(videoId: string): Promise<string | null> {
  const safe = videoId.replace(/[^a-zA-Z0-9._-]/g, '');
  const base = join(process.cwd(), 'public', 'videos', 'leccion');
  const full = join(base, safe);
  return existsSync(full) ? full : null;
}

/* ========= HANDLERS ========= */

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return new NextResponse('Video ID required', { status: 400 });

    // Anti-abuso
    if (!validateOrigin(req))  return new NextResponse('Forbidden (origin)', { status: 403 });
    if (!validateUserAgent(req)) return new NextResponse('Forbidden (ua)', { status: 403 });
    if (!validateClientIP(req))  return new NextResponse('Forbidden (ip)', { status: 403 });

    // Sesión
    const session = await validateSession();
    if (!session.valid) return new NextResponse('Unauthorized', { status: 401 });

    // Token temporal (opcional)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (token) {
      const tk = validateVideoToken(token, id);
      if (!tk.valid) return new NextResponse('Invalid token', { status: 403 });
    }

    // Rate limit
    const idKey = session.userId || (req.headers.get('x-forwarded-for') || 'anon');
    if (!checkRateLimit(idKey)) return new NextResponse('Too many requests', { status: 429 });

    // Buscar local
    const localPath = await getVideoPathLocal(id);
    if (!localPath) {
      // Redirige 307 a backend /api/media (next.config lo proxy-a)
      const target = new URL(`/api/media/videos/${encodeURIComponent(id)}`, req.url);
      target.searchParams.set('token', token || buildShortLivedToken(id, session.userId));
      return NextResponse.redirect(target.toString(), 307);
    }

    // Stream con/ sin Range
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
        },
      });
    }

    // Completo por stream
    const stream = createReadStream(localPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': `${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[VIDEO-API] error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  try {
    const session = await validateSession();
    if (!session.valid) return new NextResponse(null, { status: 401 });

    const { id } = await ctx.params;
    if (!id) return new NextResponse(null, { status: 400 });

    const localPath = await getVideoPathLocal(id);
    if (!localPath) {
      // indicar al cliente que haga GET normal (que luego redirigirá al backend)
      return new NextResponse(null, { status: 404 });
    }

    const st = await stat(localPath);
    const mime = getMimeType(id);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': `${st.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
