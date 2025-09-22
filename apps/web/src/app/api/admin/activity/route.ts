// src/app/api/admin/activity/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxy } from '../../_proxy';

/**
 * Endpoint para registrar actividad del sistema administrativo
 * Redirige al backend real usando el sistema de proxy
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación mediante cookie
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    
    if (!token) {
      console.warn('🚫 [Activity API] No token found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No autenticado - Token requerido',
          errorType: 'auth'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Redirigir al endpoint de actividad en el backend
    return proxy(request, '/admin/activity');
  } catch (error) {
    console.error('Error en /api/admin/activity:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}