// apps/web/src/lib/admin/fetch-admin-meta.ts
import 'server-only';
import type { ResourceMeta } from './meta-types';

function getApiBase() {
  const url =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001';
  
  // Asegurar que termine en /api
  const base = url.replace(/\/$/, '');
  const finalUrl = base.endsWith('/api') ? base : `${base}/api`;
  
  // Log de diagnóstico
  if (typeof window === 'undefined') {
    console.log(`[AdminMetaFetch] API Base resolved to: ${finalUrl}`);
  }
  return finalUrl;
}

const API_BASE = getApiBase();

/* ───────────── Helper Retry ───────────── */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      // Si es exitoso o es un error cliente (4xx) que no sea 429, retornamos
      // 429 (Too Many Requests) o 5xx (Server Error) -> retry
      if (res.ok) return res;
      if (res.status < 500 && res.status !== 429) return res;

      // Si es el último intento, retornamos la respuesta tal cual
      if (i === retries) return res;
      
      // Esperar exponencial: 500ms, 1000ms, ...
      const delay = 500 * Math.pow(2, i);
      console.warn(`[AdminMeta] Retrying ${url} (${res.status}) in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      if (i === retries) throw err;
      const delay = 500 * Math.pow(2, i);
      console.warn(`[AdminMeta] Network error ${url}, retrying in ${delay}ms...`, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// 👇 NUEVA: listar todos los recursos del admin
export async function fetchAllResourcesMeta(): Promise<ResourceMeta[]> {
  const url = `${API_BASE}/admin/meta/resources`;
  try {
    const res = await fetchWithRetry(url, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[AdminMeta] Error fetching ${url}: Status ${res.status}`);
      if (res.status === 404) {
         throw new Error(`Error al obtener metadata del admin: 404 Not Found en ${url}`);
      }
      throw new Error(`Failed to fetch admin meta: ${res.status}`);
    }

    const json = await res.json();

    // Por si el backend devuelve { resources: [...] } o directamente [...]
    if (Array.isArray(json)) return json as ResourceMeta[];
    if (Array.isArray(json.resources)) return json.resources as ResourceMeta[];

    throw new Error('Invalid admin meta payload');
  } catch (err) {
    console.error(`[AdminMeta] Network error fetching ${url}`, err);
    throw err;
  }
}

// 👇 ya la tenías: meta de un recurso
export async function fetchResourceMeta(resource: string): Promise<ResourceMeta> {
  const res = await fetchWithRetry(`${API_BASE}/admin/meta/resources/${resource}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch admin meta for ${resource}: ${res.status}`,
    );
  }

  return (await res.json()) as ResourceMeta;
}

// 👇 ya la tenías: listado genérico
type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  filters?: Array<{ field: string; op: string; value?: unknown }>;
};

export type AdminListResponse<T = any> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function fetchAdminList<T = any>(
  resource: string,
  params: ListParams,
): Promise<AdminListResponse<T>> {
  const search = new URLSearchParams();

  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  if (params.q) search.set('q', params.q);
  if (params.filters && params.filters.length > 0) {
    search.set('filters', JSON.stringify(params.filters));
  }

  const res = await fetchWithRetry(
    `${API_BASE}/admin/resources/${resource}?${search.toString()}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch admin list for ${resource}: ${res.status}`,
    );
  }

  return (await res.json()) as AdminListResponse<T>;
}
