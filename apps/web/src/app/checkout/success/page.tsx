'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SuccessPaymentData {
  id: string;
  status: string | null;
  merchantOrderId: string | null;
  amount: number;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<SuccessPaymentData | null>(null);
  const [loading, setLoading] = useState(true);

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const merchantOrderId = searchParams.get('merchant_order_id');

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        if (paymentId) {
          // Simular datos por ahora
          setPaymentData({
            id: paymentId,
            status,
            merchantOrderId,
            amount: 0, // Se obtendría de la API
          });
        }
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [paymentId, status, merchantOrderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gold)] mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardBody className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-[var(--fg)] mb-4">¡Pago exitoso!</h1>

            <p className="text-[var(--muted)] text-lg mb-6">
              Tu pago ha sido procesado correctamente. Recibirás un email de confirmación en breve.
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
                    <span className="text-green-600 font-semibold">Aprobado</span>
                  </div>
                  {paymentData.merchantOrderId && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Orden:</span>
                      <span className="text-[var(--fg)] font-mono">{paymentData.merchantOrderId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/mi-cuenta">
                <Button className="bg-[var(--gold)] text-black font-semibold px-6 py-2 hover:shadow-lg transition-all duration-200 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ver mis pedidos
                </Button>
              </Link>

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
