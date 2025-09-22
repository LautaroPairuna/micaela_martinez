// apps/web/src/app/api/hero/images/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxy } from '../../_proxy';

export function GET(req: NextRequest) {
  return proxy(req, '/hero/images');
}