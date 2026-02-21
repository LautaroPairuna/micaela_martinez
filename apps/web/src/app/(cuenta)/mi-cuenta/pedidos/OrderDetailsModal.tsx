'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Package, Truck, CheckCircle, Clock, AlertCircle, RotateCcw, BookOpen, ShoppingBag, Calendar, CreditCard, ExternalLink, X } from 'lucide-react';
import { Orden, OrdenItem } from "@/lib/sdk/userApi";
import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";

import { resolveProductThumb, resolveCourseThumb } from "@/lib/image-utils";

const getStatusIcon = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'pendiente':
    case 'pending':
      return <Clock className="h-4 w-4 text-[var(--gold)]" />;
    case 'pagado':
    case 'paid':
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    case 'procesando':
    case 'processing':
      return <Clock className="h-4 w-4 text-blue-400" />;
    case 'enviado':
    case 'shipped':
      return <Truck className="h-4 w-4 text-purple-400" />;
    case 'entregado':
    case 'delivered':
    case 'cumplido':
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'cancelado':
    case 'cancelled':
    case 'rechazado':
    case 'rejected':
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case 'reembolsado':
    case 'refunded':
      return <RotateCcw className="h-4 w-4 text-zinc-400" />;
    default:
      return <Package className="h-4 w-4 text-zinc-400" />;
  }
};

const getStatusColor = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'pendiente':
    case 'pending':
      return 'bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20';
    case 'pagado':
    case 'paid':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case 'procesando':
    case 'processing':
      return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'enviado':
    case 'shipped':
      return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case 'entregado':
    case 'delivered':
    case 'cumplido':
      return 'bg-green-500/10 text-green-400 border border-green-500/20';
    case 'cancelado':
    case 'cancelled':
    case 'rechazado':
    case 'rejected':
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    case 'reembolsado':
    case 'refunded':
      return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
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
function resolveProductImage(item: OrdenItem): string | undefined {
  if (item.imagen) {
    return resolveProductThumb(item.imagen);
  }
  // Fallback si no hay imagen (no debería ocurrir si el backend está actualizado)
  return resolveProductThumb(item.refId);
}

// Función para resolver imágenes de cursos
function resolveCourseImage(refId?: string): string | undefined {
  if (!refId) return undefined;
  return resolveCourseThumb(refId);
}

// Definición de tipos para el componente
interface OrderDetailsModalProps {
  order: Orden | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  // Siempre renderizamos el Dialog para evitar problemas de montaje/desmontaje
  // Controlamos el contenido interno verificando si hay orden
  
  const fecha = order?.creadoEn ? new Date(order.creadoEn).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '—';

  // Separar productos y cursos (con seguridad de null)
  const items = order?.items || [];
  const productos = items.filter(item => item.tipo === 'PRODUCTO');
  const cursos = items.filter(item => item.tipo === 'CURSO');

  // Calcular subtotales
  const subtotalProductos = productos.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  const subtotalCursos = cursos.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
  const subtotal = subtotalProductos + subtotalCursos;

  const currency = order?.moneda || 'ARS';

  const subtotalFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(subtotal);

