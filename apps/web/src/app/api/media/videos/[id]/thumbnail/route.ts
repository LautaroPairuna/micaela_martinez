export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stat } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';

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
  iat: number;
  exp: number;
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

function pickExistingThumbnail(baseNoExt: string): string | null {
  const suffixes = ['_thumbnail', '_thumb', ''];
  const exts = ['.jpg', '.png', '.webp'];
  for (const s of suffixes) {
    for (const e of exts) {
      const p = baseNoExt + s + e;
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function getThumbnailPath(videoId: string): string | null {
  const safe = videoId.replace(/[^a-zA-Z0-9._-]/g, '');
  const videosDir = join(process.cwd(), 'public', 'videos');
  const baseNoExt = join(videosDir, safe.replace(/\.[^/.]+$/, ''));
  return pickExistingThumbnail(baseNoExt);
}

function mimeFromExt(pathname: string): string {
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function placeholderSvg(videoId: string): string {
  const label = videoId.length > 28 ? videoId.slice(0, 25) + '…' : videoId;
  return `
    <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111827"/>
      <g transform="translate(160,90)">
        <circle r="34" fill="#1f2937" stroke="#374151" stroke-width="2"/>
        <polygon points="-12,-8 -12,8 12,0" fill="#9ca3af"/>
      </g>
      <text x="160" y="168" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="12">
        ${label}
      </text>
    </svg>
  `.trim();
}

/* ========= HANDLERS ========= */
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return new NextResponse('Video ID required', { status: 400 });

    // Sesión o token corto
    const token = new URL(req.url).searchParams.get('token');
    let ok = false;
    if (token) ok = validateVideoToken(token, id).valid;
    else ok = (await validateSession()).valid;

    if (!ok) return new NextResponse('Unauthorized', { status: 401 });

    const thumbPath = getThumbnailPath(id);
    if (!thumbPath) {
      // Placeholder SVG
      const svg = placeholderSvg(id);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=300',
          'X-Thumbnail-Type': 'placeholder',
        },
      });
    }

    const st = await stat(thumbPath);
    const stream = createReadStream(thumbPath);
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': mimeFromExt(thumbPath),
        'Content-Length': `${st.size}`,
        'Cache-Control': 'public, max-age=3600, immutable',
        ETag: `"${st.mtime.getTime()}-${st.size}"`,
        'Last-Modified': st.mtime.toUTCString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err) {
    console.error('[THUMB-API] error', err);
    const svg =
      `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ef4444"/><text x="160" y="95" text-anchor="middle" fill="#fff" font-size="14" font-family="Arial">Error</text></svg>`;
    return new NextResponse(svg, {
      status: 500,
      headers: { 'Content-Type': 'image/svg+xml', 'X-Thumbnail-Type': 'error' },
    });
  }
}

export async function HEAD(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return new NextResponse(null, { status: 400 });

    const token = new URL(req.url).searchParams.get('token');
    let ok = false;
    if (token) ok = validateVideoToken(token, id).valid;
    else ok = (await validateSession()).valid;

    if (!ok) return new NextResponse(null, { status: 401 });

    const thumbPath = getThumbnailPath(id);
    if (!thumbPath) {
      const svg = placeholderSvg(id);
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Length': `${Buffer.byteLength(svg, 'utf8')}`,
          'Cache-Control': 'public, max-age=300',
          'X-Thumbnail-Type': 'placeholder',
        },
      });
    }

    const st = await stat(thumbPath);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': mimeFromExt(thumbPath),
        'Content-Length': `${st.size}`,
        'Cache-Control': 'public, max-age=3600, immutable',
        ETag: `"${st.mtime.getTime()}-${st.size}"`,
        'Last-Modified': st.mtime.toUTCString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
