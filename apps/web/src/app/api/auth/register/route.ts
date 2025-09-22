export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/,'');
export async function POST(req: NextRequest) {
  const body = await req.text();
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body,
  });
  if (!r.ok) return new NextResponse(await r.text(), { status: r.status });
  const data = await r.json(); // { token, user, expiresIn? } según tu Nest
  const jar = await cookies();
  if (data?.token) {
    jar.set('mp_session', data.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: Number(data.expiresIn ?? 60*60*24*7),
    });
  }
  return NextResponse.json({ user: data.user }, { status: 200 });
}
