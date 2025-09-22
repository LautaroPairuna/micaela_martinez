import { NextRequest } from 'next/server';
// Proxy hacia el backend para actualizar progreso de lecciones
import { proxy } from '../../../../_proxy';

export function POST(req: NextRequest) {
  // Proxy → Nest: /api/users/me/enrollments/progress
  return proxy(req, '/users/me/enrollments/progress');
}