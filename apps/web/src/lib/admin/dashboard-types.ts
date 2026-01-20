// apps/web/src/lib/admin/dashboard-types.ts

export type OrderStatusKey =
  | 'PENDIENTE'
  | 'PAGADO'
  | 'CUMPLIDO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

export type OrdersByStatus = Partial<Record<OrderStatusKey, number>> &
  Record<string, number>;

export interface RecentActivityItem {
  id: number | string;
  type: 'login' | 'order' | 'product' | 'system' | 'other';
  message: string;
  createdAt: string; // ISO string
  actor?: string | null;
  meta?: Record<string, any>;
}

export interface RevenuePoint {
  date: string; // yyyy-MM-dd
  total: number;
}

export interface LastOrder {
  id: number | string;
  code?: string | null;        // ← para mostrar "Orden ABC-123" si lo tenés
  total: number;
  status: string;              // ← estado (PAGADO, PENDIENTE, etc.)
  createdAt: string;           // ← ISO (lo mapeamos en el service)
  userName?: string | null;    // ← nombre o email del usuario
}

export interface DashboardSummary {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenueToday: number;
  totalRevenueThisMonth: number;
  ordersByStatus: OrdersByStatus;
  recentActivity: RecentActivityItem[];

  last7DaysRevenue?: RevenuePoint[];
  lastOrders?: LastOrder[];
}
