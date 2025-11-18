// apps/web/src/app/api/debug/env/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  // Solo en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_INTERNAL_URL: process.env.BACKEND_INTERNAL_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };

  return NextResponse.json(envVars);
}