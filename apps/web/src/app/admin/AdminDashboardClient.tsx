// apps/web/src/app/admin/AdminDashboardClient.tsx
'use client';

import React, {
  useEffect,
  useMemo,
  useState,
  useLayoutEffect,
  useRef,
  useId,
} from 'react';
import {
  Users,
  ShoppingCart,
  Package,
  CreditCard,
  Activity as ActivityIcon,
  LogIn,
  Bell,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type {
  DashboardSummary,
  OrdersByStatus,
  RecentActivityItem,
  LastOrder,
} from '@/lib/admin/dashboard-types';

interface AdminDashboardClientProps {
  summary: DashboardSummary | null;
}

/* ────────────────────────────── UTILIDADES ─────────────────────────────── */

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDateKey(raw: string): string {
  return raw.includes('T') ? raw.slice(0, 10) : raw;
}

function pickFirstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickFirstId(obj: Record<string, unknown>, keys: string[]): string | number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function isIpAddress(value: string): boolean {
  if (!value) return false;
  if (value.includes(':')) return true;
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^[0-9]+$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

function deriveActorName(item: RecentActivityItem): string | null {
  const actor = toStringOrNull(item.actor);
  const meta = item.meta && typeof item.meta === 'object' ? (item.meta as Record<string, unknown>) : null;

  const fromMeta = meta
    ? pickFirstString(meta, [
        'actorName',
        'usuarioNombre',
        'userName',
        'usuarioEmail',
        'userEmail',
        'email',
      ])
    : undefined;

  if (fromMeta) return fromMeta;
  if (!actor) return null;
  return isIpAddress(actor) ? null : actor;
}

function shouldHideMetaKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized === 'ip' || normalized === 'ipaddress' || normalized === 'ip_address';
}

function formatMetaLabel(key: string): string {
  const direct: Record<string, string> = {
    actor: 'Usuario',
    actorName: 'Usuario',
    user: 'Usuario',
    userId: 'ID de usuario',
    userName: 'Usuario',
    userEmail: 'Email del usuario',
    usuario: 'Usuario',
    usuarioId: 'ID de usuario',
    usuarioNombre: 'Usuario',
    usuarioEmail: 'Email del usuario',
    email: 'Email',
    role: 'Rol',
    roles: 'Roles',
    action: 'Acción',
    type: 'Tipo',
    status: 'Estado',
    createdAt: 'Creado el',
    updatedAt: 'Actualizado el',
    deletedAt: 'Eliminado el',
    entity: 'Entidad',
    entityId: 'ID',
    entityName: 'Entidad',
    recordId: 'ID',
    recordName: 'Entidad',
    resource: 'Recurso',
    table: 'Tabla',
    tableName: 'Tabla',
    model: 'Modelo',
    orderId: 'ID de orden',
    ordenId: 'ID de orden',
    productId: 'ID de producto',
    productoId: 'ID de producto',
    subscriptionId: 'ID de suscripción',
    isActive: 'Activo',
    isSubscription: 'Suscripción',
    total: 'Total',
    amount: 'Monto',
    currency: 'Moneda',
    reference: 'Referencia',
  };

  if (direct[key]) return direct[key];

  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();

  const tokenMap: Record<string, string> = {
    id: 'ID',
    name: 'Nombre',
    email: 'Email',
    user: 'Usuario',
    usuario: 'Usuario',
    order: 'Orden',
    orden: 'Orden',
    product: 'Producto',
    producto: 'Producto',
    created: 'Creado',
    updated: 'Actualizado',
    deleted: 'Eliminado',
    status: 'Estado',
    type: 'Tipo',
    action: 'Acción',
    total: 'Total',
    amount: 'Monto',
    currency: 'Moneda',
    active: 'Activo',
    subscription: 'Suscripción',
  };

  const parts = spaced.split(/\s+/).filter(Boolean);
  const translated = parts.map((p) => tokenMap[p.toLowerCase()] ?? p);
  const label = translated.join(' ');
  return label ? `${label[0]!.toUpperCase()}${label.slice(1)}` : key;
}

function formatMetaValue(value: unknown): string {
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return '—';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return formatDateTime(s);
    return s;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value == null) return '—';
  if (isRecord(value) || Array.isArray(value)) return safeJsonStringify(value);
  return String(value);
}

