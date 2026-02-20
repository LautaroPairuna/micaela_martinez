// apps/web/src/lib/api.ts
import { apiProxy } from '../api-proxy';
import type { SliderItem } from '../hero-types';

/* ───────────────── Tipos compartidos ───────────────── */
export type ProductSort = 'relevancia' | 'novedades' | 'precio_asc' | 'precio_desc' | 'rating_desc';
const ALLOWED_PRODUCT_SORT: readonly ProductSort[] =
  ['relevancia', 'novedades', 'precio_asc', 'precio_desc', 'rating_desc'] as const;

export type PaginationMeta = {
  total?: number; page?: number; perPage?: number;
  totalItems?: number; itemCount?: number; totalPages?: number; currentPage?: number; pages?: number;
};
export type ListResp<T> = { items: T[]; meta?: PaginationMeta; total?: number; page?: number; perPage?: number; };

/* ───────────────── Productos ───────────────── */
export type ProductQuery = {
  q?: string; marca?: string; categoria?: string; tag?: string;
  minPrice?: number; maxPrice?: number; sort?: ProductSort; page?: number; perPage?: number;
};
export type ProductListItem = {
  id: string; slug: string; titulo: string; precio: number;
  imagen?: string | null; imagenes?: Array<{ url: string }> | null;
  stock?: number | null; ratingProm?: number | null; ratingConteo?: number | null;
};
export type ProductDetail = ProductListItem & {
  descripcionMD?: string | null; precioLista?: number | null; destacado?: boolean | null;
  marca?: { nombre?: string | null } | null;
  categoria?: { nombre?: string | null; slug?: string | null; id?: string | number | null } | null;
};

export type BrandFacet = { id: string; slug?: string; nombre: string; count: number };
export type CategoryFacet = { id: string; slug?: string; nombre: string; count: number };
export type ProductFacets = {
  marcas?: BrandFacet[];
  categorias?: CategoryFacet[];
  price?: { min: number; max: number };
};

/* ───────────────── Cursos ───────────────── */
export type CourseLevel = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
export type CourseSort = ProductSort;
const ALLOWED_COURSE_SORT: readonly CourseSort[] = ['relevancia', 'novedades', 'precio_asc', 'precio_desc', 'rating_desc'] as const;
const ALLOWED_COURSE_LEVEL: readonly CourseLevel[] = ['BASICO', 'INTERMEDIO', 'AVANZADO'] as const;

export type CourseQuery = {
  q?: string; nivel?: CourseLevel; tag?: string; minPrice?: number; maxPrice?: number;
  sort?: CourseSort; page?: number; perPage?: number;
};
export type CourseListItem = {
  id: string; slug: string; titulo: string; precio: number;
  portadaUrl?: string | null; ratingProm?: number | null; ratingConteo?: number | null;
  totalLessons?: number;
  totalDuration?: number;
};
export type CourseDetail = CourseListItem & {
  descripcionMD?: string | null; nivel?: CourseLevel; resumen?: string | null;
  requisitos?: string | string[] | null; duracionTotalS?: number | null;
  estudiantesCount?: number;
  creadoEn?: string;
  videoPreview?: string | null;
  queAprenderas?: string[] | string | null;
  tags?: Record<string, unknown>;
  modulos?: Array<{ 
    id: string;
    titulo?: string | null; 
    lecciones?: Array<{ 
      id: string;
      titulo?: string | null; 
      duracion?: number | null; 
      rutaSrc?: string | null;
      tipo?: 'VIDEO' | 'TEXTO' | 'DOCUMENTO' | 'QUIZ';
      contenido?: Record<string, unknown>;
    }>|null 
  }>|null;
  _count?: { modulos?: number } | null;
  certificado?: { existe: boolean; url?: string; uuid?: string };
};
export type NivelFacet = { nivel: CourseLevel; count: number; label?: string };
export type TagFacet   = { tag: string;        count: number; label?: string };
export type CourseFacets = {
  niveles?: NivelFacet[]; tags?: TagFacet[]; price?: { min: number; max: number }; minPrice?: number; maxPrice?: number;
};

