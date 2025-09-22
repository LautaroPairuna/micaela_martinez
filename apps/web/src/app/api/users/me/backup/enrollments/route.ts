import { NextRequest } from 'next/server';
// 👇 desde /api/users/me/enrollments/ hasta /api/_proxy.ts son 3 niveles
import { proxy } from '../../../../_proxy';

export function GET(req: NextRequest) {
  // Proxy → Nest: /api/users/me/enrollments
  return proxy(req, '/users/me/enrollments');
}
