'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2, ShoppingBag, User, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import Link from 'next/link';

interface OrderItem {
  id: number;
  usuarioId: number;
  estado: string;
  total: number;
  moneda: string;
  referenciaPago: string | null;
  creadoEn: string;
  esSuscripcion: boolean;
  usuario?: { email: string; nombre?: string };
  items?: { titulo: string; cantidad: number }[];
  _count?: { items: number };
  direccionEnvio?: { calle: string; ciudad: string; provincia: string };
}

interface OrdersListProps {
  data: {
    items: OrderItem[];
    pagination: {
      page: number;
      totalPages: number;
      totalItems: number;
    };
  };
  onEdit: (item: OrderItem) => void;
  onDelete: (item: OrderItem) => void;
  getPageHref: (page: number) => string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDIENTE': return 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/60';
    case 'PAGADO': return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/60';
    case 'ENVIADO': return 'bg-blue-500/20 text-blue-200 border border-blue-500/60';
    case 'ENTREGADO': return 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/60';
    case 'CANCELADO': return 'bg-rose-500/15 text-rose-200 border border-rose-500/60';
    case 'REEMBOLSADO': return 'bg-purple-500/20 text-purple-200 border border-purple-500/60';
    default: return 'bg-slate-500/20 text-slate-200 border border-slate-500/60';
  }
};

export function OrdersList({ data, onEdit, onDelete, getPageHref }: OrdersListProps) {
  const { items, pagination } = data;
  const { page, totalPages, totalItems } = pagination;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
        <ShoppingBag className="h-12 w-12 text-slate-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-200">No hay pedidos</h3>
        <p className="text-sm text-slate-400">Aún no se han registrado órdenes en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((order) => (
          <div key={order.id} className="group relative flex flex-col justify-between rounded-xl border border-[#222] bg-[#0f0f0f] transition-all hover:border-[#333] hover:shadow-lg hover:shadow-black/40">
            <div className="p-5 space-y-4">
              {/* Header: ID y Estado */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-slate-400">
                    Orden #{order.id}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(order.creadoEn), "d MMM, HH:mm", { locale: es })}
                  </div>
                </div>
                <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${getStatusColor(order.estado)}`}>
                  {order.estado}
                </span>
              </div>

              {/* Precio Grande */}
              <div className="text-3xl font-bold tracking-tight text-slate-100">
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: order.moneda }).format(order.total)}
              </div>
              
              {/* Detalles: Usuario e Items */}
              <div className="space-y-3 pt-2 border-t border-[#1f1f1f]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
                    <User className="h-3 w-3 text-slate-500" />
                  </div>
                  <span className="text-xs text-slate-400 truncate font-medium" title={order.usuario?.email}>
                    {order.usuario?.email || `Usuario ID: ${order.usuarioId}`}
                  </span>
                </div>

                {order.items && order.items.length > 0 ? (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
                      <ShoppingBag className="h-3 w-3 text-slate-500" />
                    </div>
                    <span className="text-xs text-slate-400 truncate">
                      {order.items[0].titulo} {order.items.length > 1 && <span className="text-slate-500">+ {order.items.length - 1}</span>}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#2a2a2a]">
                      <ShoppingBag className="h-3 w-3 text-slate-500" />
                    </div>
                    <span className="text-xs text-slate-400">{order._count?.items || 0} items</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer: Acciones */}
            <div className="flex items-center border-t border-[#1f1f1f] bg-[#141414]/50 rounded-b-xl">
              <button 
                onClick={() => onEdit(order)} 
                className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-slate-400 hover:text-white hover:bg-[#1a1a1a] transition-colors first:rounded-bl-xl border-r border-[#1f1f1f]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button 
                onClick={() => onDelete(order)} 
                className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-900/10 transition-colors last:rounded-br-xl"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-4 px-1">
        <span className="text-xs text-slate-500">
          Página {page} de {totalPages} • {totalItems} órdenes
        </span>
        <div className="flex items-center gap-2">
          {hasPrev && (
            <Link href={getPageHref(page - 1)} className="px-3 py-1 rounded border border-[#2a2a2a] bg-[#1a1a1a] text-xs text-slate-300 hover:bg-[#262626] transition-colors">
              Anterior
            </Link>
          )}
          {hasNext && (
            <Link href={getPageHref(page + 1)} className="px-3 py-1 rounded border border-[#2a2a2a] bg-[#1a1a1a] text-xs text-slate-300 hover:bg-[#262626] transition-colors">
              Siguiente
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
