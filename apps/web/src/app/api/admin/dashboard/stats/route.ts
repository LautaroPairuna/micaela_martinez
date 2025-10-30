// src/app/api/admin/dashboard/stats/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxy } from '../../../_proxy';

// Proxy directo al backend para obtener las estadísticas del dashboard admin
export async function GET(request: NextRequest) {
  try {
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No autenticado - Token requerido', errorType: 'auth' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return proxy(request, '/admin/dashboard/stats');
  } catch (error) {
    console.error('Error en GET /api/admin/dashboard/stats:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}