// src/lib/api.ts
import { apiFetch } from './api-fetch';

/* ─── Tipos alineados al DTO del backend ─── */
export type ProductSort = 'relevancia' | 'novedades' | 'precio_asc' | 'precio_desc' | 'rating_desc';
export type ProductQuery = {
  q?: string;
  marca?: string;       // slug o id
  categoria?: string;   // slug o id
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

type ListResp<T> = { items: T[]; total?: number };

/* ─── Helpers ─── */
const ALLOWED_SORT: readonly ProductSort[] = ['relevancia','novedades','precio_asc','precio_desc','rating_desc'] as const;

function clampInt(n: unknown, min: number, max?: number): number | undefined {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  if (!Number.isFinite(v)) return undefined;
  const x = Math.floor(v);
  if (x < min) return min;
  if (typeof max === 'number' && x > max) return max;
  return x;
}

function cleanQuery(q: Partial<ProductQuery>): Record<string, string> {
  const out: Record<string, string> = {};
  const push = (k: keyof ProductQuery, v: unknown) => {
    if (v === undefined || v === null) return;
    const s = typeof v === 'string' ? v.trim() : String(v);
    if (s.length === 0) return; // evita q="" y similares
    out[k] = s;
  };

  // strings
  push('q', q.q);
  push('marca', q.marca);
  push('categoria', q.categoria);

  // números (>= 0)
  const minP = clampInt(q.minPrice, 0);
  const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP);
  if (maxP !== undefined) out.maxPrice = String(maxP);

  // sort permitido
  if (q.sort && (ALLOWED_SORT as readonly string[]).includes(q.sort)) {
    out.sort = q.sort;
  } else if (q.sort === undefined) {
    out.sort = 'relevancia'; // default del DTO
  }

  // paginación segura: page >=1, perPage razonable (p.ej. 1..100)
  const page = clampInt(q.page, 1);
  const perPage = clampInt(q.perPage, 1, 100);
  if (page !== undefined) out.page = String(page);
  if (perPage !== undefined) out.perPage = String(perPage);

  return out;
}

function toQS(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/* ─── Productos ─── */
export async function getProducts(params: Partial<ProductQuery> = {}) {
  const qp = cleanQuery(params);
  return apiFetch<ListResp<any>>(`/catalog/productos${toQS(qp)}`, { next: { revalidate: 60 } });
}
export async function getProductFacets(params: Partial<ProductQuery> = {}) {
  const qp = cleanQuery(params);
  return apiFetch(`/catalog/productos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });
}
export async function getProductBySlug(slug: string) {
  return apiFetch(`/catalog/productos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

/* ─── Cursos ───
   Si tu backend de cursos usa el MISMO contrato (sort idéntico), podés
   reutilizar ProductQuery. Si no, ajustá los allowed sort/keys aquí. */
export type CourseQuery = ProductQuery;

export async function getCourses(params: Partial<CourseQuery> = {}) {
  const qp = cleanQuery(params);
  return apiFetch<ListResp<any>>(`/catalog/cursos${toQS(qp)}`, { next: { revalidate: 60 } });
}
export async function getCourseFacets(params: Partial<CourseQuery> = {}) {
  const qp = cleanQuery(params);
  return apiFetch(`/catalog/cursos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });
}
export async function getCourseBySlug(slug: string) {
  return apiFetch(`/catalog/cursos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

/* ─── Variantes “seguras” para páginas de listado (no tiran SSR) ─── */
export async function safeGetProducts(params: Partial<ProductQuery> = {}) {
  try { return await getProducts(params); }
  catch (e) { console.error('getProducts failed:', e); return { items: [], total: 0 }; }
}
export async function safeGetCourses(params: Partial<CourseQuery> = {}) {
  try { return await getCourses(params); }
  catch (e) { console.error('getCourses failed:', e); return { items: [], total: 0 }; }
}