  const totalFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(Number(order?.total || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-[var(--bg)] border border-[var(--border)] flex flex-col shadow-2xl p-0 gap-0">
        {!order ? (
          <div className="p-8 text-center text-[var(--muted)]">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p>Cargando información del pedido...</p>
          </div>
        ) : (
          <>
        <DialogHeader className="relative border-b border-[var(--border)] p-5 lg:p-6 flex-shrink-0 bg-[var(--card)]">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-4 text-xl text-[var(--fg)]">
              <div className="p-2.5 rounded-xl bg-[var(--subtle)] border border-[var(--border)] shadow-sm">
                <Package className="h-5 w-5 text-[var(--gold)]" />
              </div>
              <div>
                <div className="font-bold text-xl">Pedido #{String(order.id).slice(0, 8)}</div>
                <div className="text-sm text-[var(--muted)] font-normal flex items-center gap-2 mt-1 font-sans">
                  <Calendar className="h-4 w-4" />
                  <span>Realizado el {fecha}</span>
                </div>
              </div>
            </DialogTitle>
            <button 
              onClick={onClose}
              className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--subtle)] hover:text-[var(--fg)] transition-all hover:scale-105 active:scale-95 border border-transparent hover:border-[var(--border)]"
              aria-label="Cerrar detalles del pedido"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0 overflow-y-auto bg-[var(--bg)]">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 h-full">
            {/* Contenido principal - Items del pedido */}
            <div className="lg:col-span-3 overflow-y-auto p-5 lg:p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
              {/* Productos */}
              {productos.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md py-3 z-10 -mx-2 px-2 border-b border-transparent">
                    <div className="p-2 rounded-lg bg-[var(--subtle)] border border-[var(--border)]">
                      <ShoppingBag className="h-4 w-4 text-[var(--gold)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--fg)]">Productos</h3>
                      <p className="text-xs text-[var(--muted)]">{productos.length} producto{productos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {productos.map((item: OrdenItem) => (
                      <div key={item.id} className="flex items-start sm:items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--subtle)] transition-all duration-200 hover:border-[var(--gold)]/30 group">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--subtle)] border border-[var(--border)] flex-shrink-0 group-hover:border-[var(--gold)]/30 transition-colors">
                          <SafeImage
                            src={resolveProductImage(item)}
                            alt={item.titulo || 'Producto'}
                            className="w-full h-full"
                            ratio="1/1"
                            fit="cover"
                            rounded="all"
                          />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="font-bold text-base truncate text-[var(--fg)]">
                            {item.titulo || 'Producto no disponible'}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-sm text-[var(--muted)]">Ref: {item.refId || 'N/A'}</p>
                            <span className="text-xs text-[var(--muted)] px-2 py-0.5 bg-[var(--subtle)] rounded-full border border-[var(--border)]">Cant: {item.cantidad}</span>
                          </div>
                          <p className="text-sm font-semibold mt-2 text-[var(--gold)]">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))} c/u
                          </p>
                        </div>
                        <div className="text-right pl-4 hidden sm:block">
                          <div className="font-bold text-lg text-[var(--fg)]">
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                  <div className="flex items-center gap-3 mb-4 sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md py-3 z-10 -mx-2 px-2 border-b border-transparent">
                    <div className="p-2 rounded-lg bg-[var(--subtle)] border border-[var(--border)]">
                      <BookOpen className="h-4 w-4 text-[var(--gold)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-[var(--fg)]">Cursos</h3>
                      <p className="text-xs text-[var(--muted)]">{cursos.length} curso{cursos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {cursos.map((item: OrdenItem) => (
                      <div key={item.id} className="flex items-start sm:items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--subtle)] transition-all duration-200 hover:border-[var(--gold)]/30 group">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--subtle)] border border-[var(--border)] flex-shrink-0 group-hover:border-[var(--gold)]/30 transition-colors">
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
                          <div className="font-bold text-base truncate text-[var(--fg)]">
                            {item.titulo || 'Curso no disponible'}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <p className="text-sm text-[var(--muted)]">Ref: {item.refId || 'N/A'}</p>
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              Digital
                            </div>
                          </div>
                          <p className="text-sm font-semibold mt-2 text-[var(--gold)]">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(Number(item.precioUnitario || 0))}
                          </p>
                        </div>
                        <div className="text-right pl-4 hidden sm:block">
                          <div className="font-bold text-lg text-[var(--fg)]">
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
            <div className="lg:col-span-2 flex flex-col min-h-0 bg-[var(--subtle)]/30">
              <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-5">
                {/* Estado del pedido */}
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                  <h3 className="font-bold text-base mb-3 text-[var(--fg)]">Estado del pedido</h3>
                  <div className={`flex items-center gap-4 p-4 rounded-xl border ${getStatusColor(order.estado)}`}>
                    <div className="p-2 rounded-full bg-white/10">
                      {getStatusIcon(order.estado)}
                    </div>
                    <div>
                      <p className="font-bold text-xs opacity-80 uppercase tracking-wider mb-0.5">Estado actual</p>
                      <p className="capitalize font-bold text-lg">{getStatusText(order.estado)}</p>
                    </div>
                  </div>
                </div>

                {/* Resumen de pago */}
                <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
                  <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-[var(--fg)]">
                    <CreditCard className="h-4 w-4 text-[var(--gold)]" />
                    Resumen de pago
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Subtotal productos</span>
                      <span className="font-medium text-[var(--fg)]">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(subtotalProductos)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Subtotal cursos</span>
                      <span className="font-medium text-[var(--fg)]">
                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda || 'ARS' }).format(subtotalCursos)}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-[var(--border)] flex justify-between items-end mt-2">
                      <span className="font-bold text-lg text-[var(--fg)]">Total</span>
                      <span className="font-bold text-2xl text-[var(--gold)]">{totalFmt}</span>
                    </div>
                  </div>
                </div>
                
                {/* Acceso rápido a cursos */}
                {cursos.length > 0 && (order.estado === 'CUMPLIDO' || order.estado === 'PAGADO' || order.estado === 'ENTREGADO') && (
                  <div className="bg-gradient-to-br from-[var(--gold)]/10 to-transparent rounded-xl border border-[var(--gold)]/20 p-5">
                    <h3 className="font-bold text-base mb-2 text-[var(--gold)] flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Acceso a cursos
                    </h3>
                    <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
                      Tus cursos ya están disponibles. Puedes acceder a ellos desde la sección "Mi Aprendizaje".
                    </p>
                    <Link 
                      href="/mi-cuenta/mi-aprendizaje"
                      className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-[var(--gold)] text-black font-bold rounded-xl hover:bg-[var(--gold-dark)] transition-all transform hover:scale-[1.02] shadow-lg shadow-[var(--gold)]/10"
                    >
                      Ir a Mi Aprendizaje
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}
      </DialogContent>
    </Dialog>
  );
}
