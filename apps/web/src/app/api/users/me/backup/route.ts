// apps/web/src/app/api/users/me/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { proxy } from '../../../_proxy'; // ← desde users/me a api/_proxy.ts = ../../_proxy

export function GET(req: NextRequest)   { return proxy(req, '/users/me'); }
export function PATCH(req: NextRequest) { return proxy(req, '/users/me'); }
