'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Clock, RefreshCw, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type PendingStatusDetail =
  | 'pending_contingency'
  | 'pending_review_manual'
  | 'pending_waiting_transfer'
  | 'pending_waiting_payment'
  | 'pending_capture'
  | string;

interface PaymentData {
  id: string;
  status: string | null;
  statusDetail: PendingStatusDetail | null;
}

export default function CheckoutPendingPage() {
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const statusDetail = searchParams.get('status_detail') as PendingStatusDetail | null;

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        if (paymentId) {
          // Simular datos por ahora
          setPaymentData({
            id: paymentId,
            status,
            statusDetail,
          });
        }
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [paymentId, status, statusDetail]);

  const getPendingMessage = (detail: PendingStatusDetail) => {
    const pendingMessages: Record<string, string> = {
      pending_contingency: 'Estamos procesando tu pago. Te notificaremos cuando esté listo.',
      pending_review_manual: 'Tu pago está siendo revisado. Te contactaremos si necesitamos más información.',
      pending_waiting_transfer: 'Estamos esperando la transferencia bancaria.',
      pending_waiting_payment: 'Estamos esperando que completes el pago.',
      pending_capture: 'Tu pago está siendo procesado.',
    };

    return pendingMessages[detail] || 'Tu pago está siendo procesado. Te notificaremos cuando esté listo.';
  };

  const getEstimatedTime = (detail: PendingStatusDetail) => {
    const timeEstimates: Record<string, string> = {
      pending_contingency: '1-2 días hábiles',
      pending_review_manual: '2-3 días hábiles',
      pending_waiting_transfer: '1-3 días hábiles',
      pending_waiting_payment: 'Hasta que completes el pago',
      pending_capture: 'Algunas horas',
    };

    return timeEstimates[detail] || '1-2 días hábiles';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Verificando el estado del pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardBody className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--gold)]/10 flex items-center justify-center mx-auto mb-6">
              <Clock className="h-12 w-12 text-[var(--gold)]" />
            </div>

            <h1 className="text-3xl font-bold text-[var(--fg)] mb-4">Pago en proceso</h1>

            <p className="text-[var(--muted)] text-lg mb-6">
              {paymentData?.statusDetail
                ? getPendingMessage(paymentData.statusDetail)
                : 'Tu pago está siendo procesado. Te notificaremos cuando esté listo.'}
            </p>

            {paymentData && (
              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-[var(--fg)] mb-3">Detalles del pago</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">ID de pago:</span>
                    <span className="text-[var(--fg)] font-mono">{paymentData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Estado:</span>
                    <span className="text-yellow-600 font-semibold">Pendiente</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Tiempo estimado:</span>
                    <span className="text-[var(--fg)]">
                      {paymentData.statusDetail ? getEstimatedTime(paymentData.statusDetail) : '1-2 días hábiles'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">¿Qué pasa ahora?</h4>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Te enviaremos un email cuando el pago sea confirmado</li>
                <li>• Podés verificar el estado en &quot;Mis pedidos&quot;</li>
                <li>• No es necesario que hagas nada más</li>
                <li>• Si tenés dudas, contactanos</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/mi-cuenta">
                <Button className="bg-[var(--gold)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ver mis pedidos
                </Button>
              </Link>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-[var(--border)] text-[var(--fg)] px-6 py-2 hover:bg-[var(--bg-secondary)] transition-all duration-200 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar estado
              </Button>

              <Link href="/tienda">
                <Button
                  variant="outline"
                  className="border-[var(--border)] text-[var(--fg)] px-6 py-2 hover:bg-[var(--bg-secondary)] transition-all duration-200 flex items-center gap-2"
                >
                  Seguir comprando
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
