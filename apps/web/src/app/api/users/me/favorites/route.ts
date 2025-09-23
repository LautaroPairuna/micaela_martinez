// d:\wamp64\www\mica_pestanas\apps\web\src\app\api\users\me\favorites\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '../../../_proxy';

// Usamos proxy directo en lugar de apiProxy para evitar problemas de URL
export function GET(req: NextRequest) {
  return proxy(req, '/users/me/favorites');
}