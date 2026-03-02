// apps/web/src/components/checkout/MercadoPagoBricks.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { AlertCircle } from 'lucide-react';
import { MERCADOPAGO_PUBLIC_KEY } from '@/lib/env';
import { processMercadoPagoPayment, createSubscription } from '@/lib/sdk/ordersApi';
import { z } from 'zod';

/* ─────────────────────────── Tipos ─────────────────────────── */

type PaymentSuccessData = {
  orderId: string;
  paymentMethodId: string;
  // token eliminado por seguridad
  installments?: number;
  amount: number;
  status: string;
};

type PaymentErrorData = { message: string; details?: unknown };
type OnPaymentSuccess = (d: PaymentSuccessData) => void;
type OnPaymentError = (e: PaymentErrorData) => void;

// Validación estricta con Zod
const BrickFormSchema = z.object({
  token: z.string().min(10),
  payment_method_id: z.string().min(2).optional(),
  paymentMethodId: z.string().min(2).optional(),
  selectedPaymentMethod: z.string().min(2).optional(),
  issuer_id: z.union([z.string(), z.number()]).optional(),
  installments: z.union([z.string(), z.number()]).optional(),
  payer: z.object({
    email: z.string().email().optional(),
    identification: z.object({
      type: z.string().optional(),
      number: z.string().optional(),
    }).optional(),
  }).optional(),
}).refine((d) => d.payment_method_id || d.paymentMethodId || d.selectedPaymentMethod, {
  message: 'Falta payment_method_id',
});

function parseBrickData(cardFormData: unknown) {
  const raw = isRecord(cardFormData) 
    ? (cardFormData.formData ?? cardFormData) 
    : {};
    
  const parsed = BrickFormSchema.safeParse(raw);

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten(), raw };
  }

  const d = parsed.data;
  const installments = typeof d.installments === 'number'
    ? d.installments
    : (Number(d.installments) || 1);

  const issuerId = d.issuer_id != null ? String(d.issuer_id) : undefined;
  
  // Extraer paymentMethodId de cualquiera de los campos posibles
  const paymentMethodId = d.payment_method_id || d.paymentMethodId || d.selectedPaymentMethod;

  if (!paymentMethodId) {
    return { ok: false as const, error: { fieldErrors: { payment_method_id: ['ID de método de pago no encontrado'] }, formErrors: [] }, raw };
  }

  return {
    ok: true as const,
    data: {
      token: d.token.trim(),
      paymentMethodId,
      issuerId,
      installments,
      payer: d.payer,
    },
  };
}

type PaymentBrickSettings = {
  initialization: {
    amount: number;
    preferenceId?: string;
    payer?: {
      email?: string;
    };
  };
  customization?: {
    paymentMethods?: {
      creditCard?: 'all' | string[];
      debitCard?: 'all' | string[];
      mercadoPago?: 'all' | string[];
      ticket?: 'all' | string[];
      bankTransfer?: 'all' | string[];
    };
    visual?: { style?: { theme?: 'default' | 'dark' | string } };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (cardFormData: any) => Promise<void> | void;
    onError?: (error: unknown) => void;
  };
};

type BrickController = { unmount: () => Promise<void> | void };
type Bricks = {
  create: (type: 'payment' | 'cardPayment', container: string, settings: PaymentBrickSettings) => Promise<BrickController>;
};
type MercadoPagoInstance = { bricks: () => Bricks };
type MercadoPagoConstructor = new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;

declare global {
  interface Window { MercadoPago?: MercadoPagoConstructor }
}

/* ─────────────────────────── Helpers tipados ─────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function pickFirst<T = unknown>(obj: Record<string, unknown>, keys: readonly string[]): T | undefined {
  for (const k of keys) {
    if (k in obj) return obj[k] as T;
  }
  return undefined;
}
function extractId(resp: unknown, fallback: string): string {
  if (!isRecord(resp)) return fallback;
  const v = pickFirst<unknown>(resp, ['id', 'orderId', 'order_id']);
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return fallback;
}
function extractStatus(resp: unknown): string {
  if (!isRecord(resp)) return 'unknown';
  const v = pickFirst<unknown>(resp, ['estado', 'status', 'payment_status', 'status_detail', 'state']);
  return typeof v === 'string' ? v : 'unknown';
}
function normalizeError(err: unknown): PaymentErrorData {
  if (err instanceof Error) return { message: err.message, details: err };
  if (typeof err === 'string') return { message: err };
  return { message: 'Error desconocido', details: err };
}
function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

/* ─────────── Loader singleton del SDK ─────────── */

let mpSdkPromise: Promise<MercadoPagoConstructor | null> | null = null;
function loadMercadoPagoSDK(): Promise<MercadoPagoConstructor | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (mpSdkPromise) return mpSdkPromise;

  mpSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.async = true;
    s.onload = () => resolve(window.MercadoPago ?? null);
    s.onerror = () => reject(new Error('No se pudo cargar el SDK de MercadoPago'));
    document.head.appendChild(s);
  });
  return mpSdkPromise;
}

