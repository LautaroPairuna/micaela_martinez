// src/components/checkout/PaymentStep.tsx
'use client';

import { useState } from 'react';
import { useCheckout } from '@/store/checkout';
import { useCart, cartSelectors } from '@/store/cart';
import { createOrder, TipoItemOrden } from '@/lib/sdk/ordersApi';
import { Button } from '@/components/ui/Button';
import { MercadoPagoBricks } from './MercadoPagoBricks';
import { useToast } from '@/contexts/ToastContext';
import {
  CreditCard,
  Building2,
  Shield,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronDown
} from 'lucide-react';

/* Tipos de integración con Bricks (coinciden con los emitidos por MercadoPagoBricks) */
type BricksPaymentSuccess = {
  orderId: string;
  paymentMethodId: string;
  token: string;
  installments?: number;
  amount: number;
  status: string;
};

type BricksPaymentError = {
  message: string;
  details?: unknown;
};

export function PaymentStep() {
  const {
    selectedPayment,
    setSelectedPayment,
    nextStep,
    prevStep,
    orderId,
    setOrderId,
    shippingAddress,
    billingAddress,
    useSameAddress
  } = useCheckout();

  const cartItems = useCart((state) => state.items);
  const cartTotal = useCart((state) => cartSelectors.subtotal(state.items));
  const { error: showError } = useToast();

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isLoadingBricks] = useState(false); // solo lectura (no usamos setter)
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  const paymentMethods = [
    {
      id: 'mercadopago',
      name: 'Pago Online',
      description: 'Tarjeta, efectivo, transferencia y más opciones',
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      badge: 'Recomendado',
      features: [
        'Tarjetas de crédito y débito',
        'Pago en efectivo (Rapipago, Pago Fácil)',
        'Transferencia bancaria',
        'Dinero en cuenta de MercadoPago'
      ]
    },
    {
      id: 'transfer',
      name: 'Transferencia Directa',
      description: 'Transferí directamente a nuestra cuenta bancaria',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      features: ['Sin comisiones adicionales', 'Confirmación manual', 'Tiempo de procesamiento: 24-48hs']
    }
  ];

  const handlePaymentMethodSelect = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    if (!method) return;

    const paymentType: 'mercadopago' | 'transfer' =
      methodId === 'mercadopago' ? 'mercadopago' : 'transfer';

    // Reset de estados al cambiar método
    setIsPaymentCompleted(false);
    setPaymentInProgress(false);

    setSelectedPayment({
      id: method.id,
      type: paymentType,
      name: method.name,
      description: method.description
    });
  };

  const createOrderIfNeeded = async () => {
    if (orderId) return orderId;

    if (!shippingAddress) {
      throw new Error('Dirección de envío requerida');
    }

    setIsCreatingOrder(true);
    try {
      const orderData = {
        items: cartItems.map((item) => ({
          tipo: item.type === 'course' ? TipoItemOrden.CURSO : TipoItemOrden.PRODUCTO,
          refId: item.id,
          titulo: item.title,
          cantidad: item.type === 'product' ? item.quantity : 1,
          precioUnitario: item.price
        })),
        direccionEnvio: {
          nombre: shippingAddress.nombre,
          telefono: shippingAddress.telefono || '',
          etiqueta: shippingAddress.etiqueta || '',
          calle: shippingAddress.calle,
          numero: shippingAddress.numero || '',
          pisoDepto: shippingAddress.pisoDepto || '',
          ciudad: shippingAddress.ciudad,
          provincia: shippingAddress.provincia,
          cp: shippingAddress.cp,
          pais: shippingAddress.pais || 'AR'
        },
        direccionFacturacion:
          !useSameAddress && billingAddress
            ? {
                nombre: billingAddress.nombre,
                telefono: billingAddress.telefono || '',
                etiqueta: billingAddress.etiqueta || '',
                calle: billingAddress.calle,
                numero: billingAddress.numero || '',
                pisoDepto: billingAddress.pisoDepto || '',
                ciudad: billingAddress.ciudad,
                provincia: billingAddress.provincia,
                cp: billingAddress.cp,
                pais: billingAddress.pais || 'AR'
              }
            : undefined
      };

      const newOrder = await createOrder(orderData);
      setOrderId(newOrder.id);
      return newOrder.id;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleBricksPaymentSuccess = (paymentData: BricksPaymentSuccess) => {
     
    console.log('=== FRONTEND: Pago exitoso con Bricks ===', paymentData);
    setPaymentInProgress(false);
    setIsPaymentCompleted(true);

    // Avanzar automáticamente tras éxito
    setTimeout(() => {
      nextStep();
    }, 1500);
  };

  const handleBricksPaymentError = (error: BricksPaymentError) => {
     
    console.error('=== FRONTEND: Error en pago con Bricks ===', error);
    setPaymentInProgress(false);
    setIsPaymentCompleted(false);
    showError('Error al procesar el pago', `${error.message || 'Error desconocido'}. Por favor, intentá nuevamente.`);
  };

  const handleBricksPaymentStart = () => {
     
    console.log('=== FRONTEND: Iniciando proceso de pago ===');
    setPaymentInProgress(true);
    setIsPaymentCompleted(false);
  };

  const handleTransferPayment = async () => {
    try {
      setIsCreatingOrder(true);
      await createOrderIfNeeded(); // no necesitamos capturar el id aquí
      nextStep();
    } catch (error) {
       
      console.error('Error creating order for transfer:', error);
      showError('Error al crear la orden', 'Por favor, intentá nuevamente.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleNextStep = async () => {
    if (selectedPayment?.type === 'transfer') {
      await handleTransferPayment();
    } else {
      nextStep();
    }
  };

  const isFormValid = () => {
    if (!selectedPayment) return false;
    if (selectedPayment.type === 'mercadopago') {
      return isPaymentCompleted && !paymentInProgress;
    }
    if (selectedPayment.type === 'transfer') {
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">Método de pago</h2>
        <p className="text-[var(--muted)]">Seleccioná cómo querés pagar tu pedido</p>
      </div>

      {/* Payment Methods */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg text-[var(--fg)] mb-4">Elegí tu método de pago</h3>

        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPayment?.id === method.id;
            const isOpen = openDropdown === method.id;

            return (
              <div key={method.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (isOpen) {
                      setOpenDropdown(null);
                    } else {
                      setOpenDropdown(method.id);
                      handlePaymentMethodSelect(method.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-secondary)] transition-colors ${
                    isSelected ? 'bg-[var(--pink)]/10 border-l-4 border-l-[var(--pink)]' : 'bg-[var(--bg)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${method.bgColor} ${method.borderColor} border flex items-center justify-center`}
                    >
                      <Icon className={`h-5 w-5 ${method.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[var(--fg)]">{method.name}</div>
                        {method.badge && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black rounded-full">
                            {method.badge}
                          </span>
                        )}
                        {isSelected && <CheckCircle className="h-4 w-4 text-[var(--pink)] ml-auto" />}
                      </div>
                      <div className="text-sm text-[var(--muted)] mt-0.5">{method.description}</div>
                      {method.features && (
                        <div className="mt-2">
                          <div className="text-xs text-[var(--muted)] space-y-1">
                            {method.features.slice(0, 2).map((feature, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <div className="w-1 h-1 rounded-full bg-[var(--pink)] flex-shrink-0"></div>
                                {feature}
                              </div>
                            ))}
                            {method.features.length > 2 && (
                              <div className="text-[var(--muted)]">+{method.features.length - 2} más...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Contenido específico */}
                {isOpen && isSelected && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    {method.id === 'mercadopago' && (
                      <div className="p-6">
                        <div className="space-y-4">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-[var(--fg)] mb-2">
                              Completá los datos de tu tarjeta
                            </h4>
                            <p className="text-[var(--muted)] text-sm">
                              Ingresá los datos de tu tarjeta de crédito o débito de forma segura
                            </p>
                          </div>

                          {isPaymentCompleted && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="text-green-800 font-medium text-sm">¡Pago procesado exitosamente!</p>
                                  <p className="text-green-600 text-xs mt-1">Ya podés continuar con tu pedido</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {isLoadingBricks ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-3">
                              <div className="relative">
                                <div className="w-12 h-12 border-4 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin"></div>
                                <CreditCard className="absolute inset-0 m-auto h-5 w-5 text-[var(--gold)]" />
                              </div>
                              <div className="text-center">
                                <p className="text-[var(--fg)] font-medium text-sm">
                                  Cargando formulario de pago...
                                </p>
                                <p className="text-[var(--muted)] text-xs mt-1">
                                  Preparando el entorno seguro de MercadoPago
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {isCreatingOrder ? (
                                <div className="flex items-center justify-center p-6">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--gold)]"></div>
                                  <span className="ml-3 text-[var(--muted)] text-sm">Preparando tu orden...</span>
                                </div>
                              ) : (
                                <MercadoPagoBricks
                                  key={`mercadopago-${openDropdown}-${selectedPayment?.id}`}
                                  amount={cartTotal}
                                  orderId={orderId}
                                  onPaymentSuccess={handleBricksPaymentSuccess}
                                  onPaymentError={handleBricksPaymentError}
                                  onPaymentStart={handleBricksPaymentStart}
                                  onCreateOrder={createOrderIfNeeded}
                                  isSubscription={cartItems.some(item => item.type === 'course')}
                                  subscriptionFrequency={1}
                                  subscriptionFrequencyType="months"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {method.id === 'transfer' && (
                      <div className="p-6">
                        <div className="space-y-4">
                          <div className="text-center">
                            <h4 className="text-lg font-semibold text-[var(--fg)] mb-2">
                              Datos para transferencia bancaria
                            </h4>
                            <p className="text-[var(--muted)] text-sm">
                              Realizá la transferencia con los siguientes datos
                            </p>
                          </div>

                          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted)] text-sm">Banco:</span>
                              <span className="font-medium text-[var(--fg)]">Banco Nación</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted)] text-sm">CBU:</span>
                              <span className="font-mono text-[var(--fg)]">0110599520000012345678</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted)] text-sm">Alias:</span>
                              <span className="font-medium text-[var(--fg)]">MICA.PESTANAS</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[var(--muted)] text-sm">Titular:</span>
                              <span className="font-medium text-[var(--fg)]">Micaela Rodriguez</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-[var(--border)] pt-3">
                              <span className="text-[var(--muted)] text-sm">Importe:</span>
                              <span className="font-bold text-lg text-[var(--gold)]">
                                ${cartTotal.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h5 className="font-medium text-blue-900 mb-1">Importante</h5>
                                <p className="text-blue-700 text-sm">
                                  Una vez realizada la transferencia, envianos el comprobante por WhatsApp para
                                  confirmar tu pedido.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6">
        <Button variant="outline" onClick={prevStep} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <Button
          onClick={handleNextStep}
          disabled={!isFormValid() || isCreatingOrder}
          className="bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200 flex items-center gap-2"
        >
          {selectedPayment?.type === 'mercadopago' ? (
            paymentInProgress ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Procesando pago...
              </>
            ) : isPaymentCompleted ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Continuar
              </>
            ) : (
              <>
                Completá el pago para continuar
                <CreditCard className="h-4 w-4" />
              </>
            )
          ) : selectedPayment?.type === 'transfer' ? (
            isCreatingOrder ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Creando orden...
              </>
            ) : (
              <>
                Crear orden y continuar
                <ArrowRight className="h-4 w-4" />
              </>
            )
          ) : (
            <>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
