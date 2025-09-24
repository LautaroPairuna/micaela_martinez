// apps/web/src/components/checkout/MercadoPagoBricks.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { CreditCard, Shield, AlertCircle } from 'lucide-react';
import { MERCADOPAGO_PUBLIC_KEY } from '@/lib/env';
import { processMercadoPagoPayment, createSubscription } from '@/lib/sdk/ordersApi';

/* ─────────────────────────── Tipos locales ─────────────────────────── */

type PaymentSuccessData = {
  orderId: string;
  paymentMethodId: string;
  token: string;
  installments?: number;
  amount: number;
  status: string;
};

type PaymentErrorData = { message: string; details?: unknown };
type OnPaymentSuccess = (d: PaymentSuccessData) => void;
type OnPaymentError = (e: PaymentErrorData) => void;

type CardFormData = {
  token: string;
  payment_method_id: string;
  installments?: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
};

type PaymentBrickSettings = {
  initialization: { amount: number; preferenceId?: string | null };
  customization?: {
    paymentMethods?: {
      creditCard?: 'all' | string[];
      debitCard?: 'all' | string[];
      mercadoPago?: 'all' | string[];
    };
    visual?: { style?: { theme?: 'default' | 'dark' | string } };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (cardFormData: CardFormData) => Promise<void> | void;
    onError?: (error: unknown) => void;
  };
};

type BrickController = { unmount: () => Promise<void> | void };

type Bricks = {
  create: (type: 'payment', container: HTMLElement, settings: PaymentBrickSettings) => Promise<BrickController>;
};

type MercadoPagoInstance = { bricks: () => Bricks };

type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string }
) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

/* ─────────────────────────── Helpers tipados ─────────────────────────── */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function pickFirst<T = unknown>(
  obj: Record<string, unknown>,
  keys: readonly string[]
): T | undefined {
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

  const candidates = ['estado', 'status', 'payment_status', 'status_detail', 'state'] as const;
  const v = pickFirst<unknown>(resp, candidates);
  return typeof v === 'string' ? v : 'unknown';
}

function normalizeError(err: unknown): PaymentErrorData {
  if (err instanceof Error) return { message: err.message, details: err };
  if (typeof err === 'string') return { message: err };
  return { message: 'Error desconocido', details: err };
}

/* ─────────── Loader singleton del SDK (agrega <script> una sola vez) ─────────── */

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

/* ─────────────────────────── Props del componente ─────────────────────────── */

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

/* ─────────────────────────── Componente ─────────────────────────── */

export function MercadoPagoBricks(props: MercadoPagoBricksProps) {
  const {
    amount,
    orderId,
    onPaymentSuccess,
    onPaymentError,
    onPaymentStart,
    onCreateOrder,
    isSubscription = false,
    subscriptionFrequency = 1,
    subscriptionFrequencyType = 'months',
  } = props;

  const publicKey = MERCADOPAGO_PUBLIC_KEY;

  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<BrickController | null>(null);

  // Mantener referencias a handlers sin recrear callbacks del SDK
  const handlersRef = useRef({
    onPaymentSuccess,
    onPaymentError,
    onPaymentStart,
    onCreateOrder,
  });
  handlersRef.current = {
    onPaymentSuccess,
    onPaymentError,
    onPaymentStart,
    onCreateOrder,
  };

  useEffect(() => {
    if (!publicKey) return;

    let cancelled = false;

    async function mountBrick(): Promise<void> {
      try {
        const MercadoPago = await loadMercadoPagoSDK();
        if (!MercadoPago || cancelled) return;

        setIsSDKLoaded(true);

        // Evitar montar dos veces si ya existe
        if (!containerRef.current || controllerRef.current) return;

        const mp = new MercadoPago(publicKey, { locale: 'es-AR' });
        const bricks = mp.bricks();

        const settings: PaymentBrickSettings = {
          initialization: { amount, preferenceId: null },
          customization: {
            paymentMethods: { creditCard: 'all', debitCard: 'all', mercadoPago: 'all' },
            visual: { style: { theme: 'default' } },
          },
          callbacks: {
            onReady: () => {
              // opcional: log
            },
            onSubmit: async (cardFormData: CardFormData) => {
              if (cancelled) return;

              const { onPaymentStart, onCreateOrder, onPaymentSuccess, onPaymentError } =
                handlersRef.current;

              onPaymentStart?.();
              setIsProcessing(true);

              try {
                const currentOrderId = orderId ?? (await onCreateOrder());

                const rawResult = isSubscription
                  ? await createSubscription(currentOrderId, {
                      token: cardFormData.token,
                      paymentMethodId: cardFormData.payment_method_id,
                      email: cardFormData.payer?.email,
                      identificationType: cardFormData.payer?.identification?.type,
                      identificationNumber: cardFormData.payer?.identification?.number,
                      frequency: subscriptionFrequency,
                      frequencyType: subscriptionFrequencyType,
                    })
                  : await processMercadoPagoPayment(currentOrderId, {
                      token: cardFormData.token,
                      paymentMethodId: cardFormData.payment_method_id,
                      email: cardFormData.payer?.email,
                      identificationType: cardFormData.payer?.identification?.type,
                      identificationNumber: cardFormData.payer?.identification?.number,
                    });

                onPaymentSuccess({
                  orderId: extractId(rawResult, String(currentOrderId)),
                  paymentMethodId: cardFormData.payment_method_id,
                  token: cardFormData.token,
                  installments: cardFormData.installments,
                  amount,
                  status: extractStatus(rawResult),
                });
              } catch (err) {
                onPaymentError(normalizeError(err));
              } finally {
                if (!cancelled) setIsProcessing(false);
              }
            },
            onError: (error: unknown) => {
              if (!cancelled) {
                handlersRef.current.onPaymentError(normalizeError(error));
                setIsProcessing(false);
              }
            },
          },
        };

        const controller = await bricks.create('payment', containerRef.current, settings);
        if (!cancelled) controllerRef.current = controller;
      } catch (e) {
        if (!cancelled) handlersRef.current.onPaymentError(normalizeError(e));
      }
    }

    void mountBrick();

    // Cleanup SIN setTimeout y sin tocar el DOM manualmente
    return () => {
      cancelled = true;
      const c = controllerRef.current;
      controllerRef.current = null;
      if (c) {
        try {
          c.unmount();
        } catch {
          // noop
        }
      }
    };
  }, [
    publicKey,
    amount,
    orderId,
    isSubscription,
    subscriptionFrequency,
    subscriptionFrequencyType,
  ]);

  if (!publicKey) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h3 className="font-medium">Error de configuración</h3>
              <p className="text-sm text-red-500">La clave pública de MercadoPago no está configurada.</p>
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

        {/* Contenedor del Brick (no tocar DOM manualmente) */}
        <div ref={containerRef} className="mb-6" style={{ minHeight: 400 }}>
          {!isSDKLoaded && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-[var(--muted)]">Cargando formulario de pago...</span>
            </div>
          )}
        </div>

        {/* Total a pagar */}
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--muted)]">Total a pagar:</span>
            <span className="font-semibold text-[var(--fg)] text-lg">
              ${amount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Estado de procesamiento */}
        {isProcessing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <p className="text-sm text-blue-800">Procesando tu pago... No cierres esta ventana.</p>
            </div>
          </div>
        )}

        {/* Aviso de seguridad */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Pago seguro con MercadoPago</p>
              <p className="text-sm text-green-600">Tus datos están protegidos con la máxima seguridad</p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
