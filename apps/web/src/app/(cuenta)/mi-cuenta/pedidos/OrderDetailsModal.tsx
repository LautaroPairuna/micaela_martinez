'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Package, Truck, CheckCircle, Clock, AlertCircle, RotateCcw } from 'lucide-react';
import { Orden, OrdenItem } from "@/lib/sdk/userApi";

const getStatusIcon = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
      case 'pending':
        return <Clock className="h-5 w-5 text-[var(--gold)]" />;
      case 'pagado':
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'procesando':
      case 'processing':
        return <Clock className="h-5 w-5 text-[var(--gold)]" />;
      case 'enviado':
      case 'shipped':
        return <Truck className="h-5 w-5 text-purple-500" />;
      case 'entregado':
      case 'delivered':
      case 'cumplido':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelado':
      case 'cancelled':
      case 'rechazado':
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'reembolsado':
      case 'refunded':
        return <RotateCcw className="h-5 w-5 text-gray-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
      case 'pending':
        return 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30';
      case 'pagado':
      case 'paid':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700';
      case 'procesando':
      case 'processing':
        return 'bg-[var(--gold)]/10 text-[var(--gold-dark)] border border-[var(--gold)]/30';
      case 'enviado':
      case 'shipped':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700';
      case 'entregado':
      case 'delivered':
      case 'cumplido':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700';
      case 'cancelado':
      case 'cancelled':
      case 'rechazado':
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700';
      case 'reembolsado':
      case 'refunded':
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

// Definición de tipos para el componente
interface OrderDetailsModalProps {
  order: Orden | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  if (!isOpen || !order) return null;

  const fecha = order.creadoEn ? new Date(order.creadoEn).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';

  const totalFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: order.moneda || 'ARS',
  }).format(Number(order.total || 0));

  // Calcular valores de envío y subtotal
  // Como no tenemos costoEnvio en el tipo Orden, asumimos un valor fijo o 0
  const costoEnvio = 0; // Valor por defecto
  const subtotal = Number(order.total || 0) - costoEnvio;
  const subtotalFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: order.moneda || 'ARS',
  }).format(subtotal);

  const envioFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: order.moneda || 'ARS',
  }).format(costoEnvio);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            Pedido #{order.id.slice(0, 8)}
          </DialogTitle>
          <p className="text-sm text-[var(--muted)] mt-1">
            Detalles del pedido realizado el {fecha}
          </p>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          <div className="md:col-span-2">
            <h3 className="font-bold mb-3">Productos</h3>
            <div className="h-64 pr-4 overflow-y-auto">
              <ul className="divide-y divide-[var(--border)]">
                {(order.items || []).map((item: OrdenItem) => (
                  <li key={item.id} className="flex items-center gap-4 py-3">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      {/* Imagen de producto (si está disponible) */}
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                        <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="font-bold text-sm">
                        {item.titulo || 'Producto no disponible'}
                      </div>
                      <p className="text-xs text-[var(--muted)]">Ref: {item.refId || 'N/A'}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {item.cantidad} x {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))}
                      </p>
                    </div>
                    <div className="font-bold text-sm text-right">
                      {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.cantidad * item.precioUnitario) || 0)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3">Resumen</h3>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${getStatusColor(order.estado)}`}>
                {getStatusIcon(order.estado)}
                <div>
                  <p className="font-bold text-xs">Estado</p>
                  <p className="capitalize font-semibold text-sm">{order.estado}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm pt-4 mt-4 border-t border-[var(--border)]">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Subtotal</span>
                  <span className="font-medium">{subtotalFmt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Envío</span>
                  <span className="font-medium">{envioFmt}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t border-[var(--border)] pt-2 mt-2">
                  <span>Total</span>
                  <span>{totalFmt}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3">Envío</h3>
              <address className="not-italic text-sm space-y-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-[var(--border)]">
                <p className="font-bold">Dirección de envío</p>
                <p>Consultar detalles en el sistema</p>
              </address>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}