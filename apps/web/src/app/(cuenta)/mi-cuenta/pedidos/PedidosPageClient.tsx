'use client';

import { useState, useEffect } from 'react';
import { listOrdersSmart, Orden } from '@/lib/sdk/userApi';
import { Card, CardBody } from '@/components/ui/Card';
import { Package, Calendar, Truck, CheckCircle, Clock, AlertCircle, ShoppingBag, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { OrderDetailsModal } from './OrderDetailsModal';
import Link from 'next/link';
import { motion } from 'framer-motion';

export const getStatusIcon = (estado: string) => {
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

export const getStatusColor = (estado: string) => {
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

export default function PedidosPageClient() {
  const [orders, setOrders] = useState<Orden[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { items } = await listOrdersSmart();
        setOrders(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const handleOpenModal = (order: Orden) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
            value: rows.filter(order => order.estado === 'CUMPLIDO' || order.estado === 'ENTREGADO' || order.estado === 'PAGADO').length.toString(),
            icon: CheckCircle,
            color: 'text-[var(--gold)]',
            bgColor: 'bg-[var(--gold)]/10',
            borderColor: 'border-[var(--gold)]/30'
          }
        ]}
      />

      {/* Lista de pedidos */}
      {rows.length === 0 ? (
        <Card className="bg-[var(--bg)] border-[var(--border)]">
          <CardBody className="text-center py-16">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 flex items-center justify-center ring-1 ring-[var(--gold)]/40 shadow-[0_0_15px_rgba(var(--gold-rgb),0.1)]">
                <ShoppingBag className="h-10 w-10 text-[var(--gold)]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-[var(--fg)]">
                  No tenés pedidos aún
                </h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Cuando realices tu primera compra, aparecerá aquí para que puedas seguir su estado.
                </p>
              </div>
              <Link
                href="/cursos"
                className="inline-flex items-center justify-center rounded-xl px-8 py-3 text-black font-bold shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--gold)]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/60 bg-[var(--gold)] hover:bg-[var(--gold-dark)]"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                Explorar productos
              </Link>
            </div>
          </CardBody>
        </Card>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
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
              currencyDisplay: 'narrowSymbol'
            }).format(Number(o.total || 0));

            return (
              <motion.div key={id} variants={item}>
              <Card className="group bg-[var(--card)] border-[var(--border)] hover:border-[var(--gold)]/30 transition-all duration-200">
                <CardBody className="p-0">
                  <div className="p-6 space-y-6">
                    {/* Header del pedido */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--subtle)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--gold)]/30 transition-colors">
                          <Package className="h-6 w-6 text-[var(--gold)]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--fg)] text-lg flex items-center gap-2">
                            Pedido #{shortId}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3.5 w-3.5 text-[var(--muted)]" />
                            <span className="text-sm text-[var(--muted)]">{fecha}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Estado del pedido */}
                      <div className={`self-start md:self-center flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(o.estado)}`}>
                        {getStatusIcon(o.estado)}
                        <span className="capitalize">{o.estado}</span>
                      </div>
                    </div>
                    
                    {/* Información del pedido */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-[var(--border)]">
                      <div>
                        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Total</p>
                        <p className="font-bold text-[var(--fg)] text-lg">{totalFmt}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Moneda</p>
                        <p className="font-medium text-[var(--fg)]">{o.moneda || 'ARS'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Items</p>
                        <p className="font-medium text-[var(--fg)]">{o.items?.length || 0} productos</p>
                      </div>
                      <div className="md:text-right">
                         <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">ID Ref</p>
                         <p className="font-mono text-xs text-[var(--muted)] truncate" title={id}>{shortId}</p>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-3">
                      <button className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--subtle)] rounded-lg transition-all duration-200 border border-transparent hover:border-[var(--border)] flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Repetir
                      </button>
                      <button 
                        onClick={() => handleOpenModal(o)} 
                        className="px-6 py-2 text-sm font-bold text-black bg-[var(--gold)] hover:bg-[var(--gold-dark)] rounded-lg transition-all duration-200 shadow-lg shadow-[var(--gold)]/10 flex items-center gap-2"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
      <OrderDetailsModal order={selectedOrder} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
