// d:\wamp64\www\mica_pestanas\apps\web\src\app\api\users\me\favorites\route.ts
import { NextResponse } from 'next/server';
import { apiProxy } from '@/lib/api-proxy';

export async function GET() {
  try {
    const data = await apiProxy('/users/me/favorites', { cache: 'no-store' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en el proxy de /api/users/me/favorites:', error);
    // @ts-expect-error - El error puede no tener una propiedad status tipada
    const status = error.status || 500;
    return NextResponse.json(
      // @ts-expect-error - El error puede no tener una propiedad message tipada
      { error: 'Error al obtener favoritos', details: error.message },
      { status }
    );
  }
}