// src/lib/server-utils.ts

/**
 * Utilidad para obtener headers de manera segura durante SSR
 * Compatible con App Router - debe ser llamada desde Server Components o Route Handlers
 */
export async function getServerHeaders(): Promise<Record<string, string> | undefined> {
  // Solo en servidor
  if (typeof window !== 'undefined') return undefined;
  
  try {
    // Importación dinámica para evitar problemas de bundling
    const { headers } = await import('next/headers');
    
    // Obtener headers en contexto async correcto
    const headersList = await headers();
    const cookie = headersList.get('cookie') || '';
    
    const hdrs: Record<string, string> = {};
    if (cookie) hdrs.cookie = cookie;
    return hdrs;
  } catch (error) {
    // Si falla (ej: en rutas estáticas o fuera del contexto de request), continuar sin headers
    console.warn('Failed to get server headers, continuing without cookies:', error);
    return undefined;
  }
}

/**
 * Utilidad para obtener cookies de manera segura durante SSR
 * Compatible con App Router - debe ser llamada desde Server Components o Route Handlers
 */
export async function getServerCookies(): Promise<string | undefined> {
  // Solo en servidor
  if (typeof window !== 'undefined') return undefined;
  
  try {
    // Importación dinámica para evitar problemas de bundling
    const { cookies } = await import('next/headers');
    
    // Obtener cookies en contexto async correcto
    const cookieStore = await cookies();
    return cookieStore.get('mp_session')?.value;
  } catch (error) {
    // Si falla (ej: en rutas estáticas o fuera del contexto de request), continuar sin cookies
    console.warn('Failed to get server cookies, continuing without session:', error);
    return undefined;
  }
}

/**
 * Verifica si estamos en un contexto de request válido para usar headers/cookies
 */
export function isValidRequestContext(): boolean {
  return typeof window === 'undefined';
}

/**
 * Alternativa para obtener headers desde el contexto de request
 * Útil cuando se pasan headers explícitamente desde Server Components
 */
export function extractCookieFromHeaders(headers: Record<string, string>): string | undefined {
  return headers.cookie;
}

/**
 * Extrae una cookie específica de una cadena de cookies
 */
export function parseCookieValue(cookieString: string, cookieName: string): string | undefined {
  if (!cookieString) return undefined;
  
  const cookies = cookieString.split(';').map(c => c.trim());
  const targetCookie = cookies.find(c => c.startsWith(`${cookieName}=`));
  
  return targetCookie ? targetCookie.split('=')[1] : undefined;
}