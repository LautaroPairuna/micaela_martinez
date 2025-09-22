// apps/web/src/app/api/reviews/[[...rest]]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxy } from '../../_proxy';

// Tipado "async params" (Next 15): params es un Promise
type Ctx = { params: Promise<{ rest?: string[] }> };

// Construye la ruta del backend para reviews
async function pathOf(ctx: Ctx) {
  const { rest } = await ctx.params;
  const tail = rest && rest.length ? `/${rest.join('/')}` : '';
  return `/reviews${tail}`;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, await pathOf(ctx));
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, await pathOf(ctx));
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, await pathOf(ctx));
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, await pathOf(ctx));
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, await pathOf(ctx));
}