// src/app/(cuenta)/mi-cuenta/pedidos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { listOrdersSmart, Orden } from '@/lib/sdk/userApi';
import { Card, CardBody } from '@/components/ui/Card';
import { Package, Calendar, CreditCard, Truck, CheckCircle, Clock, AlertCircle, ShoppingBag, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { OrderDetailsModal } from './OrderDetailsModal';

// Eliminamos revalidate ya que está causando conflicto con 'use client'
export const dynamic = 'force-dynamic';

const getStatusIcon = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'pendiente':
    case 'pending':
      return <Clock className="h-4 w-4 text-[var(--gold)]" />;
    case 'pagado':
    case 'paid':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'procesando':
    case 'processing':
      return <Clock className="h-4 w-4 text-[var(--gold)]" />;
    case 'enviado':
    case 'shipped':
      return <Truck className="h-4 w-4 text-purple-500" />;
    case 'entregado':
    case 'delivered':
    case 'cumplido':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'cancelado':
    case 'cancelled':
    case 'rechazado':
    case 'rejected':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'reembolsado':
    case 'refunded':
      return <RotateCcw className="h-4 w-4 text-gray-500" />;
    default:
      return <Package className="h-4 w-4 text-gray-500" />;
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

export default function PedidosPage() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { items } = await listOrdersSmart();
        
        // 🔍 LOGS DE DEPURACIÓN - CARGA DE PEDIDOS
        console.log('=== CARGA DE PEDIDOS - DEBUG ===');
        console.log('📦 Respuesta completa de listOrdersSmart:', { items });
        console.log('📊 Cantidad de órdenes recibidas:', Array.isArray(items) ? items.length : 0);
        
        if (Array.isArray(items) && items.length > 0) {
          console.log('🔍 Detalle de las primeras 3 órdenes:');
          items.slice(0, 3).forEach((order, index) => {
            console.log(`  Orden ${index + 1}:`, {
              id: order.id,
              estado: order.estado,
              total: order.total,
              items: order.items,
              itemsCount: order.items?.length || 0
            });
          });
        } else {
          console.log('⚠️ No se recibieron órdenes o items no es un array');
        }
        
        setOrders(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const handleOpenModal = (order: Orden) => {
    // 🔍 LOGS DE DEPURACIÓN - APERTURA DE MODAL
    console.log('=== APERTURA DE MODAL - DEBUG ===');
    console.log('📦 Orden seleccionada para el modal:', order);
    console.log('🔢 ID de la orden:', order.id);
    console.log('📋 Items de la orden seleccionada:', order.items);
    console.log('📊 Cantidad de items:', order.items?.length || 0);
    
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const rows = orders;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis Pedidos"
        description="Historial completo de tus compras y estado de pedidos"
        icon={ShoppingBag}
        iconBg="bg-transparent border border-[var(--pink)]/40"
        iconColor="text-[var(--pink)]"
        stats={[
          {
            label: "Total de pedidos",
            value: rows.length.toString(),
            icon: Package,
            color: 'text-[var(--muted)]',
            bgColor: 'bg-[var(--subtle)]',
            borderColor: 'border-[var(--border)]'
          },
          {
            label: "Pedidos completados",
            value: rows.filter(order => order.estado === 'CUMPLIDO').length.toString(),
            icon: CheckCircle,
            color: 'text-[var(--gold)]',
            bgColor: 'bg-[var(--gold)]/10',
            borderColor: 'border-[var(--gold)]/30'
          }
        ]}
      />

      {/* Lista de pedidos */}
      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center shadow-lg">
                <ShoppingBag className="h-10 w-10 text-[var(--gold)]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[var(--fg)]">
                  No tenés pedidos aún
                </h3>
                <p className="text-[var(--muted)]">
                  Cuando realices tu primera compra, aparecerá aquí.
                </p>
              </div>
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dark)] text-black font-bold rounded-xl hover:shadow-lg transition-all duration-200">
                <ShoppingBag className="h-4 w-4" />
                Explorar productos
              </button>
            </div>
          </CardBody>
              </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((o) => {
            const id = String(o.id);
            const shortId = id.slice(0, 8);
            const fecha = o?.creadoEn ? new Date(o.creadoEn).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : '—';
            const totalFmt = new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: o.moneda || 'ARS',
            }).format(Number(o.total || 0));

            return (
              <Card key={id} className="group hover:shadow-lg hover:border-[var(--gold)]/30 transition-all duration-200">
                <CardBody className="space-y-4">
                  {/* Header del pedido */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center group-hover:from-[var(--gold)]/30 group-hover:to-[var(--gold)]/20 transition-colors">
                        <Package className="h-6 w-6 text-[var(--gold)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--fg)] text-lg">
                          Pedido #{shortId}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-[var(--muted)]" />
                          <span className="text-sm text-[var(--muted)]">{fecha}</span>
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-1 font-mono">
                          ID: {id}
                        </div>
                      </div>
                    </div>
                    
                    {/* Estado del pedido */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(o.estado)}`}>
                      {getStatusIcon(o.estado)}
                      <span className="capitalize">{o.estado}</span>
                    </div>
                  </div>
                  
                  {/* Información del pedido */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-6">
                      {/* Total */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-[var(--muted)]">Total</p>
                          <p className="font-bold text-[var(--fg)] text-xl">{totalFmt}</p>
                        </div>
                      </div>
                      
                      {/* Moneda */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                          <CreditCard className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-[var(--muted)]">Moneda</p>
                          <p className="font-bold text-[var(--fg)]">{o.moneda || 'ARS'}</p>
                        </div>
                      </div>
                      
                      {/* Items */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-[var(--muted)]">Productos</p>
                          <p className="font-bold text-[var(--fg)]">{o.items?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Acciones */}
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(o)} className="px-4 py-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-dark)] hover:bg-[var(--gold)]/10 rounded-xl transition-all duration-200 border border-[var(--gold)]/30 hover:border-[var(--gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40">
                        Ver detalles
                      </button>
                      <button className="px-4 py-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all duration-200 border border-[var(--pink)]/30 hover:border-[var(--pink)] flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pink)]/40">
                        <RotateCcw className="h-4 w-4 text-[var(--pink)]" />
                        Repetir
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
      <OrderDetailsModal order={selectedOrder} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
