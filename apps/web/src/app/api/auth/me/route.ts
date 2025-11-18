// apps/web/src/app/api/auth/me/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'No autenticado' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar token con el backend
    const response = await fetch(`${API_BASE}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({ error: 'Token inválido' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = await response.json();
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Error interno del servidor' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}