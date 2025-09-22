// apps/web/src/lib/auth-cache.ts
import { AuthenticatedUser } from './auth-middleware';

interface CachedToken {
  token: string;
  expiresAt: number;
  userData?: AuthenticatedUser;
}

interface CachedUserData {
  user: AuthenticatedUser;
  cachedAt: number;
  expiresAt: number;
}

interface CachedSession {
  valid: boolean;
  userId?: string;
  timestamp: number;
  token: string;
}

interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  user?: AuthenticatedUser | null;
}

class AuthCache {
  private tokenCache = new Map<string, CachedToken>();
  private userDataCache = new Map<string, CachedUserData>();
  private readonly TOKEN_TTL = 15 * 60 * 1000; // 15 minutos
  private readonly USER_DATA_TTL = 5 * 60 * 1000; // 5 minutos para datos de usuario

  /**
   * Obtiene un token válido desde el cache o desde localStorage/cookies
   */
  async getValidToken(): Promise<string | null> {
    try {
      // 1. Intentar desde localStorage (cliente)
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken');
        if (token && this.isTokenValid(token)) {
          return token;
        }
      }

      // 2. Intentar desde cookies (servidor)
      if (typeof window === 'undefined') {
        try {
          const { cookies } = await import('next/headers');
          const cookieStore = await cookies();
          const token = cookieStore.get('authToken')?.value ?? cookieStore.get('mp_session')?.value;
          if (token && this.isTokenValid(token)) {
            return token;
          }
        } catch (error) {
          console.warn('⚠️ No se pudo acceder a cookies del servidor:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error obteniendo token:', error);
      return null;
    }
  }

  /**
   * Valida si un token está en cache y no ha expirado
   */
  private isTokenValid(token: string): boolean {
    const cached = this.tokenCache.get(token);
    if (!cached) {
      // Si no está en cache, asumir que es válido y lo validaremos después
      return true;
    }

    const isValid = cached.expiresAt > Date.now();
    if (!isValid) {
      this.tokenCache.delete(token);
      this.userDataCache.delete(token);
    }

    return isValid;
  }

  /**
   * Cachea un token con su TTL
   */
  cacheToken(token: string, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.TOKEN_TTL);
    this.tokenCache.set(token, { token, expiresAt });
  }

  /**
   * Cachea datos de usuario asociados a un token
   */
  cacheUserData(token: string, userData: AuthenticatedUser): void {
    const expiresAt = Date.now() + this.USER_DATA_TTL;
    this.userDataCache.set(token, {
      user: userData,
      cachedAt: Date.now(),
      expiresAt,
    });

    // También cachear el token si no está cacheado
    if (!this.tokenCache.has(token)) {
      this.cacheToken(token);
    }
  }

  /**
   * Obtiene datos de usuario cacheados para un token
   */
  getCachedUserData(token: string): AuthenticatedUser | null {
    const cached = this.userDataCache.get(token);
    if (!cached) return null;

    // Verificar si los datos han expirado
    if (cached.expiresAt <= Date.now()) {
      this.userDataCache.delete(token);
      return null;
    }

    return cached.user;
  }

  /**
   * Invalida todo el cache (útil para logout)
   */
  invalidateAll(): void {
    this.tokenCache.clear();
    this.userDataCache.clear();

    // Limpiar también localStorage si estamos en el cliente
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
    }

    console.log('🧹 Cache de autenticación limpiado');
  }

  /**
   * Invalida cache para un token específico
   */
  invalidateToken(token: string): void {
    this.tokenCache.delete(token);
    this.userDataCache.delete(token);
  }

  /**
   * Obtiene headers de autorización con token cacheado
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Limpia tokens expirados del cache (mantenimiento)
   */
  cleanup(): void {
    const now = Date.now();

    // Limpiar tokens expirados
    for (const [token, cached] of this.tokenCache.entries()) {
      if (cached.expiresAt <= now) this.tokenCache.delete(token);
    }

    // Limpiar datos de usuario expirados
    for (const [token, cached] of this.userDataCache.entries()) {
      if (cached.expiresAt <= now) this.userDataCache.delete(token);
    }
  }
}

