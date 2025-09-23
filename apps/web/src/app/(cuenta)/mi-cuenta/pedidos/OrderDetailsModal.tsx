'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Package, Truck, CheckCircle, Clock, AlertCircle, RotateCcw, BookOpen, ShoppingBag, Calendar, CreditCard } from 'lucide-react';
import { Orden, OrdenItem } from "@/lib/sdk/userApi";
import { SafeImage } from "@/components/ui/SafeImage";

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

const getStatusText = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'Pendiente';
    case 'pagado': return 'Pagado';
    case 'procesando': return 'Procesando';
    case 'enviado': return 'Enviado';
    case 'entregado': return 'Entregado';
    case 'cumplido': return 'Completado';
    case 'cancelado': return 'Cancelado';
    case 'reembolsado': return 'Reembolsado';
    default: return estado;
  }
};

// Función para resolver imágenes de productos
function resolveProductImage(refId?: string): string | undefined {
  if (!refId) return undefined;
  // Asumimos que el refId es el slug del producto
  return `/images/producto/thumbs/${refId}.webp`;
}

// Función para resolver imágenes de cursos
function resolveCourseImage(refId?: string): string | undefined {
  if (!refId) return undefined;
  // Asumimos que el refId es el slug del curso
  return `/images/curso/thumbs/${refId}.webp`;
}

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

  // Separar productos y cursos
  const productos = (order.items || []).filter(item => item.tipo === 'PRODUCTO');
  const cursos = (order.items || []).filter(item => item.tipo === 'CURSO');

  // Calcular subtotales
  const subtotalProductos = productos.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  const subtotalCursos = cursos.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  const costoEnvio = productos.length > 0 ? 0 : 0; // Lógica de envío si es necesaria
  const subtotal = subtotalProductos + subtotalCursos;

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b border-[var(--border)] pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-[var(--gold)]/10">
              <Package className="h-6 w-6 text-[var(--gold)]" />
            </div>
            <div>
              <div className="font-bold">Pedido #{order.id.slice(0, 8)}</div>
              <div className="text-sm text-[var(--muted)] font-normal flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                Realizado el {fecha}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
            {/* Contenido principal - Items del pedido */}
            <div className="lg:col-span-2 space-y-6">
              {/* Productos */}
              {productos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Productos</h3>
                      <p className="text-sm text-[var(--muted)]">{productos.length} producto{productos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {productos.map((item: OrdenItem) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:shadow-sm transition-shadow">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <SafeImage
                            src={resolveProductImage(item.refId)}
                            alt={item.titulo || 'Producto'}
                            className="w-full h-full"
                            ratio="1/1"
                            fit="cover"
                            rounded="all"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="font-semibold text-base truncate">
                            {item.titulo || 'Producto no disponible'}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-[var(--muted)]">Ref: {item.refId || 'N/A'}</p>
                            <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
                              <span>Cantidad: {item.cantidad}</span>
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-1">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))} c/u
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.cantidad * item.precioUnitario) || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cursos */}
              {cursos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Cursos</h3>
                      <p className="text-sm text-[var(--muted)]">{cursos.length} curso{cursos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {cursos.map((item: OrdenItem) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:shadow-sm transition-shadow">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          <SafeImage
                            src={resolveCourseImage(item.refId)}
                            alt={item.titulo || 'Curso'}
                            className="w-full h-full"
                            ratio="1/1"
                            fit="cover"
                            rounded="all"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="font-semibold text-base truncate">
                            {item.titulo || 'Curso no disponible'}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-[var(--muted)]">Ref: {item.refId || 'N/A'}</p>
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              Acceso digital
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-1">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.cantidad * item.precioUnitario) || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Resumen y detalles */}
            <div className="space-y-6">
              {/* Estado del pedido */}
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
                <h3 className="font-bold text-lg mb-4">Estado del pedido</h3>
                <div className={`flex items-center gap-3 p-4 rounded-lg ${getStatusColor(order.estado)}`}>
                  {getStatusIcon(order.estado)}
                  <div>
                    <p className="font-bold text-sm">Estado actual</p>
                    <p className="capitalize font-semibold">{getStatusText(order.estado)}</p>
                  </div>
                </div>
              </div>

              {/* Resumen de pago */}
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Resumen de pago
                </h3>
                <div className="space-y-3 text-sm">
                  {productos.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Productos ({productos.length})</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(subtotalProductos)}
                      </span>
                    </div>
                  )}
                  {cursos.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Cursos ({cursos.length})</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(subtotalCursos)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Subtotal</span>
                    <span className="font-medium">{subtotalFmt}</span>
                  </div>
                  {productos.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">Envío</span>
                      <span className="font-medium text-green-600">Gratis</span>
                    </div>
                  )}
                  <div className="border-t border-[var(--border)] pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-[var(--gold)]">{totalFmt}</span>
                    </div>
                  </div>
                  {order.referenciaPago && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-xs text-[var(--muted)] mb-1">Referencia de pago</p>
                      <p className="font-mono text-sm">{order.referenciaPago}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de entrega */}
              {productos.length > 0 && (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Información de entrega
                  </h3>
                  <div className="text-sm space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="font-medium text-blue-800 dark:text-blue-300">Envío gratuito</p>
                      <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                        Los productos se envían dentro de 24-48 horas hábiles
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Acceso a cursos */}
              {cursos.length > 0 && (
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Acceso a cursos
                  </h3>
                  <div className="text-sm space-y-2">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="font-medium text-green-800 dark:text-green-300">Acceso inmediato</p>
                      <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                        Los cursos están disponibles en tu área de estudiante
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--border)] pt-4">
          <Button onClick={onClose} variant="outline" className="px-8">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}