// src/lib/api.ts
import { apiFetch } from './api-fetch';

/* ───────── Tipos compartidos ───────── */
export type ProductSort = 'relevancia' | 'novedades' | 'precio_asc' | 'precio_desc' | 'rating_desc';
const ALLOWED_PRODUCT_SORT: readonly ProductSort[] =
  ['relevancia','novedades','precio_asc','precio_desc','rating_desc'] as const;

export type PaginationMeta = {
  // formatos frecuentes
  total?: number;
  page?: number;
  perPage?: number;

  // variantes que algunos backends usan
  totalItems?: number;
  itemCount?: number;

  // total de páginas (nombres alternativos)
  totalPages?: number;
  currentPage?: number;

  /** alias común en APIs: cantidad de páginas totales */
  pages?: number;
};

export type ListResp<T> = {
  items: T[];
  // Soportamos ambos esquemas:
  meta?: PaginationMeta;   // { items, meta: {...} }
  total?: number;          // { items, total, page, perPage }
  page?: number;
  perPage?: number;
};

/* ───────── Productos (DTO) ───────── */
export type ProductQuery = {
  q?: string;
  marca?: string;       // slug o id
  categoria?: string;   // slug o id
  tag?: string;         // opcional si tu API contempla tags
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

/** Mínimo que consume la UI de productos (cards/buttons) */
export type ProductListItem = {
  id: string;
  slug: string;
  titulo: string;
  precio: number; // centavos
  imagen?: string | null;
  imagenes?: Array<{ url: string }> | null;
  stock?: number | null;
  ratingProm?: number | null;
  ratingConteo?: number | null;
};

export type ProductDetail = ProductListItem & {
  descripcionMD?: string | null;
  precioLista?: number | null;
  marca?: { nombre?: string | null } | null;
  categoria?: { nombre?: string | null; slug?: string | null; id?: string | number | null } | null;
  destacado?: boolean | null;
};

/* ───────── Cursos (DTO) ───────── */
export type CourseLevel = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
const ALLOWED_COURSE_LEVEL: readonly CourseLevel[] = ['BASICO','INTERMEDIO','AVANZADO'] as const;

// El sort es el mismo conjunto que productos
export type CourseSort = ProductSort;
const ALLOWED_COURSE_SORT: readonly CourseSort[] = ALLOWED_PRODUCT_SORT;

export type CourseQuery = {
  q?: string;
  nivel?: CourseLevel;
  tag?: string;         // tu página lo usa; lo propagamos
  minPrice?: number;
  maxPrice?: number;
  sort?: CourseSort;
  page?: number;
  perPage?: number;
};

export type CourseListItem = {
  id: string;
  slug: string;
  titulo: string;
  precio: number; // centavos
  portadaUrl?: string | null;
  ratingProm?: number | null;
  ratingConteo?: number | null;
};

export type CourseDetail = CourseListItem & {
  descripcionMD?: string | null;
  nivel?: CourseLevel;
};

export type Facet<T extends string = string> = {
  value: T;
  count: number;
  label?: string;
};

export type NivelFacet = Facet<CourseLevel>;
export type TagFacet   = Facet<string>;

// Lo que devuelve /catalog/cursos/filtros
export type CourseFacets = {
  niveles?: NivelFacet[];
  tags?: TagFacet[];
  // opcionales por si tu API también manda rango de precio
  price?: { min: number; max: number };
  minPrice?: number;
  maxPrice?: number;
};

/* ───────── Helpers ───────── */
function clampInt(n: unknown, min: number, max?: number): number | undefined {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  if (!Number.isFinite(v)) return undefined;
  const x = Math.floor(v);
  if (x < min) return min;
  if (typeof max === 'number' && x > max) return max;
  return x;
}

function toQS(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/* — Sanitizadores alineados a cada DTO — */
function cleanProductQuery(q: Partial<ProductQuery>): Record<string, string> {
  const out: Record<string, string> = {};
  const push = (k: keyof ProductQuery, v: unknown) => {
    if (v === undefined || v === null) return;
    const s = typeof v === 'string' ? v.trim() : String(v);
    if (s.length === 0) return;
    out[k] = s;
  };

  // strings
  push('q', q.q);
  push('marca', q.marca);
  push('categoria', q.categoria);
  push('tag', q.tag);

  // números (>= 0)
  const minP = clampInt(q.minPrice, 0);
  const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP);
  if (maxP !== undefined) out.maxPrice = String(maxP);

  // sort permitido (default: relevancia)
  if (q.sort && (ALLOWED_PRODUCT_SORT as readonly string[]).includes(q.sort)) {
    out.sort = q.sort;
  } else if (q.sort === undefined) {
    out.sort = 'relevancia';
  }

  // paginación segura
  const page = clampInt(q.page, 1);
  const perPage = clampInt(q.perPage, 1, 100);
  if (page !== undefined) out.page = String(page);
  if (perPage !== undefined) out.perPage = String(perPage);

  return out;
}

function cleanCourseQuery(q: Partial<CourseQuery>): Record<string, string> {
  const out: Record<string, string> = {};
  const push = (k: keyof CourseQuery, v: unknown) => {
    if (v === undefined || v === null) return;
    const s = typeof v === 'string' ? v.trim() : String(v);
    if (s.length === 0) return;
    out[k] = s;
  };

  // strings
  push('q', q.q);
  push('tag', q.tag);

  // nivel permitido
  if (q.nivel && (ALLOWED_COURSE_LEVEL as readonly string[]).includes(q.nivel)) {
    out.nivel = q.nivel;
  }

  // números (>= 0)
  const minP = clampInt(q.minPrice, 0);
  const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP);
  if (maxP !== undefined) out.maxPrice = String(maxP);

  // sort permitido (default: relevancia)
  if (q.sort && (ALLOWED_COURSE_SORT as readonly string[]).includes(q.sort)) {
    out.sort = q.sort;
  } else if (q.sort === undefined) {
    out.sort = 'relevancia';
  }

  // paginación segura
  const page = clampInt(q.page, 1);
  const perPage = clampInt(q.perPage, 1, 100);
  if (page !== undefined) out.page = String(page);
  if (perPage !== undefined) out.perPage = String(perPage);

  return out;
}

