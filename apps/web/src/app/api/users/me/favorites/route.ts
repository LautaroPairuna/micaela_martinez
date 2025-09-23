// d:\wamp64\www\mica_pestanas\apps\web\src\app\api\users\me\favorites\route.ts
import { NextResponse } from 'next/server';
import { apiProxy } from '@/lib/api-proxy';

export async function GET(req: Request) {
  try {
    const data = await apiProxy('/users/me/favorites', { cache: 'no-store' });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en el proxy de /api/users/me/favorites:', error);
    // @ts-ignore
    const status = error.status || 500;
    return NextResponse.json(
      // @ts-ignore
      { error: 'Error al obtener favoritos', details: error.message },
      { status }
    );
  }
}