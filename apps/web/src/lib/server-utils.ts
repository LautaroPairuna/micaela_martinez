// src/lib/server-utils.ts
import { headers, cookies } from 'next/headers';

/**
 * Utilidad para obtener headers de manera segura durante SSR
 * Maneja correctamente el contexto async y evita errores de Dynamic Server Usage
 */
export async function getServerHeaders(): Promise<Record<string, string> | undefined> {
  // Solo en servidor
  if (typeof window !== 'undefined') return undefined;
  
  try {
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
 * Maneja correctamente el contexto async y evita errores de Dynamic Server Usage
 */
export async function getServerCookies(): Promise<string | undefined> {
  // Solo en servidor
  if (typeof window !== 'undefined') return undefined;
  
  try {
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