function extractEntityInfo(item: RecentActivityItem): { name?: string; id?: string | number } {
  const meta =
    item.meta && typeof item.meta === 'object'
      ? (item.meta as Record<string, unknown>)
      : undefined;

  const metaName = meta
    ? pickFirstString(meta, [
        'entityName',
        'recordName',
        'itemName',
        'name',
        'title',
        'titulo',
        'resourceDisplayName',
        'resource',
        'model',
        'table',
        'tableName',
      ])
    : undefined;

  const metaId = meta
    ? pickFirstId(meta, ['entityId', 'targetId', 'recordId', 'resourceId', 'itemId', 'id'])
    : undefined;

  if (metaName || metaId) return { name: metaName, id: metaId };

  const m1 = item.message.match(/de\s+(.+?)\s*#\s*(\d+)/i);
  if (m1) return { name: m1[1]?.trim(), id: m1[2] };

  const m2 = item.message.match(/\b([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b\s*#\s*(\d+)/);
  if (m2) return { name: m2[1]?.trim(), id: m2[2] };

  const m3 = item.message.match(/#\s*(\d+)/);
  if (m3) return { id: m3[1] };

  return { id: item.id };
}

function buildActivityMessage(item: RecentActivityItem, entityName?: string): string {
  const raw = item.message;
  if (!entityName) return raw;

  const cleaned = raw.replace(/\s*#\s*\d+\b/g, '').replace(/\s+/g, ' ').trim();

  const verbMatch = cleaned.match(
    /^\s*(actualizaci[oó]n|actualizacion|creaci[oó]n|creacion|eliminaci[oó]n|eliminacion)\s+de\s+(.+)$/i,
  );
  if (verbMatch) {
    const v = (verbMatch[1] ?? '').toLowerCase();
    const verb = v.startsWith('actual')
      ? 'Actualización'
      : v.startsWith('crea')
      ? 'Creación'
      : 'Eliminación';
    return `${verb} de ${entityName}`;
  }

  const patterns: Array<[RegExp, string]> = [
    [/\bactualizaci[oó]n\s+de\s+registro\b/i, `Actualización de ${entityName}`],
    [/\bcreaci[oó]n\s+de\s+registro\b/i, `Creación de ${entityName}`],
    [/\beliminaci[oó]n\s+de\s+registro\b/i, `Eliminación de ${entityName}`],
    [/\bactualizacion\s+de\s+registro\b/i, `Actualización de ${entityName}`],
    [/\bcreacion\s+de\s+registro\b/i, `Creación de ${entityName}`],
    [/\beliminacion\s+de\s+registro\b/i, `Eliminación de ${entityName}`],
  ];

  for (const [re, replacement] of patterns) {
    if (re.test(cleaned)) return cleaned.replace(re, replacement);
  }

  if (/\bregistro\b/i.test(cleaned)) {
    return cleaned.replace(/\bregistro\b/i, entityName);
  }

  return cleaned;
}

type OrderDetails = {
  id: string | number;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  reference: string | null;
  isSubscription: boolean | null;
  userName: string | null;
  userEmail: string | null;
  shippingAddress: string | null;
  billingAddress: string | null;
  items: Array<{
    id: string | number;
    type: string;
    title: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: number;
  }>;
};

function formatAddressLine(addr: Record<string, unknown>): string | null {
  const nombre = toStringOrNull(addr.nombre);
  const calle = toStringOrNull(addr.calle);
  const numero = toStringOrNull(addr.numero);
  const ciudad = toStringOrNull(addr.ciudad);
  const provincia = toStringOrNull(addr.provincia);
  const cp = toStringOrNull(addr.cp);
  const parts = [nombre, [calle, numero].filter(Boolean).join(' '), ciudad, provincia, cp]
    .map((s) => (s ? s.trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(' • ') : null;
}

async function fetchOrderDetails(orderId: string | number, signal: AbortSignal): Promise<OrderDetails> {
  const res = await fetch(`/api/admin/resources/orden/${encodeURIComponent(String(orderId))}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal,
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener la orden (${res.status})`);
  }

  const json: unknown = await res.json();
  if (!isRecord(json)) {
    throw new Error('Respuesta inválida al obtener la orden');
  }

  const usuario = isRecord(json.usuario) ? json.usuario : null;
  const itemsRaw = Array.isArray(json.items) ? json.items : [];
  const items = itemsRaw
    .filter(isRecord)
    .map((it) => ({
      id:
        typeof it.id === 'string' || typeof it.id === 'number'
          ? it.id
          : '–',
      type: toStringOrNull(it.tipo) ?? '—',
      title: toStringOrNull(it.titulo) ?? '—',
      imageUrl:
        toStringOrNull(it.imageUrl) ??
        toStringOrNull(it.imagenUrl) ??
        toStringOrNull(it.imagen) ??
        null,
      quantity: toNumberOrNull(it.cantidad) ?? 0,
      unitPrice: toNumberOrNull(it.precioUnitario) ?? 0,
    }));

  const shippingAddress = isRecord(json.direccionEnvio)
    ? formatAddressLine(json.direccionEnvio)
    : null;
  const billingAddress = isRecord(json.direccionFacturacion)
    ? formatAddressLine(json.direccionFacturacion)
    : null;

  const userName = usuario ? toStringOrNull(usuario.nombre) : null;
  const userEmail = usuario ? toStringOrNull(usuario.email) : null;
  const createdAt = toStringOrNull(json.creadoEn) ?? toStringOrNull(json.createdAt) ?? '-';
  const status = toStringOrNull(json.estado) ?? toStringOrNull(json.status) ?? 'DESCONOCIDO';
  const currency = toStringOrNull(json.moneda) ?? 'ARS';
  const total = toNumberOrNull(json.total) ?? 0;
  const reference = toStringOrNull(json.referenciaPago) ?? toStringOrNull(json.reference);
  const isSubscription =
    toBooleanOrNull(json.esSuscripcion) ?? toBooleanOrNull(json.isSubscription);

  return {
    id: typeof json.id === 'string' || typeof json.id === 'number' ? json.id : orderId,
    status,
    total,
    currency,
    createdAt,
    reference,
    isSubscription,
    userName,
    userEmail,
    shippingAddress,
    billingAddress,
    items,
  };
}

/**
 * Mide tamaño real del contenedor (responsive) sin deformar:
 * - Renderiza el SVG con viewBox que coincide con el tamaño medido
 * - No usamos preserveAspectRatio="none", así mantenemos proporciones
 */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => {
      const rect = el.getBoundingClientRect();
      const next = {
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };

    read();

    const ro = new ResizeObserver(() => read());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

/* ────────────────────────────── KPI CARD ──────────────────────────────── */

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  description?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  description,
}) => {
  return (
    <div className="rounded-lg border border-[#252525] bg-[#141414] px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="text-xl font-semibold text-slate-50">
            {label.toLowerCase().includes('ingreso')
              ? formatCurrency(value)
              : value.toLocaleString('es-AR')}
          </p>
          {description && (
            <p className="text-[11px] text-slate-500">{description}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f1f1f] text-slate-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────── GRÁFICO INGRESOS ──────────────────────── */

interface RevenueChartProps {
  data: { date: string; total: number }[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const gradientId = useId();
  const { ref: plotRef, size } = useElementSize<HTMLDivElement>();

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of data) {
      const key = normalizeDateKey(p.date);
      map.set(key, (map.get(key) ?? 0) + (Number.isFinite(p.total) ? p.total : 0));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(today.getDate() - 6);

    return Array.from({ length: 7 }, (_v, idx) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + idx);
      const key = formatIsoDateLocal(dt);
      return { date: key, total: map.get(key) ?? 0 };
    });
  }, [data]);

  const totalPeriodo = chartData.reduce((a, b) => a + b.total, 0);

  const svg = useMemo(() => {
    // Si no tenemos tamaño aún, no armamos el SVG
    if (size.width <= 0 || size.height <= 0) return null;

    // Usamos el tamaño real del contenedor: así el SVG ocupa el máximo espacio posible sin deformarse.
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);

    // Padding (ligeramente adaptativo para que no se coma el área en pantallas chicas)
    const padding = {
      top: Math.max(12, Math.round(height * 0.08)),
      right: Math.max(12, Math.round(width * 0.03)),
      bottom: Math.max(22, Math.round(height * 0.14)),
      left: Math.max(22, Math.round(width * 0.05)),
    };

    const plotW = Math.max(1, width - padding.left - padding.right);
    const plotH = Math.max(1, height - padding.top - padding.bottom);

    const values = chartData.map((p) => p.total);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const rawRange = max - min;
    const denom = rawRange === 0 ? 1 : rawRange;

    const steps = Math.max(1, chartData.length - 1);
    const stepX = plotW / steps;

    const points = chartData.map((p, idx) => {
      const x = padding.left + idx * stepX;
      const normalized =
        rawRange === 0
          ? max === 0
            ? 0
            : 0.5
          : (p.total - min) / denom;
      const y = padding.top + (1 - normalized) * plotH;
      return { x, y, total: p.total };
    });

    const formatDayLabel = (raw: string): string => {
      const rawDate = normalizeDateKey(raw);
      const [y, m, d] = rawDate.split('-').map((v) => Number(v));
      if (!y || !m || !d) return raw;
      const dt = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(dt);
    };

    const xLabels = chartData.map((p, idx) => ({ idx, date: p.date }));

    const path = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
      .join(' ');

    const areaPath =
      points.length > 0
        ? `${path} L ${(padding.left + steps * stepX).toFixed(2)} ${(padding.top + plotH).toFixed(
            2,
          )} L ${padding.left.toFixed(2)} ${(padding.top + plotH).toFixed(2)} Z`
        : '';

    const gridY = [0.25, 0.5, 0.75].map((t) => padding.top + t * plotH);
    const xAxisY = padding.top + plotH;

    const last = points.at(-1);

    const fillId = `revenueFill-${gradientId}`;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        role="img"
        aria-label="Gráfico de ingresos últimos 7 días"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridY.map((y) => (
          <line
            key={y}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="#262626"
            strokeWidth="1"
          />
        ))}

        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={xAxisY}
          y2={xAxisY}
          stroke="#2f2f2f"
          strokeWidth="1"
        />

        {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}
        {path && <path d={path} fill="none" stroke="#22c55e" strokeWidth="3" />}

        {xLabels.map(({ idx, date }) => {
          const x = padding.left + idx * stepX;
          return (
            <text
              key={`${idx}-${date}`}
              x={x}
              y={height - Math.max(8, Math.round(padding.bottom * 0.35))}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#6b7280"
              fontSize="10"
            >
              {formatDayLabel(date)}
            </text>
          );
        })}

        {last && (
          <>
            <circle cx={last.x} cy={last.y} r="4" fill="#22c55e" />
            <text
              x={width - padding.right}
              y={padding.top}
              textAnchor="end"
              dominantBaseline="hanging"
              fill="#9ca3af"
              fontSize="11"
            >
              Último: {formatCurrency(last.total)}
            </text>
          </>
        )}
      </svg>
    );
  }, [chartData, size.width, size.height, gradientId]);

  return (
    <div className="flex h-72 flex-col rounded-lg border border-[#252525] bg-[#141414] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-50">
            Ingresos últimos 7 días
          </h2>
          <p className="text-[11px] text-slate-500">
            Total periodo: {formatCurrency(totalPeriodo)}
          </p>
        </div>
      </div>

      {/* Contenedor medido (responsive). Ocupa el máximo espacio disponible sin deformar. */}
      <div ref={plotRef} className="min-h-0 flex-1">
        {size.width === 0 || size.height === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
            Cargando gráfico…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
            No hay datos suficientes para mostrar.
          </div>
        ) : (
          svg
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────── GRÁFICO ESTADO ÓRDENES ────────────────── */

interface OrdersByStatusChartProps {
  ordersByStatus: OrdersByStatus;
}

const OrdersByStatusChart: React.FC<OrdersByStatusChartProps> = ({
  ordersByStatus,
}) => {
  const total = useMemo(
    () => Object.values(ordersByStatus || {}).reduce((a, b) => a + (b || 0), 0),
    [ordersByStatus],
  );
  const data = useMemo(
    () =>
      (Object.entries(ordersByStatus || {}) as [string, number][])
        .filter(([, value]) => value > 0)
        .map(([key, value]) => {
          const k = key.toLowerCase();
          const color =
            k.includes('pag') || k.includes('paid')
              ? '#34d399'
              : k.includes('pend') || k.includes('process')
              ? '#f59e0b'
              : k.includes('env') || k.includes('ship')
              ? '#60a5fa'
              : k.includes('cancel') || k.includes('rechaz')
              ? '#ef4444'
              : k.includes('refund') || k.includes('reemb')
              ? '#94a3b8'
              : '#f472b6';
          return { status: key, value, color };
        }),
    [ordersByStatus],
  );

  return (
    <div className="h-72 rounded-lg border border-[#252525] bg-[#141414] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-50">Órdenes por estado</h2>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-[11px] text-slate-500">
          No hay datos suficientes para mostrar.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((d) => {
            const pct = total ? Math.round((d.value / total) * 100) : 0;
            return (
              <div
                key={d.status}
                className="flex items-center justify-between rounded-md bg-[#101010] px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-2 w-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-[11px] font-medium text-slate-200">
                    {d.status}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span className="mr-3 font-semibold text-slate-100">
                    {d.value}
                  </span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────── ÚLTIMAS ÓRDENES ───────────────────────── */

interface LastOrdersListProps {
  orders: LastOrder[];
  onViewDetails: (order: LastOrder) => void;
}

const LastOrdersList: React.FC<LastOrdersListProps> = ({ orders, onViewDetails }) => {
  const visible = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <section className="rounded-lg border border-[#252525] bg-[#141414] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-50">
            Últimas órdenes
          </h2>
          <p className="text-[11px] text-slate-500">
            Las órdenes más recientes ingresadas al sistema.
          </p>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-500">
          No hay órdenes registradas aún.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-md bg-[#101010] px-3 py-2 text-[11px]"
            >
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-slate-100">
                  Orden #{order.id}
                </p>
                <p className="text-[10px] text-slate-400">
                  {order.userName ?? 'Cliente desconocido'} •{' '}
                  <span suppressHydrationWarning>
                    {formatDateTime(order.createdAt)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  tone="neutral"
                  size="sm"
                  onClick={() => onViewDetails(order)}
                  aria-label={`Ver detalles de la orden ${order.id}`}
                  className="gap-2 border-sky-500/30 bg-sky-950/20 text-sky-100 hover:border-sky-400/50 hover:bg-sky-950/30"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </Button>
                <div className="text-right">
                <p className="text-[11px] font-semibold text-emerald-400">
                  {formatCurrency(order.total)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  {order.status}
                </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

/* ────────────────────────────── ACTIVIDAD RECIENTE ────────────────────── */

interface RecentActivityListProps {
  items: RecentActivityItem[];
  onViewDetails: (item: RecentActivityItem) => void;
}

const typeConfig: Record<
  RecentActivityItem['type'],
  {
    label: string;
    badgeClass: string;
    icon: React.ElementType;
  }
> = {
  login: {
    label: 'Login',
    badgeClass: 'border-sky-500/60 bg-sky-950/40 text-sky-100',
    icon: LogIn,
  },
  order: {
    label: 'Orden',
    badgeClass: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-100',
    icon: ShoppingCart,
  },
  product: {
    label: 'Producto',
    badgeClass: 'border-amber-500/60 bg-amber-950/40 text-amber-100',
    icon: Package,
  },
  system: {
    label: 'Sistema',
    badgeClass: 'border-purple-500/60 bg-purple-950/40 text-purple-100',
    icon: Bell,
  },
  other: {
    label: 'Actividad',
    badgeClass: 'border-slate-600/60 bg-slate-900/60 text-slate-100',
    icon: ActivityIcon,
  },
};

const RecentActivityList: React.FC<RecentActivityListProps> = ({ items, onViewDetails }) => {
  // ocultamos logins para que no llenen toda la lista
  const pageSize = 5;

  const filtered = useMemo(() => items.filter((i) => i.type !== 'login'), [items]);

  const total = filtered.length;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

  const [page, setPage] = useState(1);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const visible = useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex]);

  const showingFrom = total === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(endIndex, total);

  return (
    <section className="rounded-lg border border-[#252525] bg-[#141414] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-50">
          Actividad reciente
        </h2>
        <p className="text-[11px] text-slate-500">
          Mostrando {showingFrom}-{showingTo} de {total}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-slate-500">
          No hay actividad reciente para mostrar.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {visible.map((item) => {
              const cfg = typeConfig[item.type] ?? typeConfig.other;
              const Icon = cfg.icon;
              const entity = extractEntityInfo(item);
              const entityId = entity.id;
              const entityName = entity.name;
              const msg = buildActivityMessage(item, entityName);
              const actorName = deriveActorName(item);

              return (
                <div
                  key={`${item.type}-${item.id}-${item.createdAt}`}
                  className="flex items-start justify-between rounded-md bg-[#101010] px-3 py-2 text-[11px]"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <span
                      className={[
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        cfg.badgeClass,
                      ].join(' ')}
                    >
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                    <div className="space-y-0.5">
                      {actorName && (
                        <p className="text-[10px] text-slate-400">
                          por <span className="font-medium">{actorName}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-slate-100">
                        {msg}{' '}
                        {(entityId ?? item.id) && (
                          <span className="text-slate-400">(ID: {entityId ?? item.id})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <span className="whitespace-nowrap text-[10px] text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      tone="neutral"
                      size="sm"
                      onClick={() => onViewDetails(item)}
                      aria-label="Ver detalle de actividad"
                      className="gap-2 border-sky-500/30 bg-sky-950/20 text-sky-100 hover:border-sky-400/50 hover:bg-sky-950/30"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] text-slate-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={[
                    'rounded-md border px-2 py-1 text-[11px]',
                    page === 1
                      ? 'border-[#252525] bg-[#141414] text-slate-600'
                      : 'border-[#252525] bg-[#101010] text-slate-200 hover:bg-[#151515]',
                  ].join(' ')}
                  aria-label="Ver eventos anteriores"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={[
                    'rounded-md border px-2 py-1 text-[11px]',
                    page === totalPages
                      ? 'border-[#252525] bg-[#141414] text-slate-600'
                      : 'border-[#252525] bg-[#101010] text-slate-200 hover:bg-[#151515]',
                  ].join(' ')}
                  aria-label="Ver más eventos"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

function OrderDetailsDialog({
  open,
  onOpenChange,
  baseOrder,
  details,
  isLoading,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseOrder: LastOrder | null;
  details: OrderDetails | null;
  isLoading: boolean;
  error: string | null;
}) {
  const id = details?.id ?? baseOrder?.id ?? '—';
  const customer =
    details?.userName ??
    details?.userEmail ??
    baseOrder?.userName ??
    null;

  const status = details?.status ?? baseOrder?.status ?? 'DESCONOCIDO';
  const createdAt = details?.createdAt ?? baseOrder?.createdAt ?? '-';
  const total = details?.total ?? baseOrder?.total ?? 0;
  const currency = details?.currency ?? 'ARS';
  const items = details?.items ?? [];
  const isSubscription = details?.isSubscription ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-none rounded-lg border border-[#252525] bg-[#141414] p-0 text-slate-100">
        <DialogHeader className="border-b border-[#252525] px-5 py-4">
          <DialogTitle className="text-base font-semibold text-slate-50">
            Detalle de orden #{id}
          </DialogTitle>
          <p className="mt-1 text-[11px] text-slate-400">
            {customer ?? 'Cliente desconocido'} • {formatDateTime(createdAt)} • {status}
          </p>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 text-[11px]">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-slate-400">Cargando detalle…</div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-[#252525] bg-[#101010] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
                  <p className="mt-1 text-[12px] font-semibold text-emerald-400">
                    {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency,
                      maximumFractionDigits: 0,
                    }).format(total)}
                  </p>
                </div>
                <div className="rounded-md border border-[#252525] bg-[#101010] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Referencia</p>
                  <p className="mt-1 text-slate-200">{details?.reference ?? '—'}</p>
                </div>
              </div>

              <div className="rounded-md border border-[#252525] bg-[#101010]">
                <div className="border-b border-[#252525] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Items</p>
                </div>
                {items.length === 0 ? (
                  <div className="px-3 py-3 text-slate-400">Sin items para mostrar.</div>
                ) : (
                  <div className="divide-y divide-[#252525]">
                    {items.map((it) => {
                      const fallbackSrc = '/images/hero/hero-productos-calidad.svg';
                      const src = it.imageUrl ?? fallbackSrc;
                      const alt = it.imageUrl
                        ? `Imagen de ${it.title}`
                        : `Imagen no disponible para ${it.title}`;

                      return (
                        <div key={String(it.id)} className="flex items-center justify-between px-3 py-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <img
                              src={src}
                              alt={alt}
                              className="h-10 w-10 rounded-md border border-[#252525] bg-[#0b0b0b] object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-slate-100">{it.title}</p>
                              <p className="text-[10px] text-slate-500">
                                {it.type} • Cantidad: {it.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="ml-3 whitespace-nowrap text-right">
                            <p className="text-slate-200">
                              {new Intl.NumberFormat('es-AR', {
                                style: 'currency',
                                currency,
                                maximumFractionDigits: 0,
                              }).format(it.unitPrice)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {isSubscription !== null && (
                <p className="text-[10px] text-slate-500">
                  Suscripción: {isSubscription ? 'Sí' : 'No'}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t border-[#252525] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            tone="neutral"
            onClick={() => onOpenChange(false)}
            className="border-[#252525] bg-[#101010] text-slate-200 hover:bg-[#151515]"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivityDetailsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RecentActivityItem | null;
}) {
  const cfg = item ? (typeConfig[item.type] ?? typeConfig.other) : typeConfig.other;
  const Icon = cfg.icon;
  const meta = item?.meta && typeof item.meta === 'object' ? (item.meta as Record<string, unknown>) : null;
  const actorName = item ? deriveActorName(item) : null;
  const rows = meta
    ? Object.entries(meta)
        .filter(([k]) => !shouldHideMetaKey(k))
        .map(([k, v]) => ({
          key: k,
          label: formatMetaLabel(k),
          value: k.toLowerCase().includes('date') || k.toLowerCase().includes('at') 
            ? <span suppressHydrationWarning>{formatMetaValue(v)}</span> 
            : formatMetaValue(v),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-none rounded-lg border border-[#252525] bg-[#141414] p-0 text-slate-100">
        <DialogHeader className="border-b border-[#252525] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-50">
            <span
              className={[
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                cfg.badgeClass,
              ].join(' ')}
            >
              <Icon className="h-3 w-3" />
              {cfg.label}
            </span>
            Detalle de actividad
          </DialogTitle>
          {item && (
            <p className="mt-1 text-[11px] text-slate-400">
              {actorName ? `por ${actorName} • ` : ''}{formatDateTime(item.createdAt)}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 text-[11px]">
          {!item ? (
            <div className="text-slate-400">Sin detalle para mostrar.</div>
          ) : (
            <>
              <div className="rounded-md border border-[#252525] bg-[#101010] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Mensaje</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-100">{item.message}</p>
              </div>

              <div className="rounded-md border border-[#252525] bg-[#101010] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Datos</p>
                {rows.length === 0 ? (
                  <p className="mt-1 text-slate-400">Sin metadata.</p>
                ) : (
                  <div className="mt-2 grid gap-x-3 gap-y-2 md:grid-cols-[160px_1fr]">
                    {rows.map((row) => (
                      <React.Fragment key={row.key}>
                        <div className="text-[10px] uppercase tracking-wide text-slate-500">{row.label}</div>
                        <div className="min-w-0 whitespace-pre-wrap break-words text-slate-200">{row.value}</div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-[#252525] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            tone="neutral"
            onClick={() => onOpenChange(false)}
            className="border-[#252525] bg-[#101010] text-slate-200 hover:bg-[#151515]"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────── COMPONENTE PRINCIPAL ──────────────────── */

const AdminDashboardClient: React.FC<AdminDashboardClientProps> = ({
  summary,
}) => {
  const {
    totalUsers = 0,
    totalProducts = 0,
    totalOrders = 0,
    totalRevenueToday = 0, // reservado por si luego lo usamos
    totalRevenueThisMonth = 0,
    ordersByStatus = {},
    last7DaysRevenue = [],
    lastOrders = [],
    recentActivity = [],
  } = summary ?? {};

  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [activityDetailsOpen, setActivityDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LastOrder | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<RecentActivityItem | null>(null);

  const openOrderDetails = (order: LastOrder) => {
    setSelectedOrder(order);
    setOrderDetails(null);
    setOrderDetailsError(null);
    setOrderDetailsLoading(true);
    setOrderDetailsOpen(true);

    const ac = new AbortController();
    fetchOrderDetails(order.id, ac.signal)
      .then((data) => {
        setOrderDetails(data);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Error al cargar el detalle';
        setOrderDetailsError(msg);
      })
      .finally(() => {
        setOrderDetailsLoading(false);
      });
  };

  const openActivityDetails = (item: RecentActivityItem) => {
    setSelectedActivity(item);
    setActivityDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Panel de control
          </h1>
          <p className="text-[11px] text-slate-500">
            Resumen general de usuarios, catálogo, órdenes e ingresos.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Usuarios registrados"
          value={totalUsers}
          icon={Users}
          description="Cuentas registradas en la plataforma."
        />
        <KpiCard
          label="Productos publicados"
          value={totalProducts}
          icon={Package}
          description="Ítems activos en el catálogo."
        />
        <KpiCard
          label="Órdenes totales"
          value={totalOrders}
          icon={ShoppingCart}
          description="Órdenes generadas históricamente."
        />
        <KpiCard
          label="Ingresos del mes"
          value={totalRevenueThisMonth}
          icon={CreditCard}
          description="Monto total acreditado este mes."
        />
      </section>

      {/* Gráficos */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RevenueChart data={last7DaysRevenue ?? []} />
        <OrdersByStatusChart ordersByStatus={ordersByStatus} />
      </section>

      {/* Listas: últimas órdenes + actividad */}
      <section className="grid gap-4 lg:grid-cols-2">
        <LastOrdersList orders={lastOrders ?? []} onViewDetails={openOrderDetails} />
        <RecentActivityList items={recentActivity ?? []} onViewDetails={openActivityDetails} />
      </section>

      <OrderDetailsDialog
        open={orderDetailsOpen}
        onOpenChange={(open) => {
          setOrderDetailsOpen(open);
          if (!open) {
            setSelectedOrder(null);
            setOrderDetails(null);
            setOrderDetailsError(null);
            setOrderDetailsLoading(false);
          }
        }}
        baseOrder={selectedOrder}
        details={orderDetails}
        isLoading={orderDetailsLoading}
        error={orderDetailsError}
      />

      <ActivityDetailsDialog
        open={activityDetailsOpen}
        onOpenChange={(open) => {
          setActivityDetailsOpen(open);
          if (!open) setSelectedActivity(null);
        }}
        item={selectedActivity}
      />
    </div>
  );
};

export default AdminDashboardClient;
