// apps/web/src/components/checkout/MercadoPagoBricks.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MERCADOPAGO_PUBLIC_KEY } from '@/lib/env';
import { processMercadoPagoPayment, createSubscription } from '@/lib/sdk/ordersApi';
import { z } from 'zod';

/* ─────────────────────────── Tipos ─────────────────────────── */

type PaymentSuccessData = {
  orderId: number;
  paymentMethodId: string;
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

  const issuerId = d.issuer_id != null ? Number(d.issuer_id) : undefined;
  
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
function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase();
  }
  return '';
}
function buildErrorHaystack(err: unknown): string {
  const tokens: string[] = [];
  const push = (value: unknown) => {
    const normalized = normalizeText(value);
    if (normalized) tokens.push(normalized);
  };

  if (typeof err === 'string') push(err);
  if (err instanceof Error) {
    push(err.message);
  }

  if (isRecord(err)) {
    push(err.message);
    push(err.cause);
    push(err.type);
    const details = err.details;
    if (isRecord(details)) {
      push(details.message);
      push(details.cause);
      push(details.type);
      push(details.code);
      push(details.error);
      push(details.status_detail);
    } else {
      push(details);
    }
  }

  try {
    tokens.push(JSON.stringify(err).toLowerCase());
  } catch {}

  return tokens.join(' ');
}
function mapMercadoPagoErrorMessage(err: unknown): string | null {
  const haystack = buildErrorHaystack(err);
  if (!haystack) return null;

  if (haystack.includes('payment_method_not_in_allowed_types')) {
    return 'El medio elegido no está permitido para este checkout. Probá con una tarjeta de crédito o débito.';
  }
  if (haystack.includes('cc_rejected_insufficient_amount')) {
    return 'La tarjeta no tiene fondos suficientes. Probá con otra tarjeta o contactá a tu banco.';
  }
  if (
    haystack.includes('cc_rejected_bad_filled_card_number') ||
    haystack.includes('cc_rejected_bad_filled_date') ||
    haystack.includes('cc_rejected_bad_filled_security_code') ||
    haystack.includes('cc_rejected_bad_filled_other')
  ) {
    return 'Revisá los datos de la tarjeta e intentá nuevamente.';
  }
  if (haystack.includes('cc_rejected_invalid_installments')) {
    return 'La tarjeta no acepta esa cantidad de cuotas. Probá con otra opción.';
  }
  if (haystack.includes('cc_rejected_call_for_authorize')) {
    return 'Tu banco requiere autorización. Contactalo o probá con otra tarjeta.';
  }
  if (haystack.includes('cc_rejected_card_disabled')) {
    return 'La tarjeta está inactiva o bloqueada. Probá con otra tarjeta.';
  }
  if (haystack.includes('cc_rejected_duplicated_payment')) {
    return 'Ya se registró un pago muy similar. Esperá unos minutos antes de reintentar.';
  }
  if (haystack.includes('cc_rejected_high_risk')) {
    return 'El pago fue rechazado por validación de seguridad. Probá con otro medio.';
  }
  if (haystack.includes('cc_rejected_max_attempts')) {
    return 'Se alcanzó el máximo de intentos con esta tarjeta. Probá con otra.';
  }
  if (haystack.includes('cc_rejected_other_reason') || haystack.includes('cc_rejected_card_error')) {
    return 'Tu banco rechazó el pago. Probá con otra tarjeta o contactá a tu banco.';
  }
  return null;
}
function normalizeError(err: unknown): PaymentErrorData {
  const mappedMessage = mapMercadoPagoErrorMessage(err);
  if (mappedMessage) {
    return {
      message: mappedMessage,
      details: err,
    };
  }
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
  orderId: number | null; // Ahora number
  onPaymentSuccess: OnPaymentSuccess;
  onPaymentError: OnPaymentError;
  onPaymentStart?: () => void;
  onCreateOrder: () => Promise<number>; // Devuelve number
  isSubscription?: boolean;
  subscriptionFrequency?: number;
  subscriptionFrequencyType?: 'days' | 'months';
  preferenceId?: string | null;
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

  const containerIdRef = useRef<string>(`mp-payment-brick-${Math.random().toString(36).slice(2, 8)}`);
  const controllerRef = useRef<BrickController | null>(null);
  const handlersRef = useRef({ onPaymentSuccess, onPaymentError, onPaymentStart, onCreateOrder });
  handlersRef.current = { onPaymentSuccess, onPaymentError, onPaymentStart, onCreateOrder };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (amount <= 0 && !initError) {
      console.warn('MercadoPagoBricks: Monto inválido o 0, esperando actualización...', amount);
    }
  }, [amount, initError]);

  const signature = useMemo(() => JSON.stringify({
    amount,
    isSubscription,
    preferenceId: preferenceId ?? null,
    subscriptionFrequency,
    subscriptionFrequencyType,
    theme: 'dark',
  }), [amount, isSubscription, preferenceId, subscriptionFrequency, subscriptionFrequencyType]);

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
        if (controllerRef.current) return;

        const mp = new MercadoPago(publicKey, { locale: 'es-AR' });
        const bricks = mp.bricks();
        const safeAmount = Math.max(1, Number(amount) || 0);

        const init: any = { amount: safeAmount };
        const pref = asStringOrNull(preferenceId);
        if (pref) init.preferenceId = pref;

        let paymentMethodsCfg: any;
        if (isSubscription) {
           paymentMethodsCfg = {
              creditCard: 'all',
              debitCard: 'all',
              ticket: [],
              bankTransfer: [],
              mercadoPago: [],
              maxInstallments: 1,
              minInstallments: 1,
           };
        } else {
           paymentMethodsCfg = {
              creditCard: 'all',
              debitCard: 'all',
              ticket: [],
              bankTransfer: [],
              mercadoPago: [],
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
              if (inFlightRef.current) return;
              inFlightRef.current = true;

              const { onPaymentStart, onCreateOrder, onPaymentSuccess, onPaymentError } = handlersRef.current;
              const parsed = parseBrickData(cardFormData);

              if (!parsed.ok) {
                inFlightRef.current = false;
                onPaymentError({ 
                  message: 'Datos de tarjeta inválidos.',
                  details: parsed.error, 
                });
                return;
              }

              const { token, paymentMethodId, issuerId, installments, payer } = parsed.data;
              const email = asStringOrNull(payer?.email) || payerEmail?.trim() || null;

              if (!email) {
                inFlightRef.current = false;
                onPaymentError({ message: 'Necesitamos un email válido.' });
                return;
              }

              onPaymentStart?.();
              if (!cancelled && mountedRef.current) setIsProcessing(true);

              try {
                const currentOrderId = orderId ?? (await onCreateOrder());
                const attemptId = (typeof globalThis.crypto?.randomUUID === 'function') 
                  ? globalThis.crypto.randomUUID() 
                  : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

                console.log('=== FRONTEND: Procesando ===', { currentOrderId, attemptId });

                const orderResult = isSubscription
                  ? await createSubscription(currentOrderId, {
                      card_token_id: token,
                      payment_method_id: paymentMethodId,
                      payer_email: email,
                      payer_identification: {
                        type: asStringOrNull(payer?.identification?.type) || 'DNI',
                        number: asStringOrNull(payer?.identification?.number) || '',
                      },
                      frequency: subscriptionFrequency,
                      frequency_type: subscriptionFrequencyType || 'months',
                      attemptId,
                    })
                  : await processMercadoPagoPayment(currentOrderId, {
                      token,
                      payment_method_id: paymentMethodId,
                      ...(issuerId != null ? { issuer_id: issuerId } : {}),
                      installments,
                      payer_email: email,
                      payer_identification: {
                        type: asStringOrNull(payer?.identification?.type) || 'DNI',
                        number: asStringOrNull(payer?.identification?.number) || '',
                      },
                      attemptId,
                    });

                const resolvedStatus =
                  isRecord(orderResult) && typeof orderResult.estado === 'string'
                    ? orderResult.estado
                    : isRecord(orderResult) && typeof orderResult.status === 'string'
                      ? orderResult.status
                      : 'PENDING';

                onPaymentSuccess({
                  orderId: currentOrderId,
                  paymentMethodId,
                  installments,
                  amount,
                  status: resolvedStatus,
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
                if (!isBrickReady) {
                   setInitError('Hubo un problema al cargar el formulario.');
                   setIsBrickReady(true);
                }
                const { onPaymentError } = handlersRef.current;
                onPaymentError(normalizeError(error));
              }
            },
          },
        };

        const brickType = 'payment';
        const controller = await bricks.create(brickType, containerIdRef.current, settings);
        if (!cancelled) controllerRef.current = controller;

      } catch (err) {
        if (!cancelled) {
          console.error('Error mounting brick:', err);
          setInitError('No se pudo iniciar la pasarela.');
          setIsBrickReady(true);
          onPaymentError(normalizeError(err));
        }
      }
    }

    mountBrick();

    return () => {
      cancelled = true;
      const c = controllerRef.current;
      controllerRef.current = null;
      void (async () => { try { await c?.unmount?.(); } catch {} })();
    };
  }, [
    publicKey,
    signature,
    amount,
    isBrickReady,
    isSubscription,
    onPaymentError,
    orderId,
    payerEmail,
    preferenceId,
    subscriptionFrequency,
    subscriptionFrequencyType,
  ]);

  if (!publicKey) return <div className="text-red-500 p-4">Error: Falta configuración pública.</div>;

  return (
    <div className="relative">
      {!isBrickReady && !initError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 space-y-4 animate-pulse">
          <div className="w-full h-12 bg-zinc-800 rounded-md" />
          <div className="w-full h-12 bg-zinc-800 rounded-md" />
        </div>
      )}
      {initError && <div className="text-red-400 p-4 bg-red-900/20 rounded">{initError}</div>}
      <div id={containerIdRef.current} className={isBrickReady ? '' : 'opacity-0'} />
      {isProcessing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-sm">
          <div className="text-white font-medium animate-pulse">Procesando pago...</div>
        </div>
      )}
    </div>
  );
}
