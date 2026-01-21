// apps/web/src/lib/admin/fetch-admin-meta.ts
import 'server-only';
import type { ResourceMeta } from './meta-types';

function getApiBase() {
  const url =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001';
  return url.replace(/\/$/, '');
}

const API_BASE = getApiBase();

// 👇 NUEVA: listar todos los recursos del admin
export async function fetchAllResourcesMeta(): Promise<ResourceMeta[]> {
  const res = await fetch(`${API_BASE}/admin/meta/resources`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch admin meta: ${res.status}`);
  }

  const json = await res.json();

  // Por si el backend devuelve { resources: [...] } o directamente [...]
  if (Array.isArray(json)) return json as ResourceMeta[];
  if (Array.isArray(json.resources)) return json.resources as ResourceMeta[];

  throw new Error('Invalid admin meta payload');
}

// 👇 ya la tenías: meta de un recurso
export async function fetchResourceMeta(resource: string): Promise<ResourceMeta> {
  const res = await fetch(`${API_BASE}/admin/meta/resources/${resource}`, {
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

  const res = await fetch(
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
