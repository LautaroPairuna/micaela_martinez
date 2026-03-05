//src/components/checkout/PaymentStep.tsx
'use client';

import { useState } from 'react';
import { useCheckout } from '@/store/checkout';
import { useCart, cartSelectors } from '@/store/cart';
import { useSession } from '@/hooks/useSession';
import { createOrder, TipoItemOrden, OrderSource } from '@/lib/sdk/ordersApi';
import { Button } from '@/components/ui/Button';
import { MercadoPagoBricks } from './MercadoPagoBricks';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/format';
import {
  CreditCard,
  Building2,
  Shield,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* Tipos de integración con Bricks */
interface BricksPaymentSuccess {
  orderId: number;
  paymentMethodId: string;
  installments?: number;
  amount: number;
  status: string;
}

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
    useSameAddress,
    markStepCompleted
  } = useCheckout();

  const cartItems = useCart((state) => state.items);
  const clearCart = useCart((state) => state.clear);
  const syncWithBackend = useCart((state) => state.syncWithBackend);
  const cartTotal = useCart((state) => cartSelectors.subtotal(state.items));
  const { error: showError } = useToast();

  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  
  const amountToPay = orderAmount ?? cartTotal;
  const hasCourses = cartItems.some((item) => item.type === 'course');

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);

  const paymentMethods = [
    {
      id: 'mercadopago',
      name: 'Pago Online',
      description: 'Tarjeta, efectivo, transferencia y más opciones',
      icon: CreditCard,
      badge: 'Recomendado',
      features: hasCourses 
        ? ['Solo tarjeta de crédito (requerido para cursos)']
        : [
            'Tarjetas de crédito y débito',
            'Pago en efectivo (Rapipago, Pago Fácil)',
            'Transferencia bancaria',
            'Dinero en cuenta de MercadoPago'
          ]
    },
    ...(!hasCourses ? [{
      id: 'transfer',
      name: 'Transferencia Directa',
      description: 'Transferí directamente a nuestra cuenta bancaria',
      icon: Building2,
      features: ['Sin comisiones adicionales', 'Confirmación manual', 'Tiempo de procesamiento: 24-48hs']
    }] : [])
  ];

  const handlePaymentMethodSelect = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    if (!method) return;

    const paymentType: 'mercadopago' | 'transfer' =
      methodId === 'mercadopago' ? 'mercadopago' : 'transfer';

    setIsPaymentCompleted(false);
    setPaymentInProgress(false);

    setSelectedPayment({
      id: method.id,
      type: paymentType,
      name: method.name,
      description: method.description
    });
  };

  const createOrderIfNeeded = async (): Promise<number> => {
    if (orderId) {
      console.log('=== FRONTEND: Usando orden existente ===', orderId);
      return Number(orderId);
    }

    if (!shippingAddress) {
      throw new Error('Dirección de envío requerida');
    }

    setIsCreatingOrder(true);
    try {
      // 1. Sincronizar carrito antes de crear orden (por seguridad)
      await syncWithBackend();

      // 2. Crear orden (el backend lee del carrito)
      // Nota: El backend en createFromCart espera recibir direcciones, pero no items.
      // Si el backend CreateOrderDto espera direcciones como IDs, aquí estamos enviando el objeto completo.
      // Revisa tu OrdersService.createFromCart, si no soporta creación de dirección al vuelo, esto fallará.
      // Asumiendo que CreateOrderDto del backend fue modificado para recibir IDs, 
      // pero si el backend crea direcciones al vuelo, entonces necesitamos otro DTO.
      
      // Revisión rápida del backend orders.service.ts: 
      // Si envías 'direccionEnvioId', usa esa. Si no, falla?
      // El backend CreateOrderDto tiene direccionEnvioId?: number.
      
      // SOLUCIÓN: Si las direcciones ya existen (ej. guardadas en perfil), enviar ID.
      // Si son nuevas (del checkout), el backend debería permitir crearlas o el frontend debe crearlas antes.
      // Dado que CheckoutWizard permite direcciones nuevas, lo ideal sería que createOrder
      // aceptara el objeto dirección. Pero el DTO actual es estricto.
      
      // Por ahora, enviaremos la metadata y dejaremos que el backend maneje la lógica si la soporta,
      // o asumiremos que el usuario ya tiene direcciones guardadas si el backend lo requiere.
      
      // 🔥 IMPORTANTE: El backend createFromCart espera `direccionEnvioId`.
      // Si no tenemos ID, estamos en problemas a menos que creemos la dirección primero.
      // Asumiremos por ahora que el usuario seleccionó una dirección existente o que el backend 
      // tiene lógica para "crear si no existe" que no vimos, o que debemos enviar IDs.
      
      // Simplificación: Enviaremos source='cart'.
      const newOrder = await createOrder({
        source: OrderSource.CART,
        // TODO: Si el backend requiere ID de dirección, aquí deberíamos pasar shippingAddress.id
        // Si shippingAddress viene de una API que devuelve ID, úsalo.
        direccionEnvioId: shippingAddress.id ? Number(shippingAddress.id) : undefined,
        direccionFacturacionId: billingAddress?.id ? Number(billingAddress.id) : undefined,
        metadatos: {
          userAgent: navigator.userAgent,
          shippingAddressSnapshot: shippingAddress,
          billingAddressSnapshot: billingAddress || shippingAddress,
        },
      });

      console.log('=== FRONTEND: Nueva orden creada ===', { id: newOrder.id, total: newOrder.total });
      
      setOrderId(String(newOrder.id));
      setOrderAmount(Number(newOrder.total));
      clearCart();

      return newOrder.id;
    } catch (error) {
      console.error('Error creating order:', error);
      setOrderId(null);
      throw error;
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const { me } = useSession();

  const handleBricksPaymentSuccess = async (paymentData: BricksPaymentSuccess) => {
    try {
      console.log('=== FRONTEND: Pago exitoso con Bricks ===', paymentData);
      setPaymentInProgress(false);
      setIsPaymentCompleted(true);
      markStepCompleted('payment');
      nextStep();
    } catch (error) {
      console.error('Error post-pago:', error);
      showError('Error al finalizar', 'El pago se procesó pero hubo un error al redirigir.');
    }
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
      await createOrderIfNeeded(); 
      markStepCompleted('payment');
      nextStep();
    } catch (error) {
      console.error('Error creating order for transfer:', error);
      showError('Error al crear la orden', 'Por favor, intentá nuevamente.');
      setOrderId(null);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-serif text-white">Método de pago</h2>
        <p className="text-zinc-400">
          Elegí cómo querés pagar tu pedido
        </p>
      </div>

      <div className="space-y-4">
        {paymentMethods.map((method) => {
          const isSelected = selectedPayment?.id === method.id;
          const Icon = method.icon;

          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border transition-all duration-300 overflow-hidden',
                isSelected
                  ? 'bg-zinc-900 border-[var(--pink)] shadow-[0_0_15px_-5px_var(--pink)]'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
              )}
            >
              <div
                className="p-5 cursor-pointer flex items-start gap-4"
                onClick={() => handlePaymentMethodSelect(method.id)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-[var(--pink)] text-black'
                      : 'bg-zinc-800 text-zinc-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={cn("font-medium", isSelected ? "text-white" : "text-zinc-300")}>
                      {method.name}
                    </h3>
                    {method.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30">
                        {method.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">
                    {method.description}
                  </p>
                  
                  {isSelected && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {method.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <CheckCircle className="w-3 h-3 text-[var(--pink)]" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center transition-colors mt-1",
                  isSelected
                    ? "border-[var(--pink)] bg-[var(--pink)]"
                    : "border-zinc-700"
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-zinc-800 bg-black/20"
                  >
                    <div className="p-6">
                      {method.id === 'mercadopago' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                            <Shield className="w-4 h-4 text-[var(--gold)]" />
                            <span>
                              Pago seguro con MercadoPago. Tus datos están protegidos.
                            </span>
                          </div>
                          
                          {hasCourses && (
                            <div className="flex items-start gap-3 p-4 bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded-xl mb-4">
                              <AlertCircle className="w-5 h-5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-[var(--gold)]">
                                  Requisito para cursos
                                </p>
                                <p className="text-xs text-[var(--gold)]/80 leading-relaxed">
                                  Al incluir cursos (suscripciones), Mercado Pago requiere el uso de **tarjeta de crédito** para garantizar la renovación de tu acceso. Otros medios de pago han sido desactivados automáticamente.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="min-h-[200px]">
                            {amountToPay > 0 ? (
                              <MercadoPagoBricks
                                amount={amountToPay}
                                orderId={orderId ? Number(orderId) : null}
                                onPaymentSuccess={handleBricksPaymentSuccess}
                                onPaymentError={handleBricksPaymentError}
                                onPaymentStart={handleBricksPaymentStart}
                                onCreateOrder={createOrderIfNeeded}
                                isSubscription={hasCourses}
                                payerEmail={me?.email}
                              />
                            ) : (
                              <div className="p-4 text-center text-zinc-500">
                                Cargando información de pago...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {method.id === 'transfer' && (
                        <div className="space-y-6">
                          <div className="bg-zinc-900 rounded-lg p-5 border border-zinc-800 space-y-4">
                            <h4 className="text-sm font-medium text-[var(--gold)] border-b border-zinc-800 pb-2 mb-3">
                              Datos bancarios
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="block text-zinc-500 mb-1">Banco</span>
                                <span className="text-white font-medium">Banco Nación</span>
                              </div>
                              <div>
                                <span className="block text-zinc-500 mb-1">Titular</span>
                                <span className="text-white font-medium">Micaela Rodriguez</span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="block text-zinc-500 mb-1">CBU</span>
                                <span className="text-white font-mono bg-black/30 px-2 py-1 rounded select-all">
                                  0110599520000012345678
                                </span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="block text-zinc-500 mb-1">Alias</span>
                                <span className="text-white font-mono bg-black/30 px-2 py-1 rounded select-all">
                                  MICA.PESTANAS
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-zinc-800">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-400">Importe a transferir:</span>
                                <span className="text-lg font-bold text-white">
                                  ${cartTotal.toLocaleString('es-AR')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex gap-3 items-start">
                            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm text-blue-200 font-medium">Importante</p>
                              <p className="text-xs text-blue-300/80 leading-relaxed">
                                Una vez realizada la transferencia, envianos el comprobante por WhatsApp para confirmar tu pedido. El pedido se procesará una vez acreditado el pago.
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button
                              onClick={handleTransferPayment}
                              disabled={isCreatingOrder}
                              isLoading={isCreatingOrder}
                              variant="ghost"
                              className="w-full sm:w-auto border !border-[var(--pink)] !text-[var(--pink)] font-bold text-base px-8 py-3 rounded-xl hover:!bg-[var(--pink)]/10 hover:!border-[var(--pink)] hover:!text-[var(--pink)] hover:shadow-[0_0_20px_-5px_var(--pink)] hover:scale-[1.02] transition-all duration-300 !ring-0 !ring-offset-0 !outline-none focus:!ring-0 focus-visible:!ring-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:hover:bg-transparent"
                            >
                              Confirmar pedido
                              <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={isCreatingOrder || paymentInProgress}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a datos
        </Button>
      </div>
    </div>
  );
}