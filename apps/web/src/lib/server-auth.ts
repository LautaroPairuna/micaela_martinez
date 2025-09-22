import { cookies } from 'next/headers';
import { getMe } from '@/lib/sdk/userApi';
import type { UsuarioMe } from '@/lib/sdk/userApi';

export type ServerSession = {
  user: UsuarioMe;
} | null;

/**
 * Función de autenticación del lado del servidor
 * Lee las cookies y valida la sesión del usuario
 */
export async function auth(): Promise<ServerSession> {
  try {
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    
    if (!token) {
      return null;
    }
    
    // Usar getMe que ya maneja la autenticación con el token
    const user = await getMe({ cache: 'no-store' });
    
    if (!user) {
      return null;
    }
    
    return { user };
  } catch (error) {
    // Manejar específicamente errores de autenticación (401)
    if (error instanceof Error && error.message.includes('HTTP 401')) {
      // Error 401 es esperado cuando no hay sesión válida
      return null;
    }
    
    // Log otros errores pero no fallar
    console.error('Error in server auth:', error);
    return null;
  }
}