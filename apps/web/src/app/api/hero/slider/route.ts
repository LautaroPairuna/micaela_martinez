// apps/web/src/app/api/hero/slider/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxy } from '../../_proxy';

export function GET(req: NextRequest) {
  // ✅ AJUSTÁ ESTE PATH AL BACKEND:
  // si tu backend expone GET /api/hero/slider
  return proxy(req, '/hero/slider');

  // si fuera GET /api/slider:
  // return proxy(req, '/slider');
}
