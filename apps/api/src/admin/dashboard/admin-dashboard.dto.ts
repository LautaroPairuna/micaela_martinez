// apps/api/src/admin/dashboard/admin-dashboard.dto.ts
import { EstadoOrden } from '../../../src/generated/prisma/client';

export interface OrdersByStatusDto {
  [status: string]: number;
}

export interface DailyRevenuePointDto {
  /** Día en formato YYYY-MM-DD (zona servidor) */
  date: string;
  /** Importe total del día (sumatoria de Orden.total) */
  total: number;
}

export interface LastOrderDto {
  id: number;
  estado: EstadoOrden | string;
  total: number;
  moneda: string;
  creadoEn: string; // ISO
  usuarioEmail?: string | null;
  usuarioNombre?: string | null;
  itemsCount: number;
}

export interface RecentActivityItemDto {
  id: number;
  type: 'login' | 'order' | 'product' | 'course' | 'system' | 'other';
  message: string;
  createdAt: string; // ISO
  actor?: string | null;
  meta?: Record<string, any> | null;
}

export interface DashboardSummaryDto {
  // KPIs principales
  totalUsers: number;
  totalCursos: number;
  totalProducts: number;
  totalOrders: number;

  newUsersToday: number;
  newOrdersToday: number;
  activeSubscriptions: number;

  // Facturación
  totalRevenueToday: number;
  totalRevenueThisMonth: number;

  // Distribución de órdenes
  ordersByStatus: OrdersByStatusDto;

  // Serie para gráfico
  last7DaysRevenue: DailyRevenuePointDto[];

  // Listas
  lastOrders: LastOrderDto[];
  recentActivity: RecentActivityItemDto[];
}
