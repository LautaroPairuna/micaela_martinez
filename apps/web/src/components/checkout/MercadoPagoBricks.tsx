'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { CreditCard, Shield, AlertCircle } from 'lucide-react';
import { MERCADOPAGO_PUBLIC_KEY } from '@/lib/env';
import { processMercadoPagoPayment, createSubscription } from '@/lib/sdk/ordersApi';

/* ─────────────── Tipos locales mínimos para MP Bricks (v2) ─────────────── */

type PaymentSuccessData = {
  orderId: string;
  paymentMethodId: string;
  token: string;
  installments?: number;
  amount: number;
  status: string;
};

type PaymentErrorData = {
  message: string;
  details?: unknown;
};

type OnPaymentSuccess = (paymentData: PaymentSuccessData) => void;
type OnPaymentError = (error: PaymentErrorData) => void;

type CardFormData = {
  token: string;
  payment_method_id: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
};

type PaymentBrickSettings = {
  initialization: {
    amount: number;
    preferenceId?: string | null;
  };
  customization?: {
    paymentMethods?: {
      creditCard?: 'all' | string[];
      debitCard?: 'all' | string[];
      mercadoPago?: 'all' | string[];
    };
    visual?: {
      style?: {
        theme?: 'default' | 'dark' | string;
      };
    };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (cardFormData: CardFormData) => Promise<void> | void;
    onError?: (error: unknown) => void;
  };
};

type BrickController = {
  unmount: () => Promise<void> | void;
};

type Bricks = {
  create: (
    type: 'payment',
    container: string | HTMLElement,
    settings: PaymentBrickSettings
  ) => Promise<BrickController>;
};

type MercadoPagoInstance = {
  bricks: () => Bricks;
};

type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string }
) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

interface MercadoPagoBricksProps {
  amount: number;
  orderId: string | null;
  onPaymentSuccess: OnPaymentSuccess;
  onPaymentError: OnPaymentError;
  onPaymentStart?: () => void;
  onCreateOrder: () => Promise<string>;
  isSubscription?: boolean;
  subscriptionFrequency?: number;
  subscriptionFrequencyType?: 'days' | 'months';
}

/* ───────────────────────────── Helpers ───────────────────────────── */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractId(resp: unknown, fallback: string): string {
  if (isRecord(resp)) {
    const r = resp as Record<string, unknown>;
    const v = r.id ?? r.orderId ?? r.order_id;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
  }
  return fallback;
}

