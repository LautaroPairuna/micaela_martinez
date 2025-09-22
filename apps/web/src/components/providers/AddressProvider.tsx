'use client';

import { useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { listAddresses } from '@/lib/sdk/userApi';
import { useCheckout } from '@/store/checkout';

export function AddressProvider({ children }: { children: React.ReactNode }) {
  const { me, loading } = useSession();
  const { setShippingAddress, reset } = useCheckout();

  // Efecto principal para manejar autenticación/logout
  useEffect(() => {
    if (loading) return;

    if (me) {
      // Usuario autenticado: cargar direcciones
      // Pequeño delay para asegurar que el estado esté completamente actualizado
      const timeoutId = setTimeout(async () => {
        try {
          const addresses = await listAddresses();
          // Si no hay dirección seleccionada, usar la predeterminada
          const defaultAddress = addresses.find(addr => addr.predeterminada);
          if (defaultAddress) {
            setShippingAddress(defaultAddress);
          }
        } catch (error) {
          console.debug('No se pudieron cargar direcciones:', error);
        }
      }, 120); // Delay ligeramente diferente para evitar conflictos
      
      return () => clearTimeout(timeoutId);
    } else {
      // Usuario no autenticado: resetear checkout
      reset();
    }
  }, [me, loading, setShippingAddress, reset]);

  // Efecto adicional para detectar cambios de usuario (login de usuario diferente)
  useEffect(() => {
    if (loading || !me?.id) return;
    
    // Cuando cambia el ID del usuario, forzar recarga completa
    const timeoutId = setTimeout(async () => {
      try {
        const addresses = await listAddresses();
        const defaultAddress = addresses.find(addr => addr.predeterminada);
        if (defaultAddress) {
          setShippingAddress(defaultAddress);
        }
      } catch (error) {
        console.debug('No se pudieron cargar direcciones:', error);
      }
    }, 170); // Delay mayor para evitar duplicados
    
    return () => clearTimeout(timeoutId);
  }, [me?.id, loading, setShippingAddress]);

  return <>{children}</>;
}