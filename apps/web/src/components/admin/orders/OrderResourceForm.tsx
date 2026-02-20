import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Loader2, X, Save, Pencil, User, MapPin, Truck, CreditCard, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OrderResourceFormProps {
  open: boolean;
  onClose: () => void;
  currentRow: any;
  meta: any;
  onSaved: (item: any, mode: 'create' | 'edit') => void;
}

const statusOptions = ['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'REEMBOLSADO'];

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

export function OrderResourceForm({ open, onClose, currentRow, onSaved }: OrderResourceFormProps) {
  const [order, setOrder] = useState<any>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && currentRow) {
      setOrder(currentRow);
      setSelectedStatus(currentRow.estado);
      setIsEditingStatus(false);
    }
  }, [open, currentRow]);

  if (!open || !order) return null;

  const handleSaveStatus = async () => {
    if (selectedStatus === order.estado) {
      setIsEditingStatus(false);
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/resources/orden/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: selectedStatus }),
      });

      if (!res.ok) throw new Error('Error al actualizar estado');

      const updated = await res.json();
      setOrder(updated);
      toast.success('Estado actualizado correctamente');
      onSaved(updated, 'edit');
      setIsEditingStatus(false);
      
      // Invalidar queries de react-query si se usan para la lista principal
      queryClient.invalidateQueries({ queryKey: ['admin-resource', 'orden'] });
    } catch (err) {
      console.error(err);
      toast.error('No se pudo actualizar el estado');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: order.moneda || 'ARS',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl bg-[#0a0a0a] border border-[#222] text-slate-200 p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#111]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-serif text-white">
              Pedido <span className="text-emerald-500">#{order.id}</span>
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#333] text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(order.creadoEn), "d 'de' MMMM, yyyy • HH:mm", { locale: es })}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-[#0a0a0a]">
          {/* Columna Principal: Estado y Productos */}
          <div className="lg:col-span-2 space-y-8">
            {/* Estado y Total (Banner) */}
            <div className="rounded-xl border border-[#222] bg-[#111] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20"></div>
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Estado del Pedido
                </span>
                
                {isEditingStatus ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="bg-[#1a1a1a] border border-[#333] text-slate-200 text-sm rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 block p-2 outline-none min-w-[140px]"
                      disabled={isSaving}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSaveStatus}
                      disabled={isSaving}
                      className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                      title="Guardar"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingStatus(false);
                        setSelectedStatus(order.estado);
                      }}
                      disabled={isSaving}
                      className="p-2 bg-[#2a2a2a] text-slate-400 border border-[#333] rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 group">
                    <span className={`inline-flex min-w-[88px] items-center justify-center rounded-full px-3 py-1 text-[12px] font-medium border ${getStatusColor(order.estado)}`}>
                      {order.estado}
                    </span>
                    <button
                      onClick={() => setIsEditingStatus(true)}
                      className="text-slate-600 hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1"
                      title="Editar estado"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Total del Pedido</span>
                <span className="text-3xl font-bold text-emerald-500 block leading-none">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>

            {/* Productos */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                <Package className="w-4 h-4" />
                Productos ({order.items?.length || 0})
              </h3>
              <div className="rounded-xl border border-[#222] bg-[#111] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#161616] text-slate-400 border-b border-[#222]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Producto</th>
                        <th className="px-4 py-3 font-medium text-center">Cant.</th>
                        <th className="px-4 py-3 font-medium text-right">Unitario</th>
                        <th className="px-4 py-3 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {order.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#161616] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200">{item.titulo}</div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              {item.tipo && <span className="uppercase text-[10px] bg-[#222] px-1.5 py-0.5 rounded border border-[#333]">{item.tipo}</span>}
                              <span>REF: {item.refId || '-'}</span>
                              <span className="text-slate-600">|</span>
                              <span>ITEM: {item.id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-300 font-mono">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 font-mono">
                            {formatCurrency(item.precioUnitario ?? item.precio ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200 font-medium font-mono">
                            {formatCurrency((item.precioUnitario ?? item.precio ?? 0) * (item.cantidad || 1))}
                          </td>
                        </tr>
                      ))}
                      {(!order.items || order.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            No hay productos en esta orden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Lateral: Info Cliente */}
          <div className="space-y-6">
            {/* Cliente */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                <User className="w-4 h-4" />
                Cliente
              </h3>
              <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-slate-400 font-bold">
                    {order.usuario?.nombre?.[0] || order.usuario?.email?.[0] || '?'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-medium text-slate-200 truncate" title={order.usuario?.nombre}>
                      {order.usuario?.nombre || 'Sin nombre'}
                    </div>
                    <div className="text-xs text-slate-500 truncate" title={order.usuario?.email}>
                      {order.usuario?.email || `ID: ${order.usuarioId}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Envío */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                <Truck className="w-4 h-4" />
                Envío
              </h3>
              <div className="rounded-xl border border-[#222] bg-[#111] p-4">
                {order.direccionEnvio ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-400 mb-0.5">DIRECCIÓN DE ENTREGA</div>
                        <p>{order.direccionEnvio.calle} {order.direccionEnvio.numero}</p>
                        <p className="text-slate-500 text-xs">
                          {order.direccionEnvio.ciudad}, {order.direccionEnvio.provincia}
                          {order.direccionEnvio.cp && ` (${order.direccionEnvio.cp})`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">
                    Sin dirección de envío (retiro en sucursal o digital)
                  </div>
                )}
              </div>
            </div>

            {/* Pago */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                <CreditCard className="w-4 h-4" />
                Pago
              </h3>
              <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Método</span>
                  <span className="px-2 py-0.5 rounded border border-[#333] bg-[#1a1a1a] text-xs text-slate-300 uppercase">
                    {order.referenciaPago ? 'MercadoPago / Tarjeta' : 'Efectivo / Otro'}
                  </span>
                </div>
                {order.referenciaPago && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Referencia</span>
                    <span className="text-xs font-mono text-slate-500 truncate max-w-[120px]" title={order.referenciaPago}>
                      {order.referenciaPago}
                    </span>
                  </div>
                )}
                <div className="pt-3 border-t border-[#222] flex justify-between items-center">
                  <span className="font-medium text-slate-300">Total</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#222] bg-[#111] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-slate-300 text-sm font-medium rounded-lg border border-[#333] transition-colors"
          >
            Cerrar detalle
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}