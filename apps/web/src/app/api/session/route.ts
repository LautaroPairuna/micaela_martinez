import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { token, maxAge } = await req.json().catch(() => ({}));
  if (!token) return new Response('Missing token', { status: 400 });

  const jar = await cookies(); // << 👈 importante
  jar.set('mp_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Number(maxAge ?? 60 * 60 * 24 * 7), // 7 días
  });

  return new Response(null, { status: 204 });
}

export async function DELETE() {
  const jar = await cookies(); // << 👈 importante
  jar.delete('mp_session');
  return new Response(null, { status: 204 });
}