class AuthCacheService {
  private cache = new Map<string, CachedSession>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutos en milisegundos
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Obtiene y valida un token de autenticación con cache
   */
  async validateToken(token?: string): Promise<TokenValidationResult> {
    try {
      // Si no se proporciona token, intentar obtenerlo
      if (!token) {
        token = (await this.getValidToken()) ?? undefined;
      }
      if (!token) return { valid: false };

      // Verificar cache primero
      const cached = this.cache.get(token);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.TTL) {
        console.log('[AUTH-CACHE] Using cached validation result');
        return { valid: cached.valid, userId: cached.userId };
        // Nota: `user` no se guarda en este cache; lo maneja AuthCache
      }

      // Validar token contra el backend
      const result = await this.validateTokenWithBackend(token);

      // Cachear resultado
      this.cache.set(token, {
        valid: result.valid,
        userId: result.userId,
        timestamp: now,
        token,
      });

      // Limpiar cache si es necesario
      this.cleanupCache();

      return result;
    } catch (error) {
      console.error('[AUTH-CACHE] Token validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Valida el token directamente con el backend
   */
  private async validateTokenWithBackend(token: string): Promise<TokenValidationResult> {
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001')
      .trim()
      .replace(/\/+$/, '')
      .replace('://localhost', '://127.0.0.1');

    const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

    console.log('[AUTH-CACHE] Validating token with backend:', `${apiUrl}/users/me`);

    const response = await fetch(`${apiUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const userData: unknown = await response.json();
      console.log('[AUTH-CACHE] Token validation successful');

      // Intentar mapear a AuthenticatedUser
      let mapped: AuthenticatedUser | null = null;
      if (userData && typeof userData === 'object') {
        const u = userData as Record<string, unknown>;
        mapped = {
          id: String(u.id ?? u.userId ?? ''),
          email: String(u.email ?? ''),
          nombre: typeof u.nombre === 'string' ? u.nombre : (typeof u.name === 'string' ? u.name : undefined),
          roles: Array.isArray(u.roles) ? (u.roles as string[]) : [],
        };
      }

      return {
        valid: true,
        userId: mapped?.id ?? undefined,
        user: mapped,
      };
    }

    console.log('[AUTH-CACHE] Token validation failed with status:', response.status);
    return { valid: false };
  }

  /**
   * Obtiene un token válido para uso en adminApi
   */
  async getValidToken(): Promise<string | null> {
    try {
      // Primero intentar desde localStorage (cliente)
      if (typeof window !== 'undefined') {
        const clientToken = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
        if (clientToken) {
          const validation = await this.validateToken(clientToken);
          if (validation.valid) return clientToken;
          // Token inválido, limpiarlo
          localStorage.removeItem('auth_token');
          localStorage.removeItem('authToken');
        }
      }

      // Intentar desde cookies (servidor)
      if (typeof window === 'undefined') {
        try {
          const { cookies } = await import('next/headers');
          const jar = await cookies();
          const serverToken = jar.get('mp_session')?.value ?? jar.get('authToken')?.value;

          if (serverToken) {
            const validation = await this.validateToken(serverToken);
            if (validation.valid) {
              return serverToken;
            }
          }
        } catch (error) {
          console.warn('⚠️ No se pudo acceder a cookies del servidor:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('[AUTH-CACHE] Error getting valid token:', error);
      return null;
    }
  }

  /**
   * Invalida un token específico del cache
   */
  invalidateToken(token: string): void {
    this.cache.delete(token);
    console.log('[AUTH-CACHE] Token invalidated from cache');
  }

  /**
   * Limpia todo el cache (útil para logout)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[AUTH-CACHE] Cache cleared');
  }

  /**
   * Limpia entradas expiradas del cache
   */
  private cleanupCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.TTL) expiredKeys.push(key);
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    // Si aún hay demasiadas entradas, eliminar las más antiguas
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }

    console.log('[AUTH-CACHE] Cache cleanup completed, size:', this.cache.size);
  }

  /**
   * Obtiene estadísticas del cache (para debugging)
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.TTL,
      entries: Array.from(this.cache.entries()).map(([token, entry]) => ({
        token: token.substring(0, 10) + '...',
        valid: entry.valid,
        age: Date.now() - entry.timestamp,
        userId: entry.userId,
      })),
    };
  }
}

// Instancia singleton
export const authCache = new AuthCache();
export const authCacheService = new AuthCacheService();

// Limpiar cache cada 5 minutos (solo en cliente)
if (typeof window !== 'undefined') {
  setInterval(() => {
    authCache.cleanup();
  }, 5 * 60 * 1000);
}

// Funciones de conveniencia para compatibilidad
export async function validateSession(): Promise<{ valid: boolean; userId?: string }> {
  const res = await authCacheService.validateToken();
  return { valid: res.valid, userId: res.userId };
}

export async function getAuthToken(): Promise<string | null> {
  return authCache.getValidToken();
}
