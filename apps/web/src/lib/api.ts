// src/lib/api.ts
import { apiFetch } from './api-fetch';

/* ─────────────────────────────────────────
   Tipos compartidos y utilidades de paginación
─────────────────────────────────────────── */
export type ProductSort = 'relevancia' | 'novedades' | 'precio_asc' | 'precio_desc' | 'rating_desc';
const ALLOWED_PRODUCT_SORT: readonly ProductSort[] =
  ['relevancia', 'novedades', 'precio_asc', 'precio_desc', 'rating_desc'] as const;

export type PaginationMeta = {
  total?: number;
  page?: number;
  perPage?: number;
  totalItems?: number;
  itemCount?: number;
  totalPages?: number;
  currentPage?: number;
  /** alias frecuente usado por algunos backends */
  pages?: number;
};

export type ListResp<T> = {
  items: T[];
  meta?: PaginationMeta;
  // esquema alternativo:
  total?: number;
  page?: number;
  perPage?: number;
};

/* ─────────────────────────────────────────
   Productos (opcional, por si la Home los usa)
─────────────────────────────────────────── */
export type ProductQuery = {
  q?: string;
  marca?: string;
  categoria?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

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

/* ─────────────────────────────────────────
   Cursos: DTO + Facets normalizadas para la UI
─────────────────────────────────────────── */
export type CourseLevel = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
export type CourseSort = ProductSort;

const ALLOWED_COURSE_SORT: readonly CourseSort[] = ['relevancia', 'novedades', 'precio_asc', 'precio_desc', 'rating_desc'] as const;
const ALLOWED_COURSE_LEVEL: readonly CourseLevel[] = ['BASICO', 'INTERMEDIO', 'AVANZADO'] as const;

export type CourseQuery = {
  q?: string;
  nivel?: CourseLevel;
  tag?: string;
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

/** Facets tal como TU UI las espera */
export type NivelFacet = { nivel: CourseLevel; count: number; label?: string };
export type TagFacet   = { tag: string;        count: number; label?: string };

export type CourseFacets = {
  niveles?: NivelFacet[];
  tags?: TagFacet[];
  price?: { min: number; max: number };
  minPrice?: number;
  maxPrice?: number;
};

/* ─────────────────────────────────────────
   Helpers de query (sanitización)
─────────────────────────────────────────── */
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

function cleanProductQuery(q: Partial<ProductQuery>): Record<string, string> {
  const out: Record<string, string> = {};
  const push = (k: keyof ProductQuery, v: unknown) => {
    if (v === undefined || v === null) return;
    const s = typeof v === 'string' ? v.trim() : String(v);
    if (!s) return;
    out[k] = s;
  };

  // strings
  push('q', q.q);
  push('marca', q.marca);
  push('categoria', q.categoria);
  push('tag', q.tag);

  // números
  const minP = clampInt(q.minPrice, 0);
  const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP);
  if (maxP !== undefined) out.maxPrice = String(maxP);

  // sort
  if (q.sort && (ALLOWED_PRODUCT_SORT as readonly string[]).includes(q.sort)) out.sort = q.sort;
  else if (q.sort === undefined) out.sort = 'relevancia';

  // paginación
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
    if (!s) return;
    out[k] = s;
  };

  push('q', q.q);
  push('tag', q.tag);

  if (q.nivel && (ALLOWED_COURSE_LEVEL as readonly string[]).includes(q.nivel)) {
    out.nivel = q.nivel;
  }

  const minP = clampInt(q.minPrice, 0);
  const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP);
  if (maxP !== undefined) out.maxPrice = String(maxP);

  if (q.sort && (ALLOWED_COURSE_SORT as readonly string[]).includes(q.sort)) out.sort = q.sort;
  else if (q.sort === undefined) out.sort = 'relevancia';

  const page = clampInt(q.page, 1);
  const perPage = clampInt(q.perPage, 1, 100);
  if (page !== undefined) out.page = String(page);
  if (perPage !== undefined) out.perPage = String(perPage);

  return out;
}

/* ─────────────────────────────────────────
   Endpoints Productos
─────────────────────────────────────────── */
export async function getProducts(params: Partial<ProductQuery> = {}) {
  const qp = cleanProductQuery(params);
  return apiFetch<ListResp<ProductListItem>>(`/catalog/productos${toQS(qp)}`, { next: { revalidate: 60 } });
}
export async function getProductFacets(params: Partial<ProductQuery> = {}) {
  const qp = cleanProductQuery(params);
  return apiFetch<unknown>(`/catalog/productos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });
}
export async function getProductBySlug(slug: string) {
  return apiFetch<ProductDetail>(`/catalog/productos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

/* ─────────────────────────────────────────
   Endpoints Cursos (con facets normalizadas)
─────────────────────────────────────────── */
export async function getCourses(params: Partial<CourseQuery> = {}) {
  const qp = cleanCourseQuery(params);
  return apiFetch<ListResp<CourseListItem>>(`/catalog/cursos${toQS(qp)}`, { next: { revalidate: 60 } });
}

export async function getCourseFacets(params: Partial<CourseQuery> = {}) {
  const qp = cleanCourseQuery(params);

  type RawNivel = { value?: CourseLevel; nivel?: CourseLevel; count: number; label?: string };
  type RawTag   = { value?: string;       tag?: string;        count: number; label?: string };
  type RawResp  = { niveles?: RawNivel[]; tags?: RawTag[]; price?: { min: number; max: number } };

  const raw = await apiFetch<RawResp>(`/catalog/cursos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });

  const niveles: NivelFacet[] = Array.isArray(raw.niveles)
    ? raw.niveles.flatMap<NivelFacet>((n) => {
        const nivel = n.nivel ?? n.value;
        if (!nivel) return [];
        return n.label !== undefined
          ? [{ nivel, count: n.count, label: n.label }]
          : [{ nivel, count: n.count }];
      })
    : [];

  const tags: TagFacet[] = Array.isArray(raw.tags)
    ? raw.tags.flatMap<TagFacet>((t) => {
        const tag = t.tag ?? t.value;
        if (!tag) return [];
        return t.label !== undefined
          ? [{ tag, count: t.count, label: t.label }]
          : [{ tag, count: t.count }];
      })
    : [];

  return {
    niveles,
    tags,
    price: raw.price,
    minPrice: raw.price?.min,
    maxPrice: raw.price?.max,
  } as CourseFacets;
}

export async function getCourseBySlug(slug: string) {
  return apiFetch<CourseDetail>(`/catalog/cursos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

/* ─────────────────────────────────────────
   Variantes “safe” para SSR de listados
─────────────────────────────────────────── */
export async function safeGetCourses(params: Partial<CourseQuery> = {}) {
  try { return await getCourses(params); }
  catch (e) { console.error('getCourses failed:', e); return { items: [], meta: { page: 1, pages: 1 } } as ListResp<CourseListItem>; }
}
export async function safeGetProducts(params: Partial<ProductQuery> = {}) {
  try { return await getProducts(params); }
  catch (e) { console.error('getProducts failed:', e); return { items: [], meta: { page: 1, pages: 1 } } as ListResp<ProductListItem>; }
}
