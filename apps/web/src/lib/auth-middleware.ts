// apps/web/src/lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { authCache } from './auth-cache';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nombre?: string;
  roles?: string[];
}

export interface AuthValidationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Middleware de autenticación para validar tokens JWT con el backend de NestJS
 * Utiliza cache de tokens para optimizar las validaciones
 */
export async function validateAuthToken(request: NextRequest): Promise<AuthValidationResult> {
  try {
    // Extraer token del header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token de autorización requerido' };
    }

    const token = authHeader.substring(7);

    // Intentar obtener datos del usuario desde el cache
    const cachedUserData = authCache.getCachedUserData(token);
    if (cachedUserData) {
      console.log('✅ Usuario autenticado desde cache:', cachedUserData.email);
      return { success: true, user: cachedUserData };
    }

    // Si no está en cache, validar token con el backend de NestJS
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
    const url = base.endsWith('/api') ? base : `${base}/api`;

    const authResponse = await fetch(`${url}/auth/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: authResponse.status === 401 ? 'Token inválido o expirado' : `Error de autenticación: ${errorText}`,
      };
    }

    const userData: unknown = await authResponse.json();

    // Mapear de forma segura a AuthenticatedUser
    let user: AuthenticatedUser = {
      id: '',
      email: '',
    };
    if (userData && typeof userData === 'object') {
      const u = userData as Record<string, unknown>;
      user = {
        id: String(u.id ?? u.userId ?? ''),
        email: String(u.email ?? ''),
        nombre: typeof u.nombre === 'string' ? u.nombre : (typeof u.name === 'string' ? u.name : undefined),
        roles: Array.isArray(u.roles) ? (u.roles as string[]) : [],
      };
    }

    // Cachear los datos del usuario con el token
    authCache.cacheUserData(token, user);

    console.log('✅ Usuario autenticado y cacheado:', user.email);

    return { success: true, user };
  } catch (error) {
    console.error('❌ Error validando token:', error);
    return { success: false, error: 'Error interno de autenticación' };
  }
}

/**
 * Wrapper para rutas protegidas que requieren autenticación
 */
export function withAuth<T extends unknown[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await validateAuthToken(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'No autorizado' },
        { status: 401 },
      );
    }

    console.log('✅ Usuario autenticado:', authResult.user.email);
    return handler(request, authResult.user, ...args);
  };
}

/**
 * Wrapper para rutas que requieren roles específicos
 */
export function withRoles<T extends unknown[]>(
  requiredRoles: string[],
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
) {
  return withAuth<T>(async (request: NextRequest, user: AuthenticatedUser, ...args: T) => {
    // Verificar si el usuario tiene al menos uno de los roles requeridos
    const hasRequiredRole = requiredRoles.some(
      (role) => user.roles?.includes(role) || user.roles?.includes('ADMIN'),
    );

    if (!hasRequiredRole) {
      return NextResponse.json({ success: false, error: 'Permisos insuficientes' }, { status: 403 });
    }

    return handler(request, user, ...args);
  });
}
