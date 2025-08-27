// apps/web/src/lib/routes.ts
/* =========================================================================
 * Helpers básicos
 * ========================================================================= */
export type Nivel = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';

export const NIVEL_SLUG_TO_ENUM: Record<string, Nivel> = {
  basico: 'BASICO',
  intermedio: 'INTERMEDIO',
  avanzado: 'AVANZADO',
};
export const NIVEL_ENUM_TO_SLUG: Record<Nivel, string> = {
  BASICO: 'basico',
  INTERMEDIO: 'intermedio',
  AVANZADO: 'avanzado',
};

const ABS = (p: string) => (p.startsWith('/') ? p : `/${p}`);
const POS_INT = (n: unknown) => {
  const v = typeof n === 'string' ? Number(n) : (n as number);
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
};
const numOrUndef = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
};

function parseKeyValueSegments(segments?: string[]) {
  const res: Record<string, string[]> = {};
  for (const seg of segments ?? []) {
    const i = seg.indexOf('-');
    if (i <= 0) continue;
    const key = seg.slice(0, i);
    const value = decodeURIComponent(seg.slice(i + 1));
    if (!value) continue;
    (res[key] ??= []).push(value);
  }
  return res;
}

// Legacy: /tienda/marca/skinlab/categoria/serum  OR  /cursos/nivel/basico/tag/xxx
function parseLegacyPairs(segments?: string[]) {
  const out: Record<string, string> = {};
  if (!segments?.length) return out;
  for (let i = 0; i < segments.length; i += 2) {
    const k = segments[i];
    const v = segments[i + 1];
    if (!v) continue;
    if (k === 'marca' || k === 'categoria' || k === 'nivel' || k === 'tag') out[k] = v;
  }
  return out;
}

/* =========================================================================
 * TIENDA
 * ========================================================================= */
export type ProductoSort = 'relevancia'|'novedades'|'precio_asc'|'precio_desc'|'rating_desc';
const ALLOWED_PRODUCT_SORT = new Set<ProductoSort>([
  'relevancia','novedades','precio_asc','precio_desc','rating_desc'
]);
export const sanitizeProductoSort = (v?: string | null): ProductoSort =>
  (v && ALLOWED_PRODUCT_SORT.has(v as ProductoSort) ? (v as ProductoSort) : 'relevancia');

export function parseTiendaPretty(segments?: string[]) {
  const kv = parseKeyValueSegments(segments);
  const categoria = kv.categoria?.[0];
  const marca     = kv.marca?.[0];
  const sortSeg   = kv.orden?.[0] ? sanitizeProductoSort(kv.orden[0]) : undefined;
  const page      = kv.pagina?.[0] ? POS_INT(kv.pagina[0]) : 1;
  return { categoria, marca, sort: sortSeg, page };
}

function normalizePriceRange(min?: number, max?: number): [number|undefined, number|undefined] {
  if (min != null && max != null && min > max) return [max, min];
  return [min, max];
}

export function buildTiendaPrettyPath(opts: {
  categoria?: string | string[] | null;
  marca?: string | string[] | null;
  q?: string | null;
  minPrice?: number | string | null;
  maxPrice?: number | string | null;
  sort?: ProductoSort | string | null;
  page?: number | string | null;
}) {
  const segs: string[] = [];

  const pushSeg = (k: string, v?: string | string[] | null) => {
    if (!v) return;
    (Array.isArray(v) ? v : [v]).forEach((vv) => segs.push(`${k}-${encodeURIComponent(vv)}`));
  };

  pushSeg('categoria', opts.categoria ?? undefined);
  pushSeg('marca',     opts.marca ?? undefined);

  // sort como segmento pretty
  const sortSan = sanitizeProductoSort((opts.sort ?? undefined) as string | undefined);
  if (sortSan !== 'relevancia') pushSeg('orden', sortSan);

  const pageNum = opts.page != null ? POS_INT(opts.page) : 1;
  if (pageNum > 1) segs.push(`pagina-${pageNum}`);

  const base = `/tienda${segs.length ? '/' + segs.join('/') : ''}`;

  // QS solo para parámetros "de valor"
  const qs = new URLSearchParams();
  const q = (opts.q ?? '').toString().trim();
  if (q) qs.set('q', q);

  const minP = numOrUndef(opts.minPrice ?? undefined);
  const maxP = numOrUndef(opts.maxPrice ?? undefined);
  const [normMin, normMax] = normalizePriceRange(minP, maxP);
  if (normMin != null) qs.set('minPrice', String(normMin));
  if (normMax != null) qs.set('maxPrice', String(normMax));

  const str = qs.toString();
  return ABS(str ? `${base}?${str}` : base);
}

