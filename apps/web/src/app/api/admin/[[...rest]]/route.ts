import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { proxy } from '../../_proxy';

// Verificar autenticación y roles de admin
async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('mp_session');
  
  if (!sessionCookie?.value) {
    return { authenticated: false, error: 'No autenticado - Token requerido' };
  }

  try {
    // Decodificar el JWT para verificar roles
    const payload = JSON.parse(atob(sessionCookie.value.split('.')[1]));
    const hasAdminRole = payload.roles?.includes('ADMIN') || payload.roles?.includes('STAFF');
    
    if (!hasAdminRole) {
      return { authenticated: false, error: 'Acceso denegado - Permisos insuficientes' };
    }
    
    return { authenticated: true, user: payload };
  } catch (error) {
    return { authenticated: false, error: 'Token inválido' };
  }
}

/**
 * Proxy para endpoints administrativos
 * Redirige todas las llamadas a /api/admin/* al backend real
 * Utiliza el sistema de proxy existente para mantener consistencia
 */

export async function GET(request: NextRequest) {
  return handleAdminProxy(request);
}

export async function POST(request: NextRequest) {
  return handleAdminProxy(request);
}

export async function PUT(request: NextRequest) {
  return handleAdminProxy(request);
}

export async function DELETE(request: NextRequest) {
  return handleAdminProxy(request);
}

export async function PATCH(request: NextRequest) {
  return handleAdminProxy(request);
}

async function handleAdminProxy(request: NextRequest) {
  try {
    // Verificar autenticación mediante cookie
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    
    if (!token) {
      console.warn('🚫 [Admin Proxy] No token found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No autenticado - Token requerido',
          errorType: 'auth'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Extraer la ruta admin del pathname
    const pathname = request.nextUrl.pathname;
    const adminPath = pathname.replace('/api/admin', '/admin');
    
    console.log(`🔄 [Admin Proxy] ${request.method} ${pathname} -> ${adminPath}`);

    // Usar el proxy existente que ya maneja autenticación y headers
    const response = await proxy(request, adminPath);
    
    // Verificar si la respuesta indica falta de permisos administrativos
    if (response.status === 403) {
      const responseText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: 'Acceso denegado' };
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Acceso denegado - Se requieren permisos administrativos',
          errorType: 'permission',
          details: {
            originalError: errorData.message,
            endpoint: adminPath,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Para respuestas exitosas, agregar headers de cache específicos para admin
    if (response.ok) {
      const responseData = await response.text();
      
      return new Response(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Admin-Proxy': 'true'
        }
      });
    }

    // Para otros errores, devolver la respuesta tal como viene del proxy
    return response;

  } catch (error) {
    console.error('🚨 [Admin Proxy] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del proxy administrativo',
        errorType: 'network',
        details: {
          message: error instanceof Error ? error.message : 'Error desconocido',
          endpoint: request.nextUrl.pathname,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}