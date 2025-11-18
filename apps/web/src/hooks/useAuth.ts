// src/hooks/useAuth.ts

import { useState, useEffect } from 'react';
import { adminApi } from '../lib/sdk/adminApi';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Intentar obtener el usuario actual
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Configurar token en adminApi si está disponible
        const token = localStorage.getItem('auth_token');
        if (token) {
          adminApi.setToken(token);
        }

        setAuthState({
          user: userData.data || userData,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        // Usuario no autenticado
        adminApi.clearToken();
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      adminApi.clearToken();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Error verificando autenticación'
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Guardar token si está disponible
        if (data.accessToken) {
          localStorage.setItem('auth_token', data.accessToken);
          adminApi.setToken(data.accessToken);
        }

        // Actualizar estado de usuario
        await checkAuthStatus();
        return { success: true };
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Error en el login';
        
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }));
        
        return { success: false, error: errorMessage };
      }
    } catch {
      const errorMessage = 'Error de conexión';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // 1. Invalidar cache de autenticación ANTES de limpiar localStorage
      const { authCache } = await import('../lib/auth-cache');
      authCache.invalidateAll();
      
      // El endpoint correcto para borrar la cookie de sesión es /api/session (DELETE)
      await fetch('/api/session', { method: 'DELETE', credentials: 'include' });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar estado local independientemente del resultado
      localStorage.removeItem('auth_token');
      // Limpiar posibles restos de sesión en storage
      try {
        sessionStorage.clear();
        // Limpiar progresos locales/estado sensible vinculado al usuario
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('auth') || key.includes('session') || key.includes('token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch {}
      adminApi.clearToken();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  };

  const hasRole = (role: string): boolean => {
    return authState.user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const isAdmin = (): boolean => {
    return hasRole('ADMIN');
  };

  const isStaff = (): boolean => {
    return hasAnyRole(['ADMIN', 'STAFF']);
  };

  return {
    ...authState,
    login,
    logout,
    checkAuthStatus,
    hasRole,
    hasAnyRole,
    isAdmin,
    isStaff
  };
}

export default useAuth;