export function buildTiendaPathResetPage(opts: Parameters<typeof buildTiendaPrettyPath>[0]) {
  const { page, ...rest } = opts;
  return buildTiendaPrettyPath({ ...rest, page: null });
}

export function migrateTiendaLegacyToPretty(
  segments?: string[],
  qs?: Record<string, string | undefined>
) {
  const legacy = parseLegacyPairs(segments);
  const qp = qs?.page ? POS_INT(qs.page) : 1;
  const needs = legacy.marca || legacy.categoria || (qs?.page && qp > 1) || qs?.sort;
  if (!needs) return null;

  return buildTiendaPrettyPath({
    categoria: legacy.categoria ?? null,
    marca: legacy.marca ?? null,
    q: qs?.q ?? null,
    minPrice: qs?.minPrice ?? null,
    maxPrice: qs?.maxPrice ?? null,
    sort: sanitizeProductoSort(qs?.sort),
    page: qp > 1 ? qp : null,
  });
}

// Para guards en detalle
export const looksLikeTiendaFilterSlug = (slug: string) =>
  /^(marca-|categoria-|orden-|pagina-)/.test(slug);

/* =========================================================================
 * CURSOS
 * ========================================================================= */
export type CursoSort = 'relevancia'|'novedades'|'precio_asc'|'precio_desc'|'rating_desc';
const ALLOWED_COURSE_SORT = new Set<CursoSort>([
  'relevancia','novedades','precio_asc','precio_desc','rating_desc'
]);
export const sanitizeCursoSort = (v?: string | null): CursoSort =>
  (v && ALLOWED_COURSE_SORT.has(v as CursoSort) ? (v as CursoSort) : 'relevancia');

export function parseCursosPretty(segments?: string[]) {
  const kv = parseKeyValueSegments(segments);
  const nivelSlug = kv.nivel?.[0]?.toLowerCase();
  const nivel = nivelSlug ? (NIVEL_SLUG_TO_ENUM[nivelSlug] as Nivel | undefined) : undefined;
  const tag = kv.tag?.[0];
  const sortSeg = kv.orden?.[0] ? sanitizeCursoSort(kv.orden[0]) : undefined;
  const page = kv.pagina?.[0] ? POS_INT(kv.pagina[0]) : 1;
  return { nivel, tag, sort: sortSeg, page };
}

export function buildCursosPrettyPath(opts: {
  nivel?: Nivel | null;
  tag?: string | null;
  q?: string | null;
  sort?: CursoSort | string | null;
  page?: number | string | null;
}) {
  const segs: string[] = [];
  if (opts.nivel) segs.push(`nivel-${NIVEL_ENUM_TO_SLUG[opts.nivel]}`);
  if (opts.tag)   segs.push(`tag-${encodeURIComponent(opts.tag)}`);

  const sortSan = sanitizeCursoSort((opts.sort ?? undefined) as string | undefined);
  if (sortSan !== 'relevancia') segs.push(`orden-${sortSan}`);

  const pageNum = opts.page != null ? POS_INT(opts.page) : 1;
  if (pageNum > 1) segs.push(`pagina-${pageNum}`);

  const base = `/cursos${segs.length ? '/' + segs.join('/') : ''}`;

  const qs = new URLSearchParams();
  const q = (opts.q ?? '').toString().trim();
  if (q) qs.set('q', q);

  const str = qs.toString();
  return ABS(str ? `${base}?${str}` : base);
}

export function buildCursosPathResetPage(opts: Parameters<typeof buildCursosPrettyPath>[0]) {
  const { page, ...rest } = opts;
  return buildCursosPrettyPath({ ...rest, page: null });
}

export function migrateCursosLegacyToPretty(
  segments?: string[],
  qs?: Record<string, string | undefined>
) {
  const legacy = parseLegacyPairs(segments);
  const nivel = legacy.nivel ? (NIVEL_SLUG_TO_ENUM[legacy.nivel.toLowerCase()] as Nivel | undefined) : undefined;
  const qp = qs?.page ? POS_INT(qs.page) : 1;
  const needs = legacy.nivel || legacy.tag || (qs?.page && qp > 1) || qs?.sort;
  if (!needs) return null;

  return buildCursosPrettyPath({
    nivel,
    tag: legacy.tag ?? null,
    q: qs?.q ?? null,
    sort: sanitizeCursoSort(qs?.sort),
    page: qp > 1 ? qp : null,
  });
}

// Para guards en detalle
export const looksLikeCursosFilterSlug = (slug: string) =>
  /^(nivel-|tag-|orden-|pagina-)/.test(slug);
