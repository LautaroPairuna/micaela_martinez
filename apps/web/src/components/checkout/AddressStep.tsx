// src/components/checkout/AddressStep.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCheckout } from '@/store/checkout';
import { useCart, cartSelectors } from '@/store/cart';
import { listAddresses, type Direccion } from '@/lib/sdk/userApi';
import { Button } from '@/components/ui/Button';
import { MapPin, Plus, ArrowRight, ArrowLeft, Star, Home, Building } from 'lucide-react';
import { AddressForm } from './AddressForm';
import { cn } from '@/lib/format';

const money = (cents: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents);

export function AddressStep() {
  const {
    shippingAddress,
    billingAddress,
    useSameAddress,
    setShippingAddress,
    setUseSameAddress,
    nextStep,
    prevStep,
    markStepCompleted
  } = useCheckout();
  
  const { items } = useCart();
  const subtotal = cartSelectors.subtotal(items);
  
  const [addresses, setAddresses] = useState<Direccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Cargar direcciones del usuario
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const result = await listAddresses();
        setAddresses(result);
        
        // Si no hay dirección seleccionada, usar la predeterminada
        if (!shippingAddress) {
          const defaultAddress = result.find(addr => addr.predeterminada);
          if (defaultAddress) {
            setShippingAddress(defaultAddress);
          }
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAddresses();
  }, [shippingAddress, setShippingAddress]);

  const handleContinue = () => {
    if (!shippingAddress) return;
    
    markStepCompleted('address');
    nextStep();
  };

  const canContinue = shippingAddress && (useSameAddress || billingAddress);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-zinc-400">Cargando direcciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white">
            Dirección de facturación
          </h2>
          <p className="text-zinc-400 mt-1">
            Seleccioná tu dirección para la facturación
          </p>
        </div>
      </div>

      {/* Direcciones existentes */}
      {!showAddressForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-white">
                Mis direcciones
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressForm(true)}
                className="text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva dirección
              </Button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 mb-4">
                  No tenés direcciones guardadas
                </p>
                <Button onClick={() => setShowAddressForm(true)} className="bg-zinc-800 text-white hover:bg-zinc-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar dirección
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all duration-200',
                      {
                        'bg-zinc-900 border-[var(--pink)] shadow-[0_0_15px_-5px_var(--pink)]': shippingAddress?.id === address.id,
                        'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700': shippingAddress?.id !== address.id,
                      }
                    )}
                    onClick={() => setShippingAddress(address)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                          {address.etiqueta?.toLowerCase().includes('casa') ? (
                            <Home className="h-5 w-5 text-[var(--pink)]" />
                          ) : (
                            <Building className="h-5 w-5 text-[var(--pink)]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {address.nombre}
                            </span>
                            {address.predeterminada && (
                              <Star className="h-4 w-4 text-[var(--pink)] fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-zinc-400 mt-1">
                            {address.calle} {address.numero}
                            {address.pisoDepto && `, ${address.pisoDepto}`}
                          </div>
                          <div className="text-sm text-zinc-500">
                            {address.ciudad}, {address.provincia} ({address.cp})
                          </div>
                          {address.etiqueta && (
                            <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {address.etiqueta}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulario de nueva dirección */}
      {showAddressForm && (
        <AddressForm
          onSave={(address) => {
            setAddresses(prev => [...prev, address]);
            setShippingAddress(address);
            setShowAddressForm(false);
          }}
          onCancel={() => setShowAddressForm(false)}
        />
      )}



      {/* Dirección de facturación */}
      {shippingAddress && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6">
            <h3 className="font-medium text-white mb-4">
              Dirección de facturación
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useSameAddress}
                onChange={(e) => setUseSameAddress(e.target.checked)}
                className="w-4 h-4 text-[var(--pink)] border-zinc-700 rounded focus:ring-[var(--pink)] focus:ring-2 bg-zinc-950"
              />
              <span className="text-white">
                Usar la misma dirección para facturación
              </span>
            </label>
            
            {!useSameAddress && (
              <div className="mt-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                <p className="text-sm text-zinc-400">
                  Funcionalidad de dirección de facturación separada próximamente
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              className="text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al carrito
            </Button>

            <div className="text-right w-full sm:w-auto">
              <div className="text-sm text-zinc-400 mb-2 sm:hidden">
                Subtotal: {money(subtotal)}
              </div>
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                variant="ghost"
                className="w-full sm:w-auto border !border-[var(--pink)] !text-[var(--pink)] font-bold text-base px-8 py-3 rounded-xl hover:!bg-[var(--pink)]/10 hover:!border-[var(--pink)] hover:!text-[var(--pink)] hover:shadow-[0_0_20px_-5px_var(--pink)] hover:scale-[1.02] transition-all duration-300 !ring-0 !ring-offset-0 !outline-none focus:!ring-0 focus-visible:!ring-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:hover:bg-transparent"
              >
                Continuar al pago
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
