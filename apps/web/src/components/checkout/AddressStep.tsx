// src/components/checkout/AddressStep.tsx
'use client';

import { useState, useEffect } from 'react';
import { useCheckout } from '@/store/checkout';
import { useCart, cartSelectors } from '@/store/cart';
import { listAddresses, type Direccion } from '@/lib/sdk/userApi';
import { Card, CardBody } from '@/components/ui/Card';
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
      <Card>
        <CardBody className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Cargando direcciones...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border border-[var(--pink)]/30">
        <CardBody className="p-6">
          <h2 className="text-xl font-semibold text-[var(--fg)]">
            Dirección de facturación
          </h2>
          <p className="text-[var(--muted)] mt-1">
            Seleccioná tu dirección para la facturación
          </p>
        </CardBody>
      </Card>

      {/* Direcciones existentes */}
      {!showAddressForm && (
        <Card className="border border-[var(--pink)]/30">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[var(--fg)]">
                Mis direcciones
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva dirección
              </Button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-[var(--muted)] mx-auto mb-4" />
                <p className="text-[var(--muted)] mb-4">
                  No tenés direcciones guardadas
                </p>
                <Button onClick={() => setShowAddressForm(true)}>
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
                      'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                      {
                        'border-[var(--pink)] bg-[var(--pink)]/5': shippingAddress?.id === address.id,
                        'border-[var(--border)] hover:border-[var(--pink)]/50': shippingAddress?.id !== address.id,
                      }
                    )}
                    onClick={() => setShippingAddress(address)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-transparent border border-[var(--pink)]/40 flex items-center justify-center flex-shrink-0">
                          {address.etiqueta?.toLowerCase().includes('casa') ? (
                            <Home className="h-5 w-5 text-[var(--pink)]" />
                          ) : (
                            <Building className="h-5 w-5 text-[var(--pink)]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--fg)]">
                              {address.nombre}
                            </span>
                            {address.predeterminada && (
                              <Star className="h-4 w-4 text-[var(--pink)] fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-[var(--muted)] mt-1">
                            {address.calle} {address.numero}
                            {address.pisoDepto && `, ${address.pisoDepto}`}
                          </div>
                          <div className="text-sm text-[var(--muted)]">
                            {address.ciudad}, {address.provincia} ({address.cp})
                          </div>
                          {address.etiqueta && (
                            <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-[var(--subtle)] text-[var(--muted)]">
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
          </CardBody>
        </Card>
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
        <Card className="border border-[var(--pink)]/30">
          <CardBody className="p-6">
            <h3 className="font-medium text-[var(--fg)] mb-4">
              Dirección de facturación
            </h3>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useSameAddress}
                onChange={(e) => setUseSameAddress(e.target.checked)}
                className="w-4 h-4 text-[var(--pink)] border-[var(--border)] rounded focus:ring-[var(--pink)] focus:ring-2"
              />
              <span className="text-[var(--fg)]">
                Usar la misma dirección para facturación
              </span>
            </label>
            
            {!useSameAddress && (
              <div className="mt-4 p-4 bg-[var(--subtle)] rounded-lg">
                <p className="text-sm text-[var(--muted)]">
                  Funcionalidad de dirección de facturación separada próximamente
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Navegación */}
      <Card className="border border-[var(--pink)]/30">
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al carrito
            </Button>

            <div className="text-right">
              <div className="text-sm text-[var(--muted)] mb-2">
                Subtotal: {money(subtotal)}
              </div>
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-semibold px-8 py-3 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar al pago
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
