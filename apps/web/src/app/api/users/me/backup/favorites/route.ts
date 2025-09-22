import { NextRequest } from 'next/server';
import { proxy } from '../../../../_proxy';

export function GET(req: NextRequest) {
  return proxy(req, '/users/me/favorites');
}
export function POST(req: NextRequest) {
  return proxy(req, '/users/me/favorites');
}
