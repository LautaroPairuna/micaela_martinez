// apps/web/src/lib/admin/fetch-admin-dashboard.ts
import 'server-only';
import type { DashboardSummary } from './dashboard-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE) {
  // Mejor explotar en build si falta la URL
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL no está definida. Configúrala en tu .env.',
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === 'string') {
    const s = value.trim();
    return s ? s : null;
  }
  return null;
}

function normalizeRecentActivityType(value: unknown):
  | 'login'
  | 'order'
  | 'product'
  | 'system'
  | 'other' {
  const t = toStringOrNull(value)?.toLowerCase();
  if (t === 'login') return 'login';
  if (t === 'order') return 'order';
  if (t === 'product') return 'product';
  if (t === 'system') return 'system';
  return 'other';
}

function normalizeDashboardSummary(input: unknown): DashboardSummary {
  if (!isRecord(input)) {
    return {
      totalUsers: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalRevenueToday: 0,
      totalRevenueThisMonth: 0,
      ordersByStatus: {},
      recentActivity: [],
      last7DaysRevenue: [],
      lastOrders: [],
    };
  }

  const rawLastOrders = Array.isArray(input.lastOrders) ? input.lastOrders : [];
  const lastOrders = rawLastOrders
    .filter(isRecord)
    .map((o) => {
      const createdAt =
        toStringOrNull(o.createdAt) ??
        toStringOrNull(o.creadoEn) ??
        toStringOrNull(o.created_at);

      const status =
        toStringOrNull(o.status) ??
        toStringOrNull(o.estado) ??
        toStringOrNull(o.state) ??
        'DESCONOCIDO';

      const userName =
        toStringOrNull(o.userName) ??
        toStringOrNull(o.usuarioNombre) ??
        toStringOrNull(o.usuarioEmail) ??
        toStringOrNull(o.email);

      return {
        id: (typeof o.id === 'string' || typeof o.id === 'number') ? o.id : '–',
        code: toStringOrNull(o.code),
        total: toNumber(o.total, 0),
        status,
        createdAt: createdAt ?? '-',
        userName,
      };
    });

  const rawRevenue = Array.isArray(input.last7DaysRevenue)
    ? input.last7DaysRevenue
    : [];
  const last7DaysRevenue = rawRevenue
    .filter(isRecord)
    .map((p) => ({
      date: toStringOrNull(p.date) ?? '1970-01-01',
      total: toNumber(p.total, 0),
    }));

  const rawRecent = Array.isArray(input.recentActivity) ? input.recentActivity : [];
  const recentActivity = rawRecent.filter(isRecord).map((it) => ({
    id:
      (typeof it.id === 'string' || typeof it.id === 'number')
        ? it.id
        : '–',
    type: normalizeRecentActivityType(it.type),
    message: toStringOrNull(it.message) ?? '',
    createdAt: toStringOrNull(it.createdAt) ?? '-',
    actor: toStringOrNull(it.actor),
    meta: isRecord(it.meta) ? it.meta : undefined,
  }));

  const rawObs = isRecord(input.ordersByStatus) ? input.ordersByStatus : {};
  const ordersByStatus: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawObs)) {
    ordersByStatus[k] = toNumber(v, 0);
  }

  return {
    totalUsers: toNumber(input.totalUsers, 0),
    totalProducts: toNumber(input.totalProducts, 0),
    totalOrders: toNumber(input.totalOrders, 0),
    totalRevenueToday: toNumber(input.totalRevenueToday, 0),
    totalRevenueThisMonth: toNumber(input.totalRevenueThisMonth, 0),
    ordersByStatus,
    recentActivity,
    last7DaysRevenue,
    lastOrders,
  };
}

export async function fetchDashboardOverview(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/admin/dashboard/overview`, {
    // dashboard siempre fresco
    cache: 'no-store',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(
      `Error al obtener overview del dashboard: ${res.status} ${res.statusText}`,
    );
  }

  const json: unknown = await res.json();
  return normalizeDashboardSummary(json);
}
