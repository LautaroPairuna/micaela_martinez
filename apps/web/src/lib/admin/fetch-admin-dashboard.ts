// apps/web/src/lib/admin/fetch-admin-dashboard.ts
import 'server-only';
import type { DashboardSummary } from './dashboard-types';

function getApiBase() {
  const url =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001';
  
  // Asegurar que termine en /api
  const base = url.replace(/\/$/, '');
  const finalUrl = base.endsWith('/api') ? base : `${base}/api`;
  
  // Log de diagnóstico (solo server-side)
  if (typeof window === 'undefined') {
    console.log(`[AdminFetch] API Base resolved to: ${finalUrl}`);
    console.log(`[AdminFetch] Envs: BACKEND_INTERNAL_URL=${process.env.BACKEND_INTERNAL_URL}, NEXT_PUBLIC_API_URL=${process.env.NEXT_PUBLIC_API_URL}`);
  }
  
  return finalUrl;
}

const API_BASE = getApiBase();

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

export async function fetchDashboardOverview(): Promise<DashboardSummary | null> {
  const url = `${API_BASE}/admin/dashboard/overview`;
  
  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[AdminDashboard] Error fetching ${url}: Status ${res.status} ${res.statusText}`);
      try {
        const text = await res.text();
        console.error(`[AdminDashboard] Response body: ${text.slice(0, 500)}`);
      } catch {}
      
      if (res.status === 404) {
        throw new Error(`Error al obtener overview del dashboard: 404 Not Found en ${url}`);
      }
      throw new Error(`Error al obtener overview del dashboard: ${res.status}`);
    }

    const json: unknown = await res.json();
    return normalizeDashboardSummary(json);
  } catch (error) {
    console.error(`[AdminDashboard] Network/Parse error fetching ${url}:`, error);
    // Retornamos null para que la UI no explote, pero el error queda logueado
    throw error; 
  }
}