/* ───────────────── Helpers query ───────────────── */
function clampInt(n: unknown, min: number, max?: number): number | undefined {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  if (!Number.isFinite(v)) return undefined;
  const x = Math.floor(v);
  if (x < min) return min;
  if (typeof max === 'number' && x > max) return max;
  return x;
}
function toQS(params: Record<string, string>) {
  const qs = new URLSearchParams(params); const s = qs.toString(); return s ? `?${s}` : '';
}
function cleanProductQuery(q: Partial<ProductQuery>): Record<string, string> {
  const out: Record<string, string> = {};
  const push = (k: keyof ProductQuery, v: unknown) => { if (v==null) return; const s = typeof v==='string'?v.trim():String(v); if(!s) return; out[k]=s; };
  push('q', q.q); push('marca', q.marca); push('categoria', q.categoria); push('tag', q.tag);
  const minP = clampInt(q.minPrice, 0); const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP); if (maxP !== undefined) out.maxPrice = String(maxP);
  if (q.sort && (ALLOWED_PRODUCT_SORT as readonly string[]).includes(q.sort)) out.sort = q.sort; else if (q.sort === undefined) out.sort = 'relevancia';
  const page = clampInt(q.page, 1); const perPage = clampInt(q.perPage, 1, 100);
  if (page !== undefined) out.page = String(page); if (perPage !== undefined) out.perPage = String(perPage);
  return out;
}
function cleanCourseQuery(q: Partial<CourseQuery>): Record<string, string> {
  const out: Record<string, string> = {};
  const push = (k: keyof CourseQuery, v: unknown) => { if (v==null) return; const s = typeof v==='string'?v.trim():String(v); if(!s) return; out[k]=s; };
  push('q', q.q); push('tag', q.tag);
  if (q.nivel && (ALLOWED_COURSE_LEVEL as readonly string[]).includes(q.nivel)) out.nivel = q.nivel;
  const minP = clampInt(q.minPrice, 0); const maxP = clampInt(q.maxPrice, 0);
  if (minP !== undefined) out.minPrice = String(minP); if (maxP !== undefined) out.maxPrice = String(maxP);
  if (q.sort && (ALLOWED_COURSE_SORT as readonly string[]).includes(q.sort)) out.sort = q.sort; else if (q.sort === undefined) out.sort = 'relevancia';
  const page = clampInt(q.page, 1); const perPage = clampInt(q.perPage, 1, 100);
  if (page !== undefined) out.page = String(page); if (perPage !== undefined) out.perPage = String(perPage);
  return out;
}

