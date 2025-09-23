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

  // 🔍 LOGS DE DEPURACIÓN - DETALLE DEL PEDIDO
  console.log('=== DETALLE DEL PEDIDO - DEBUG ===');
  console.log('📦 Orden completa:', order);
  console.log('🔢 ID de la orden:', order.id);
  console.log('📋 Items de la orden:', order.items);
  console.log('📊 Cantidad de items:', order.items?.length || 0);
  
  if (order.items && order.items.length > 0) {
    console.log('🔍 Detalle de cada item:');
    order.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        id: item.id,
        tipo: item.tipo,
        refId: item.refId,
        titulo: item.titulo,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario
      });
    });
  } else {
    console.log('⚠️ No hay items en la orden o items es undefined/null');
  }

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

  // 🔍 LOGS DE DEPURACIÓN - SEPARACIÓN DE ITEMS
  console.log('🛍️ Productos filtrados:', productos);
  console.log('📚 Cursos filtrados:', cursos);
  console.log('📊 Cantidad de productos:', productos.length);
  console.log('📊 Cantidad de cursos:', cursos.length);

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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-black border-2 border-[var(--gold)]/30">
        <DialogHeader className="border-b border-[var(--gold)]/30 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl text-white">
            <div className="p-2 rounded-lg bg-[var(--gold)]/20 border border-[var(--gold)]/40">
              <Package className="h-6 w-6 text-[var(--gold)]" />
            </div>
            <div>
              <div className="font-bold text-[var(--gold)]">Pedido #{order.id.slice(0, 8)}</div>
              <div className="text-sm text-gray-300 font-normal flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                Realizado el {fecha}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-black">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-6">
            {/* Contenido principal - Items del pedido */}
            <div className="lg:col-span-2 space-y-6">
              {/* Productos */}
              {productos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30">
                      <ShoppingBag className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">Productos</h3>
                      <p className="text-sm text-gray-300">{productos.length} producto{productos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {productos.map((item: OrdenItem) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-600 bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 hover:border-[var(--gold)]/40">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 border border-gray-600 flex-shrink-0">
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
                          <div className="font-semibold text-base truncate text-white">
                            {item.titulo || 'Producto no disponible'}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-gray-300">Ref: {item.refId || 'N/A'}</p>
                            <div className="flex items-center gap-1 text-sm text-gray-300">
                              <span>Cantidad: {item.cantidad}</span>
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-1 text-gray-200">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))} c/u
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-[var(--gold)]">
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
                    <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/30">
                      <BookOpen className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">Cursos</h3>
                      <p className="text-sm text-gray-300">{cursos.length} curso{cursos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {cursos.map((item: OrdenItem) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-600 bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 hover:border-[var(--gold)]/40">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 border border-gray-600 flex-shrink-0">
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
                          <div className="font-semibold text-base truncate text-white">
                            {item.titulo || 'Curso no disponible'}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-gray-300">Ref: {item.refId || 'N/A'}</p>
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 border border-purple-400/30 text-purple-300">
                              Acceso digital
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-1 text-gray-200">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-[var(--gold)]">
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
              <div className="bg-gray-900/50 rounded-xl border border-gray-600 p-6">
                <h3 className="font-bold text-lg mb-4 text-white">Estado del pedido</h3>
                <div className={`flex items-center gap-3 p-4 rounded-lg ${getStatusColor(order.estado)}`}>
                  {getStatusIcon(order.estado)}
                  <div>
                    <p className="font-bold text-sm text-gray-300">Estado actual</p>
                    <p className="capitalize font-semibold text-white">{getStatusText(order.estado)}</p>
                  </div>
                </div>
              </div>

              {/* Resumen de pago */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-600 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                  <CreditCard className="h-5 w-5 text-[var(--gold)]" />
                  Resumen de pago
                </h3>
                <div className="space-y-3 text-sm">
                  {productos.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Productos ({productos.length})</span>
                      <span className="font-medium text-white">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(subtotalProductos)}
                      </span>
                    </div>
                  )}
                  {cursos.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Cursos ({cursos.length})</span>
                      <span className="font-medium text-white">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(subtotalCursos)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-300">Subtotal</span>
                    <span className="font-medium text-white">{subtotalFmt}</span>
                  </div>
                  {productos.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Envío</span>
                      <span className="font-medium text-green-400">Gratis</span>
                    </div>
                  )}
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-white">Total</span>
                      <span className="text-[var(--gold)]">{totalFmt}</span>
                    </div>
                  </div>
                  {order.referenciaPago && (
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                      <p className="text-xs text-gray-400 mb-1">Referencia de pago</p>
                      <p className="font-mono text-sm text-white">{order.referenciaPago}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de entrega */}
              {productos.length > 0 && (
                <div className="bg-gray-900/50 rounded-xl border border-gray-600 p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                    <Truck className="h-5 w-5 text-[var(--gold)]" />
                    Información de entrega
                  </h3>
                  <div className="text-sm space-y-2">
                    <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-400/30">
                      <p className="font-medium text-blue-300">Envío gratuito</p>
                      <p className="text-blue-400 text-xs mt-1">
                        Los productos se envían dentro de 24-48 horas hábiles
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Acceso a cursos */}
              {cursos.length > 0 && (
                <div className="bg-gray-900/50 rounded-xl border border-gray-600 p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                    <BookOpen className="h-5 w-5 text-[var(--gold)]" />
                    Acceso a cursos
                  </h3>
                  <div className="text-sm space-y-2">
                    <div className="p-3 bg-green-500/20 rounded-lg border border-green-400/30">
                      <p className="font-medium text-green-300">Acceso inmediato</p>
                      <p className="text-green-400 text-xs mt-1">
                        Los cursos están disponibles en tu área de estudiante
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-600 pt-4 bg-black">
          <Button onClick={onClose} variant="outline" className="px-8 border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:border-[var(--gold)]">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}