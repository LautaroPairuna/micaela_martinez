// d:\wamp64\www\mica_pestanas\apps\web\src\app\api\users\me\favorites\route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '../../../_proxy';

// Usamos proxy directo en lugar de apiProxy para evitar problemas de URL
export function GET(req: NextRequest) {
  console.log('[FAVORITES] GET request received');
  return proxy(req, '/users/me/favorites');
}

export async function POST(req: NextRequest) {
  try {
    console.log('[FAVORITES] POST request received');
    
    // Crear una nueva Request para el proxy sin leer el body aquí
    const result = await proxy(req, '/users/me/favorites');
    console.log('[FAVORITES] Proxy result status:', result.status);
    
    return result;
  } catch (error) {
    console.error('[FAVORITES] Error in POST:', error);
    return NextResponse.json(
      { error: 'Error interno en favoritos', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}