/* ───────── Productos ───────── */
export async function getProducts(params: Partial<ProductQuery> = {}) {
  const qp = cleanProductQuery(params);
  return apiFetch<ListResp<ProductListItem>>(`/catalog/productos${toQS(qp)}`, { next: { revalidate: 60 } });
}

export async function getProductFacets(params: Partial<ProductQuery> = {}) {
  const qp = cleanProductQuery(params);
  // Tipar si conocés la forma exacta de filtros
  return apiFetch<unknown>(`/catalog/productos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });
}

export async function getProductBySlug(slug: string) {
  return apiFetch<ProductDetail>(`/catalog/productos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

/* ───────── Cursos ───────── */
export async function getCourses(params: Partial<CourseQuery> = {}) {
  const qp = cleanCourseQuery(params);
  return apiFetch<ListResp<CourseListItem>>(`/catalog/cursos${toQS(qp)}`, { next: { revalidate: 60 } });
}

export async function getCourseFacets(params: Partial<CourseQuery> = {}) {
  const qp = cleanCourseQuery(params);
  return apiFetch<CourseFacets>(`/catalog/cursos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });
}

export async function getCourseBySlug(slug: string) {
  return apiFetch<CourseDetail>(`/catalog/cursos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

/* ───────── Variantes “seguras” para SSR de listados ───────── */
export async function safeGetProducts(params: Partial<ProductQuery> = {}) {
  try { return await getProducts(params); }
  catch (e) { console.error('getProducts failed:', e); return { items: [], total: 0 } as ListResp<ProductListItem>; }
}

export async function safeGetCourses(params: Partial<CourseQuery> = {}) {
  try { return await getCourses(params); }
  catch (e) { console.error('getCourses failed:', e); return { items: [], total: 0 } as ListResp<CourseListItem>; }
}
