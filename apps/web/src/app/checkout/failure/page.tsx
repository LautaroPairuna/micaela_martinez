'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type PaymentStatusDetail =
  | 'cc_rejected_insufficient_amount'
  | 'cc_rejected_bad_filled_card_number'
  | 'cc_rejected_bad_filled_date'
  | 'cc_rejected_bad_filled_security_code'
  | 'cc_rejected_call_for_authorize'
  | 'cc_rejected_card_disabled'
  | 'cc_rejected_duplicated_payment'
  | 'cc_rejected_high_risk'
  | (string & {}); // permitir otros valores de backend

interface FailurePaymentData {
  id: string;
  status: string | null;
  statusDetail: PaymentStatusDetail | null;
}

export default function CheckoutFailurePage() {
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<FailurePaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const statusDetail = searchParams.get('status_detail') as PaymentStatusDetail | null;

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

  const getErrorMessage = (detail: PaymentStatusDetail | null) => {
    const errorMessages: Record<PaymentStatusDetail, string> = {
      cc_rejected_insufficient_amount: 'Fondos insuficientes en tu tarjeta',
      cc_rejected_bad_filled_card_number: 'Número de tarjeta incorrecto',
      cc_rejected_bad_filled_date: 'Fecha de vencimiento incorrecta',
      cc_rejected_bad_filled_security_code: 'Código de seguridad incorrecto',
      cc_rejected_call_for_authorize: 'Debes autorizar el pago con tu banco',
      cc_rejected_card_disabled: 'Tu tarjeta está deshabilitada',
      cc_rejected_duplicated_payment: 'Ya realizaste un pago con estos datos',
      cc_rejected_high_risk: 'Pago rechazado por seguridad',
    } as const;

    if (!detail) return 'Hubo un problema procesando tu pago';
    return errorMessages[detail] ?? 'Hubo un problema procesando tu pago';
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
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>

            <h1 className="text-3xl font-bold text-[var(--fg)] mb-4">Pago no procesado</h1>

            <p className="text-[var(--muted)] text-lg mb-6">
              {paymentData?.statusDetail
                ? getErrorMessage(paymentData.statusDetail)
                : 'No pudimos procesar tu pago. Por favor, intentá nuevamente.'}
            </p>

            {paymentData && (
              <div className="bg-[var(--bg-secondary)] rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-[var(--fg)] mb-3">Detalles del intento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">ID de pago:</span>
                    <span className="text-[var(--fg)] font-mono">{paymentData.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Estado:</span>
                    <span className="text-red-600 font-semibold">Rechazado</span>
                  </div>
                  {paymentData.statusDetail && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Motivo:</span>
                      <span className="text-[var(--fg)]">{paymentData.statusDetail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">¿Qué podés hacer?</h4>
              <ul className="text-sm text-blue-700 text-left space-y-1">
                <li>• Verificá los datos de tu tarjeta</li>
                <li>• Asegurate de tener fondos suficientes</li>
                <li>• Contactá a tu banco si es necesario</li>
                <li>• Probá con otro método de pago</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/checkout">
                <Button className="bg-[var(--gold)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Intentar nuevamente
                </Button>
              </Link>

              <Link href="/tienda">
                <Button
                  variant="outline"
                  className="border-[var(--border)] text-[var(--fg)] px-6 py-2 hover:bg-[var(--bg-secondary)] transition-all duration-200 flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a la tienda
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
