// apps/web/src/app/api/auth/login/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
function computeApiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
    .trim()
    .replace(/\/+$/, '');
  // Forzar IPv4 si alguien puso "localhost"
  const hostFixed = raw.replace('://localhost', '://127.0.0.1');
  return hostFixed.endsWith('/api') ? hostFixed : `${hostFixed}/api`;
}
const API_BASE = computeApiBase();

type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: unknown;
};

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Tu Nest expone /api/auth/login (por setGlobalPrefix('api'))
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body,
  });

  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    return new NextResponse(msg || 'Login failed', { status: r.status });
  }

  // Backend devuelve { accessToken, refreshToken, user }
  const data: LoginResponse = await r.json();
  const accessToken = data?.accessToken;
  const refreshToken = data?.refreshToken;

  if (!accessToken) {
    return new NextResponse('Missing accessToken', { status: 500 });
  }

  const jar = await cookies();
  jar.set('mp_session', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7d
  });

  if (refreshToken) {
    jar.set('mp_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  // devolvemos sólo el user
  return NextResponse.json({ user: data.user }, { status: 200 });
}