function extractStatus(resp: unknown): string {
  if (isRecord(resp)) {
    const r = resp as Record<string, unknown>;
    const candidates = [
      r.estado,
      r.status,
      r.payment_status,
      r.status_detail,
      r.state
    ];
    const s = candidates.find((x) => typeof x === 'string');
    if (typeof s === 'string') return s;
  }
  return 'unknown';
}
function normalizeError(err: unknown): PaymentErrorData {
  if (err instanceof Error) {
    return { message: err.message, details: err };
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  return { message: 'Error desconocido', details: err };
}

/* ──────────────────────────── Componente ─────────────────────────── */

export function MercadoPagoBricks({
  amount,
  orderId,
  onPaymentSuccess,
  onPaymentError,
  onPaymentStart,
  onCreateOrder,
  isSubscription = false,
  subscriptionFrequency = 1,
  subscriptionFrequencyType = 'months'
}: MercadoPagoBricksProps) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [containerId, setContainerId] = useState<string>('');
  const [forceRender, setForceRender] = useState(0);

  const brickContainerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<BrickController | null>(null);
  const initializationRef = useRef(false);

  const publicKey = MERCADOPAGO_PUBLIC_KEY;

  // Mantener handlers siempre actualizados sin re-crear callbacks
  const handlersRef = useRef({
    onPaymentSuccess,
    onPaymentError,
    onCreateOrder,
    onPaymentStart
  });
  useEffect(() => {
    handlersRef.current = {
      onPaymentSuccess,
      onPaymentError,
      onCreateOrder,
      onPaymentStart
    };
  }, [onPaymentSuccess, onPaymentError, onCreateOrder, onPaymentStart]);

  /* Limpieza de contenedores huérfanos (IDs viejos) */
  const cleanupOrphanedContainers = useCallback(() => {
    const orphanedContainers = document.querySelectorAll('[id^="mercadopago-brick-"]');
    const orphanedCount = Array.from(orphanedContainers).filter(
      (container) => container.id !== containerId
    ).length;

    if (orphanedCount > 0) {
      console.log(`🧹 Encontrados ${orphanedCount} contenedores huérfanos, limpiando...`);
      orphanedContainers.forEach((container) => {
        if (container.id !== containerId) container.remove();
      });
    }
  }, [containerId]);

  // useLayoutEffect para trazar existencia del contenedor
  useLayoutEffect(() => {
    if (containerId) {
      const container = document.getElementById(containerId);
      console.log(`🔍 Layout Effect - Contenedor ${containerId} encontrado:`, !!container);
    }
  }, [containerId]);

  // Montaje / ID único
  useEffect(() => {
    setIsMounted(true);
    cleanupOrphanedContainers();

    const uniqueId = `mercadopago-brick-${Date.now()}-${forceRender}-${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    setContainerId(uniqueId);
    console.log('🔧 Componente montado con ID:', uniqueId);

    return () => {
      console.log('🔧 Desmontando componente con ID:', uniqueId);
      setIsMounted(false);
      initializationRef.current = false;
    };
  }, [forceRender, cleanupOrphanedContainers]);

  useEffect(() => {
    if (!publicKey || !isMounted || !containerId) {
      if (!publicKey) {
        console.error('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY no está configurada');
      }
      return;
    }

    initializationRef.current = false;
    let cancelled = false;

    const ensureContainer = async (): Promise<boolean> => {
      const found = !!document.getElementById(containerId);
      if (found) return true;
      // primer reintento
      await new Promise((r) => setTimeout(r, 200));
      return !!document.getElementById(containerId);
    };

    const loadMercadoPagoSDK = async (): Promise<void> => {
      if (window.MercadoPago) {
        setIsSDKLoaded(true);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          setIsSDKLoaded(true);
          resolve();
        };
        script.onerror = () => reject(new Error('Error al cargar el SDK de MercadoPago'));
        document.head.appendChild(script);
      });
    };

    const initializeBricks = async (): Promise<void> => {
      // Verificaciones de prerrequisito
      const container = document.getElementById(containerId);
      if (!container || !brickContainerRef.current || !isMounted || cancelled) {
        console.warn(`❌ Contenedor del brick no encontrado o componente desmontado: ${containerId}`);
        return;
      }

      // Desmontar brick anterior si existía
      if (brickControllerRef.current) {
        try {
          await brickControllerRef.current.unmount();
        } catch (e) {
          console.warn('⚠️ Error al desmontar brick existente:', e);
        } finally {
          brickControllerRef.current = null;
        }
      }

      // Limpiar contenedor HTML
      container.innerHTML = '';
      await new Promise((r) => setTimeout(r, 50));

      const containerAfter = document.getElementById(containerId);
      if (!containerAfter || cancelled) return;

      // Instanciar MP
      const MP = window.MercadoPago;
      if (!MP) throw new Error('MercadoPago no está disponible');

      const mp = new MP(publicKey, { locale: 'es-AR' });
      const bricks = mp.bricks();

      const settings: PaymentBrickSettings = {
        initialization: {
          amount,
          preferenceId: null
        },
        customization: {
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            mercadoPago: 'all'
          },
          visual: { style: { theme: 'default' } }
        },
        callbacks: {
          onReady: () => {
            console.log('✅ MercadoPago Brick listo en:', containerId);
          },
          onSubmit: async (cardFormData: CardFormData) => {
            if (!isMounted || cancelled) return;

            const { onPaymentStart, onCreateOrder, onPaymentSuccess, onPaymentError } =
              handlersRef.current;

            onPaymentStart?.();
            setIsProcessing(true);

            try {
              // Crear orden si aún no existe
              let currentOrderId = orderId;
              if (!currentOrderId) {
                currentOrderId = await onCreateOrder();
              }

              // Llamar backend para procesar pago o crear suscripción
              let rawResult: unknown;
              
              if (isSubscription) {
                // Crear suscripción mensual
                rawResult = await createSubscription(currentOrderId, {
                  token: cardFormData.token,
                  paymentMethodId: cardFormData.payment_method_id,
                  email: cardFormData.payer?.email,
                  identificationType: cardFormData.payer?.identification?.type,
                  identificationNumber: cardFormData.payer?.identification?.number,
                  frequency: subscriptionFrequency,
                  frequencyType: subscriptionFrequencyType
                });
              } else {
                // Procesar pago único normal
                rawResult = await processMercadoPagoPayment(currentOrderId, {
                  token: cardFormData.token,
                  paymentMethodId: cardFormData.payment_method_id,
                  email: cardFormData.payer?.email,
                  identificationType: cardFormData.payer?.identification?.type,
                  identificationNumber: cardFormData.payer?.identification?.number
                });
              }

              // Usamos helpers seguros y sin `any`
              onPaymentSuccess({
                orderId: extractId(rawResult, String(currentOrderId)),
                paymentMethodId: cardFormData.payment_method_id,
                token: cardFormData.token,
                installments: cardFormData.installments,
                amount,
                status: extractStatus(rawResult)
              });
            } catch (err) {
              const normalized = normalizeError(err);
              onPaymentError(normalized);
            } finally {
              if (!cancelled) setIsProcessing(false);
            }
          },
          onError: (error: unknown) => {
            const { onPaymentError } = handlersRef.current;
            onPaymentError(normalizeError(error));
            if (!cancelled) setIsProcessing(false);
          }
        }
      };

      const controller = await bricks.create('payment', containerId, settings);
      brickControllerRef.current = controller;
    };

    // ✅ prefer-const: usamos un id fijo para el cleanup
    const timeoutId = window.setTimeout(async () => {
      if (cancelled) return;

      const containerOk = await ensureContainer();
      if (!containerOk || cancelled) {
        console.warn(`⚠️ Contenedor ${containerId} no encontrado; reintento forzado`);
        setForceRender((p) => p + 1);
        return;
      }

      try {
        initializationRef.current = true;
        await loadMercadoPagoSDK();
        if (!cancelled) {
          await initializeBricks();
        }
      } catch (err) {
        const { onPaymentError } = handlersRef.current;
        const normalized = normalizeError(err);
        // Intento de recuperación si es error de contenedor
        if (
          normalized.message.toLowerCase().includes('container') ||
          normalized.message.toLowerCase().includes('contenedor')
        ) {
          setForceRender((p) => p + 1);
          return;
        }
        onPaymentError(normalized);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      const controller = brickControllerRef.current;
      if (controller) {
        try {
          controller.unmount();
        } catch (e) {
          console.warn('Error al desmontar el brick:', e);
        } finally {
          brickControllerRef.current = null;
        }
      }
    };
  }, [publicKey, amount, isMounted, containerId, orderId, cleanupOrphanedContainers]);

  if (!publicKey) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h3 className="font-medium">Error de configuración</h3>
              <p className="text-sm text-red-500">
                La clave pública de MercadoPago no está configurada.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--fg)]">Pagar con tarjeta</h3>
            <p className="text-sm text-[var(--muted)]">Ingresá los datos de tu tarjeta de forma segura</p>
          </div>
        </div>

        {/* Contenedor del Brick */}
        {containerId ? (
          <div
            id={containerId}
            ref={brickContainerRef}
            className="mb-6"
            style={{ minHeight: '400px' }}
          >
            {!isSDKLoaded && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-[var(--muted)]">Cargando formulario de pago...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-[var(--muted)]">Preparando contenedor...</span>
          </div>
        )}

        {/* Total a pagar */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Total a pagar:</span>
            <span className="font-semibold text-[var(--fg)] text-lg">
              ${amount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Pago seguro con MercadoPago</p>
              <p className="text-sm text-green-600">Tus datos están protegidos con la máxima seguridad</p>
            </div>
          </div>
        </div>

        {isProcessing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <p className="text-sm text-blue-800">
                Procesando tu pago... Por favor, no cierres esta ventana.
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
