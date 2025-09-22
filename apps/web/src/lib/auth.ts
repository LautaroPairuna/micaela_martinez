export async function login(email: string, password: string) {
  try {
    // 1. Limpiar estado previo antes del login
    if (typeof window !== 'undefined') {
      // Importar dinámicamente para evitar problemas de SSR
      const { useFavorites } = await import('@/store/favorites');
      const { useCheckout } = await import('@/store/checkout');
      
      // Limpiar stores de usuario anterior
      useFavorites.getState().reset();
      useCheckout.getState().reset();
      
      // Limpiar datos de sesión anterior en localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('session') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // 2. Realizar login en el servidor
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!r.ok) throw new Error(await r.text());
    
    const result = await r.json();
    
    // 3. Obtener el token directamente del backend para adminApi
    try {
      const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.accessToken && typeof window !== 'undefined') {
          // Guardar token para adminApi
          localStorage.setItem('auth_token', tokenData.accessToken);
          
          // Importar y configurar adminApi
          const { adminApi } = await import('@/lib/sdk/adminApi');
          adminApi.setToken(tokenData.accessToken);
        }
      }
    } catch (error) {
      console.warn('No se pudo obtener token para adminApi:', error);
    }
    
    // 4. El estado del nuevo usuario se cargará automáticamente
    // via useSession y los stores se inicializarán con los datos correctos
    
    return result; // { user }
    
  } catch (error) {
    // En caso de error, asegurar que no queden datos inconsistentes
    if (typeof window !== 'undefined') {
      try {
        const { useFavorites } = await import('@/store/favorites');
        const { useCheckout } = await import('@/store/checkout');
        useFavorites.getState().reset();
        useCheckout.getState().reset();
      } catch {}
    }
    throw error;
  }
}

export async function register(payload: { email: string; password: string; nombre: string }) {
  try {
    // 1. Limpiar estado previo antes del registro
    if (typeof window !== 'undefined') {
      // Importar dinámicamente para evitar problemas de SSR
      const { useFavorites } = await import('@/store/favorites');
      const { useCheckout } = await import('@/store/checkout');
      
      // Limpiar stores de usuario anterior
      useFavorites.getState().reset();
      useCheckout.getState().reset();
      
      // Limpiar datos de sesión anterior en localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('session') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // 2. Realizar registro en el servidor
    const r = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!r.ok) throw new Error(await r.text());
    
    const result = r.json();
    
    // 3. El estado del nuevo usuario se cargará automáticamente
    // via useSession y los stores se inicializarán con los datos correctos
    
    return result; // { user }
    
  } catch (error) {
    // En caso de error, asegurar que no queden datos inconsistentes
    if (typeof window !== 'undefined') {
      try {
        const { useFavorites } = await import('@/store/favorites');
        const { useCheckout } = await import('@/store/checkout');
        useFavorites.getState().reset();
        useCheckout.getState().reset();
      } catch {}
    }
    throw error;
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem('auth_token');
}

export async function logout() {
  try {
    // 1. Invalidar cache de autenticación ANTES de limpiar localStorage
    const { authCache } = await import('./auth-cache');
    authCache.invalidateAll();
    
    // 2. Llamar al endpoint de logout del servidor
    await fetch('/api/session', { method: 'DELETE' });
    
    // 3. Limpiar stores de Zustand del cliente
    // Importar dinámicamente para evitar problemas de SSR
    const { useFavorites } = await import('@/store/favorites');
    const { useCheckout } = await import('@/store/checkout');
    
    // Limpiar favoritos (datos específicos del usuario)
    useFavorites.getState().reset();
    
    // Limpiar checkout (datos de proceso de compra)
    useCheckout.getState().reset();
    
    // Nota: El carrito se mantiene intencionalmente para mejor UX
    // Si se desea limpiar también: useCart.getState().clear();
    
    // 4. Limpiar cualquier cache de localStorage/sessionStorage relacionado con auth
    if (typeof window !== 'undefined') {
      // Limpiar posibles tokens o datos de auth en localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('session') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Limpiar sessionStorage también
      sessionStorage.clear();
      
      // 5. Forzar recarga de la página para limpiar cualquier estado residual
      // Esto asegura que todos los componentes se reinicialicen correctamente
      window.location.href = '/';
    }
    
  } catch (error) {
    console.error('Error durante logout:', error);
    // Aún así intentar limpiar el estado local y redirigir
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  }
}
