'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { UsuarioMe } from '@/lib/sdk/userApi';
import { getMe, clearUserCache } from '@/lib/sdk/userApi';

type AuthContextType = {
  user: UsuarioMe | null;
  loading: boolean;
  setUser: (user: UsuarioMe | null) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  initialUser?: UsuarioMe | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<UsuarioMe | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [initialized, setInitialized] = useState(!!initialUser);

  const refreshUser = async () => {
    try {
      setLoading(true);
      // Limpiar caché antes de refrescar
      clearUserCache();
      
      // Forzar revalidación con timestamp para evitar caché
      const timestamp = new Date().getTime();
      const userData = await fetch(`/api/auth/me?t=${timestamp}`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        cache: 'no-store',
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
      
      // Actualizar el estado con los nuevos datos
      setUser(userData?.data || userData || null);
      console.log('Usuario actualizado:', userData?.data || userData);
    } catch (error) {
      // Manejar específicamente errores de autenticación (401)
      if (error instanceof Error && error.message.includes('HTTP 401')) {
        // Error 401 es esperado cuando no hay sesión válida
        setUser(null);
      } else {
        console.error('Error refreshing user:', error);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) return;

    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Forzar revalidación con timestamp para evitar caché
        const timestamp = new Date().getTime();
        const userData = await fetch(`/api/auth/me?t=${timestamp}`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
          cache: 'no-store',
          credentials: 'include'
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
        
        if (mounted) {
          setUser(userData?.data || userData || null);
          setInitialized(true);
          console.log('Sesión inicializada con usuario:', userData?.data || userData);
        }
      } catch (error) {
        // Manejar específicamente errores de autenticación (401)
        if (error instanceof Error && error.message.includes('HTTP 401')) {
          // Error 401 es esperado cuando no hay sesión válida - no logear como error
          if (mounted) {
            setUser(null);
            setInitialized(true);
          }
        } else {
          console.error('Error initializing auth:', error);
          if (mounted) {
            setUser(null);
            setInitialized(true);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [initialized]);

  const contextValue: AuthContextType = {
    user,
    loading,
    setUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook de compatibilidad para migración gradual
export function useSession() {
  const { user, loading, setUser } = useAuth();
  return {
    me: user,
    loading,
    setMe: setUser,
  };
}