/* ─────────────────────────── Props ─────────────────────────── */

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
  /** Si usás preferencia creada en backend, pasala acá */
  preferenceId?: string | null;
  /** Email del pagador para pre-completar el brick */
  payerEmail?: string;
}

/* ─────────────────────────── Componente ─────────────────────────── */

export function MercadoPagoBricks({
  amount,
  orderId,
  onPaymentSuccess,
  onPaymentError,
  onPaymentStart,
  onCreateOrder,
  isSubscription = false,
  subscriptionFrequency = 1,
  subscriptionFrequencyType = 'months',
  preferenceId = null,
  payerEmail,
}: MercadoPagoBricksProps) {
  const publicKey = MERCADOPAGO_PUBLIC_KEY;

  const [isBrickReady, setIsBrickReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Id estable del contenedor (string), requerido por Bricks (usa .startsWith internamente)
  const containerIdRef = useRef<string>(`mp-payment-brick-${Math.random().toString(36).slice(2, 8)}`);

  const controllerRef = useRef<BrickController | null>(null);
  const handlersRef = useRef({ onPaymentSuccess, onPaymentError, onPaymentStart, onCreateOrder });
  handlersRef.current = { onPaymentSuccess, onPaymentError, onPaymentStart, onCreateOrder };

  // Control de montado seguro
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Signature para forzar remount si cambian props críticas
  const signature = useMemo(() => JSON.stringify({
    amount,
    isSubscription,
    preferenceId: preferenceId ?? null,
    subscriptionFrequency,
    subscriptionFrequencyType,
    theme: 'dark',
  }), [amount, isSubscription, preferenceId, subscriptionFrequency, subscriptionFrequencyType]);

  // Efecto de limpieza cuando cambia la signature
  useEffect(() => {
    let alive = true;
    (async () => {
      const c = controllerRef.current;
      if (c?.unmount) await c.unmount();
      if (!alive) return;
      controllerRef.current = null;
      setIsBrickReady(false);
      setIsProcessing(false);
      setInitError(null);
      inFlightRef.current = false;
    })();
    return () => { alive = false; };
  }, [signature]);

  useEffect((): (() => void) | void => {
    if (!publicKey) return;

    let cancelled = false;

    async function mountBrick(): Promise<void> {
      try {
        const MercadoPago = await loadMercadoPagoSDK();
        if (!MercadoPago || cancelled) return;

        // Evitar montar más de una vez por instancia
        if (controllerRef.current) return;

        const mp = new MercadoPago(publicKey, { locale: 'es-AR' });
        const bricks = mp.bricks();

        // Configuración de inicialización
          const init: any = {
            amount: amount,
          };
          
          const pref = asStringOrNull(preferenceId);
          if (pref) init.preferenceId = pref;

        // Configuración de medios: diferenciar entre Payment y Card Payment
        let paymentMethodsCfg: any;
        
        if (isSubscription) {
           // Card Payment Brick: configuración simplificada (solo cuotas)
           // No acepta 'creditCard', 'debitCard' como keys directas en paymentMethods
           paymentMethodsCfg = {
             maxInstallments: 1,
           };
        } else {
           // Payment Brick: configuración completa
           // IMPORTANTE: Habilitar explícitamente tarjetas si no se detectan solas
           paymentMethodsCfg = {
              creditCard: 'all',
              debitCard: 'all',
              ticket: [], 
              bankTransfer: []
           };
        }

        const settings: any = {
          initialization: init,
          customization: {
            paymentMethods: paymentMethodsCfg,
            visual: { 
              style: { 
                theme: 'dark',
                customVariables: {
                  formBackgroundColor: '#18181b',
                  baseColor: '#ffffff',
                }
              } 
            }
          },
          callbacks: {
            onReady: () => {
              if (!cancelled && mountedRef.current) setIsBrickReady(true);
            },
            onSubmit: async (cardFormData: any): Promise<void> => {
              if (cancelled) return;
              if (inFlightRef.current) return; // Evita doble submit
              inFlightRef.current = true;

              const { onPaymentStart, onCreateOrder, onPaymentSuccess, onPaymentError } = handlersRef.current;

              const parsed = parseBrickData(cardFormData);
              if (!parsed.ok) {
                inFlightRef.current = false;
                console.error('=== FRONTEND: Fallo validación Zod ===', parsed.error);
                onPaymentError({ 
                  message: 'Datos de tarjeta inválidos. Revisá los campos e intentá de nuevo.',
                  details: parsed.error, 
                });
                return;
              }

              const { token, paymentMethodId, issuerId, installments, payer } = parsed.data;

              // Email fallback logic
              const email = 
                asStringOrNull(payer?.email) || 
                payerEmail?.trim() || 
                null;

              if (!email) {
                inFlightRef.current = false;
                onPaymentError({ 
                  message: 'Necesitamos un email válido para continuar con el pago.',
                });
                return;
              }

              onPaymentStart?.();
              if (!cancelled && mountedRef.current) setIsProcessing(true);

              try {
                const currentOrderId = orderId ?? (await onCreateOrder());

                console.log('=== FRONTEND: Procesando suscripción/pago ===', {
                  isSubscription,
                  orderId: currentOrderId,
                  email,
                  issuerId,
                  installments
                });

                const rawResult = isSubscription
                  ? await createSubscription(String(currentOrderId), {
                      token,
                      paymentMethodId,
                      issuerId,
                      installments,
                      email,
                      identificationType: asStringOrNull(payer?.identification?.type) || undefined,
                      identificationNumber: asStringOrNull(payer?.identification?.number) || undefined,
                      frequency: subscriptionFrequency,
                      frequencyType: subscriptionFrequencyType,
                    })
                  : await processMercadoPagoPayment(String(currentOrderId), {
                      token,
                      paymentMethodId,
                      issuerId,
                      installments,
                      email,
                      identificationType: asStringOrNull(payer?.identification?.type) || undefined,
                      identificationNumber: asStringOrNull(payer?.identification?.number) || undefined,
                    });

                onPaymentSuccess({
                  orderId: extractId(rawResult, String(currentOrderId)),
                  paymentMethodId,
                  // token eliminado por seguridad
                  installments,
                  amount,
                  status: extractStatus(rawResult),
                });
              } catch (e) {
                console.error('=== FRONTEND: Error en pago ===', e);
                onPaymentError(normalizeError(e));
              } finally {
                if (!cancelled && mountedRef.current) setIsProcessing(false);
                inFlightRef.current = false;
              }
            },
            onError: (error: any) => {
              console.error('=== FRONTEND: Error interno del Brick ===', error);
              if (!cancelled) {
                // Si el error ocurre antes de onReady o interrumpe la carga
                if (!isBrickReady) {
                   setInitError('Hubo un problema al cargar el formulario. Intenta recargar.');
                   setIsBrickReady(true); // Para quitar skeleton
                }
                
                const { onPaymentError } = handlersRef.current;
                onPaymentError(normalizeError(error));
              }
            },
          },
        };

        // ⬅️ Seleccionar el tipo correcto de Brick
        const brickType = isSubscription ? 'cardPayment' : 'payment';
        const controller = await bricks.create(brickType, containerIdRef.current, settings);
        if (!cancelled) controllerRef.current = controller;

      } catch (err) {
        if (!cancelled) {
          console.error('Error mounting brick:', err);
          setInitError('No se pudo iniciar la pasarela de pagos.');
          setIsBrickReady(true); // Quitar skeleton
          onPaymentError(normalizeError(err));
        }
      }
    }

    mountBrick();

    return () => {
      cancelled = true;
      const c = controllerRef.current;
      controllerRef.current = null;
      void (async () => {
        try { await c?.unmount?.(); } catch {}
      })();
    };
  }, [publicKey, signature]);

  if (!publicKey) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Error de configuración</p>
              <p className="text-sm">Falta la clave pública de MercadoPago</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="relative">
      {!isBrickReady && !initError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 space-y-4 animate-pulse pointer-events-none">
          <div className="w-full h-12 bg-zinc-800 rounded-md" />
          <div className="w-full h-12 bg-zinc-800 rounded-md" />
          <div className="w-full h-12 bg-zinc-800 rounded-md" />
          <p className="text-sm text-zinc-500">Cargando pasarela de pago segura...</p>
        </div>
      )}
      
      {initError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-md border border-red-900/50 text-center">
           <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
           <p className="text-red-400 font-medium mb-2">No se pudo cargar el pago</p>
           <p className="text-sm text-zinc-400 mb-4">{initError}</p>
           <button 
             onClick={() => window.location.reload()} 
             className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-sm transition-colors"
           >
             Recargar página
           </button>
        </div>
      )}

      {/* 
        El contenedor del brick se renderiza siempre porque Bricks necesita encontrar el ID en el DOM
        antes de montarse. Lo ocultamos visualmente si no está listo, o mostramos el skeleton encima.
        Pero NO debemos usar un ternario que desmonte el div id={...}
      */}
      <div id={containerIdRef.current} className={isBrickReady ? '' : 'opacity-0'} />
      {isProcessing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-lg">
          <div className="rounded-lg bg-zinc-900 px-4 py-3 text-sm text-zinc-100 flex items-center gap-3 shadow-xl border border-zinc-800">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            <span>Procesando... No cierres esta ventana.</span>
          </div>
        </div>
      )}
    </div>
  );
}
