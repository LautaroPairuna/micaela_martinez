// apps/web/src/app/api/users/me/[[...rest]]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { proxy } from '../../../_proxy';

// Tipado "async params" (Next 15): params es un Promise
type Ctx = { params: Promise<{ rest?: string[] }> };

// Construye la ruta del backend, SIEMPRE incluyendo /users/me
async function pathOf(ctx: Ctx) {
  const { rest } = await ctx.params;               // ← await params
  const tail = rest && rest.length ? `/${rest.join('/')}` : '';
  const path = `/users/me${tail}`;                 // ← incluye /me
  
  // Log para diagnóstico de favoritos
  console.log(`[CATCH-ALL] Construyendo path:`, {
    rest,
    tail,
    finalPath: path,
    timestamp: new Date().toISOString()
  });
  
  return path;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const path = await pathOf(ctx);
  
  // Log específico para favoritos
  if (path.includes('favorites')) {
    console.log(`[CATCH-ALL GET] Petición de favoritos:`, {
      url: req.url,
      path,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    });
  }
  
  const response = await proxy(req, path);
  
  // Log de respuesta para favoritos
  if (path.includes('favorites')) {
    console.log(`[CATCH-ALL GET] Respuesta de favoritos:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    });
  }
  
  return response;
}
export async function POST(req: NextRequest, ctx: Ctx) {
  const path = await pathOf(ctx);
  
  // Log específico para favoritos
  if (path.includes('favorites')) {
    console.log(`[CATCH-ALL POST] Petición de favoritos:`, {
      url: req.url,
      path,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const response = await proxy(req, path);
    
    // Log de respuesta para favoritos
    if (path.includes('favorites')) {
      console.log(`[CATCH-ALL POST] Respuesta de favoritos:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });
    }
    
    return response;
  } catch (error) {
    console.error(`[CATCH-ALL POST] Error en proxy:`, {
      path,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        statusCode: 500, 
        message: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
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