/* ───────────────── Endpoints Productos (vía proxy) ───────────────── */
export async function getProducts(params: Partial<ProductQuery> = {}) {
  const qp = cleanProductQuery(params);
  return apiProxy<ListResp<ProductListItem>>(`/catalog/productos${toQS(qp)}`, { next: { revalidate: 60 } });
}
export async function getProductFacets(params: Partial<ProductQuery> = {}) {
  const qp = cleanProductQuery(params);
  return apiProxy<ProductFacets>(`/catalog/productos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });
}
export async function getProductBySlug(slug: string) {
  return apiProxy<ProductDetail>(`/catalog/productos/${encodeURIComponent(slug)}`, { next: { revalidate: 120 } });
}

export async function getRelatedProducts(categoriaSlug: string, excludeSlug?: string, limit = 6) {
  const params: Partial<ProductQuery> = {
    categoria: categoriaSlug,
    perPage: limit + (excludeSlug ? 1 : 0), // Pedimos uno extra si vamos a excluir
  };
  const qp = cleanProductQuery(params);
  const response = await apiProxy<ListResp<ProductListItem>>(`/catalog/productos${toQS(qp)}`, { next: { revalidate: 300 } });
  
  // Filtrar el producto actual si se especifica
  if (excludeSlug && response.items) {
    response.items = response.items.filter(item => item.slug !== excludeSlug).slice(0, limit);
  }
  
  return response;
}

/* ───────────────── Endpoints Cursos (vía proxy) ───────────────── */
export async function getCourses(params: Partial<CourseQuery> = {}) {
  const qp = cleanCourseQuery(params);
  return apiProxy<ListResp<CourseListItem>>(`/catalog/cursos${toQS(qp)}`, { next: { revalidate: 60 } });
}
export async function getCourseFacets(params: Partial<CourseQuery> = {}) {
  const qp = cleanCourseQuery(params);
  type RawNivel = { value?: CourseLevel; nivel?: CourseLevel; count: number; label?: string };
  type RawTag   = { value?: string;       tag?: string;        count: number; label?: string };
  type RawResp  = { niveles?: RawNivel[]; tags?: RawTag[]; price?: { min: number; max: number } };

  const raw = await apiProxy<RawResp>(`/catalog/cursos/filtros${toQS(qp)}`, { next: { revalidate: 300 } });

  const niveles: NivelFacet[] = Array.isArray(raw.niveles)
    ? raw.niveles.flatMap<NivelFacet>((n) => {
        const nivel = n.nivel ?? n.value; if (!nivel) return [];
        return n.label !== undefined ? [{ nivel, count: n.count, label: n.label }] : [{ nivel, count: n.count }];
      })
    : [];

  const tags: TagFacet[] = Array.isArray(raw.tags)
    ? raw.tags.flatMap<TagFacet>((t) => {
        const tag = t.tag ?? t.value; if (!tag) return [];
        return t.label !== undefined ? [{ tag, count: t.count, label: t.label }] : [{ tag, count: t.count }];
      })
    : [];

  return { niveles, tags, price: raw.price, minPrice: raw.price?.min, maxPrice: raw.price?.max } as CourseFacets;
}
export async function getCourseBySlug(slug: string) {
  return apiProxy<CourseDetail>(`/catalog/cursos/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
}

export async function getCourseContentBySlug(slug: string) {
  return apiProxy<CourseDetail>(`/catalog/cursos/${encodeURIComponent(slug)}/contenido`, { 
    next: { revalidate: 0 },
    cache: 'no-store'
  });
}

/* ───────────────── Hero ───────────────── */
export async function getHeroImages() {
  return apiProxy<SliderItem[]>('/hero/images', { next: { revalidate: 60 } });
}

/* ───────────────── Safe variants ───────────────── */
export async function safeGetCourses(params: Partial<CourseQuery> = {}) {
  try { return await getCourses(params); }
  catch (e) { console.error('getCourses failed:', e); return { items: [], meta: { page: 1, pages: 1 } } as ListResp<CourseListItem>; }
}
export async function safeGetProducts(params: Partial<ProductQuery> = {}) {
  try { return await getProducts(params); }
  catch (e) { console.error('getProducts failed:', e); return { items: [], meta: { page: 1, pages: 1 } } as ListResp<ProductListItem>; }
}
export async function safeGetHeroImages() {
  try { return await getHeroImages(); }
  catch (e) { console.error('getHeroImages failed:', e); return []; }
}
/**
 * Estrategia robusta para productos: intenta con params y relaja filtros
 * en caso de error del backend (500/TypeError), para no romper la UI.
 */
export async function safeGetProductsSmart(params: Partial<ProductQuery> = {}) {
  const attempts: Partial<ProductQuery>[] = [
    params,
    { ...params, marca: undefined },
    { ...params, categoria: undefined },
    { ...params, marca: undefined, categoria: undefined },
    { ...params, minPrice: undefined, maxPrice: undefined },
    { q: params.q, sort: params.sort, page: params.page, perPage: params.perPage },
  ];
  for (const a of attempts) {
    try {
      const res = await getProducts(a);
      try { Object.defineProperty(res as object, '__debug', { value: { usedParams: a }, enumerable: false }); } catch {}
      return res;
    } catch {
      // silent fallback
    }
  }
  return { items: [], meta: { page: 1, pages: 1 } } as ListResp<ProductListItem>;
}
export async function safeGetProductFacets(params: Partial<ProductQuery> = {}) {
  const attempts: Partial<ProductQuery>[] = [
    params,
    { ...params, marca: undefined },
    { ...params, categoria: undefined },
    { ...params, minPrice: undefined, maxPrice: undefined },
    { q: params.q },
  ];
  for (const a of attempts) {
    try {
      const res = await getProductFacets(a);
      try { Object.defineProperty(res as object, '__debug', { value: { usedParams: a }, enumerable: false }); } catch {}
      return res;
    } catch {
      // silent fallback
    }
  }
  return { marcas: [], categorias: [], price: undefined } as ProductFacets;
}
