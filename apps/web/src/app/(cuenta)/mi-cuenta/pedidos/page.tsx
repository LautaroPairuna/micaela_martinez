import PedidosPageClient from './PedidosPageClient';

// Forzar renderizado dinámico para evitar caché estático en esta página
export const dynamic = 'force-dynamic';

export default function PedidosPage() {
  return <PedidosPageClient />;
}
