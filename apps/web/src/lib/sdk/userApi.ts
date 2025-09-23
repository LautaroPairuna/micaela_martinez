// src/lib/sdk/userApi.ts
import { apiProxy } from '@/lib/api-proxy';
import { getServerCookies } from '@/lib/server-utils';

/** Opciones compatibles con fetch de Next (SSR o cliente) */
export type NextOpts = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

/* ───────────────────────────
   Tipos (compatibles con tu UI)
──────────────────────────── */
export type Rol = 'ADMIN' | 'INSTRUCTOR' | 'ESTUDIANTE' | 'CUSTOMER' | 'STAFF';

type BackendMe = {
  id: string;
  email: string;
  nombre: string | null;
  emailVerificado: boolean;
  roles: string[]; // slugs en back
};

export type UsuarioMe = {
  id: string;
  email: string;
  nombre?: string | null;
  rol?: Rol; // rol primario para UI
  accessToken?: string; // token de acceso para autenticación
};

/* ───────────────────────────
   Direcciones
──────────────────────────── */
export type DireccionInput = {
  etiqueta?: string | null;
  nombre: string;
  telefono?: string | null;
  calle: string;
  numero?: string | null;
  pisoDepto?: string | null;
  ciudad: string;
  provincia: string;
  cp: string;
  pais?: string; // default "AR" en backend
  predeterminada?: boolean;
};

export type Direccion = DireccionInput & {
  id: string;
  creadoEn?: string;
  actualizadoEn?: string;
};
export type DireccionUpsertInput = DireccionInput & { id?: string };

/* ───────────────────────────
   Favoritos
   - Legacy (Favorito) y el formato real que usamos (FavoriteProduct)
──────────────────────────── */
export type Favorito = {
  productoId: string;
  creadoEn?: string;
  producto?: {
    id: string;
    slug?: string;
    titulo?: string;
    precio?: number;
    imagen?: string | null;
  };
};

export type FavoriteProduct = {
  id: string; // id de producto
  slug?: string;
  titulo?: string;
  precio?: number; // precio directo
  imagen?: string | null;
};

/* ───────────────────────────
   Catálogo (para ProductCard)
   - Tipo mínimo alineado a tu UI ProductCard
──────────────────────────── */
export type ProductMinimal = {
  id: string;
  slug: string;
  titulo: string;
  precio: number; // precio directo
  precioLista?: number | null;
  imagen?: string | null;
  imagenes?: { url: string }[];
  destacado?: boolean | null;
  stock?: number | null;
  ratingProm?: number | string | null;
  ratingConteo?: number | null;
  marca?: { nombre?: string | null } | null;
  categoria?: { nombre?: string | null } | null;
};

/* ───────────────────────────
   Órdenes
──────────────────────────── */
export type EstadoOrden =
  | 'PENDIENTE'
  | 'PAGADO'
  | 'CUMPLIDO'
  | 'CANCELADO'
  | 'REEMBOLSADO';
export type TipoItemOrden = 'CURSO' | 'PRODUCTO';

export type OrdenItem = {
  id: string;
  tipo: TipoItemOrden;
  refId: string;
  titulo: string;
  cantidad: number;
  precioUnitario: number;
};

export type Orden = {
  id: string;
  estado: EstadoOrden;
  total: number;
  moneda: string;
  referenciaPago?: string | null;
  creadoEn: string;
  items?: OrdenItem[];
};

/* ───────────────────────────
   Inscripciones (adapter enum)
──────────────────────────── */
// Usar estados directos de la base de datos sin mapeo
export type EstadoInscripcion = 'ACTIVADA' | 'PAUSADA' | 'DESACTIVADA';

export type Inscripcion = {
  id: string;
  cursoId: string;
  estado: EstadoInscripcion;
  creadoEn: string;
  progreso?: unknown;
  curso?: { 
    id: string; 
    slug?: string; 
    titulo?: string; 
    portadaUrl?: string | null;
    instructor?: { nombre: string } | null;
    _count?: { modulos: number };
  };
};

/* ───────────────────────────
   Adapters
──────────────────────────── */
const preferenciaRoles = ['ADMIN', 'STAFF', 'INSTRUCTOR', 'CUSTOMER'] as const;
function pickRolUI(roles?: string[]): Rol | undefined {
  if (!roles?.length) return undefined;
  const primary = preferenciaRoles.find((r) => roles.includes(r)) ?? roles[0];
  return primary === 'CUSTOMER' ? 'ESTUDIANTE' : (primary as Rol);
}
function adaptMe(b: BackendMe, accessToken?: string): UsuarioMe {
  return { 
    id: b.id, 
    email: b.email, 
    nombre: b.nombre, 
    rol: pickRolUI(b.roles),
    accessToken 
  };
}

/* ───────────────────────────
   Caché simple para /users/me
──────────────────────────── */
type CacheEntry = {
  data: UsuarioMe;
  timestamp: number;
};

let userCache: CacheEntry | null = null;
const CACHE_DURATION = 30000; // 30 segundos

function getCachedUser(): UsuarioMe | null {
  if (!userCache) return null;
  
  const now = Date.now();
  if (now - userCache.timestamp > CACHE_DURATION) {
    userCache = null;
    return null;
  }
  
  return userCache.data;
}

function setCachedUser(user: UsuarioMe): void {
  userCache = {
    data: user,
    timestamp: Date.now()
  };
}

export function clearUserCache(): void {
  userCache = null;
}

/* ───────────────────────────
   Perfil
──────────────────────────── */
export async function getMe(opts?: NextOpts) {
  // Verificar caché solo si no se fuerza no-cache
  if (opts?.cache !== 'no-store') {
    const cached = getCachedUser();
    if (cached) {
      return cached;
    }
  }
  
  const raw = await apiProxy<BackendMe>('/users/me', { ...opts, cache: 'no-store' });
  
  // Obtener el token de acceso de las cookies usando utilidades centralizadas
  const accessToken = await getServerCookies();
  
  const user = adaptMe(raw, accessToken);
  
  // Cachear solo si no se fuerza no-cache
  if (opts?.cache !== 'no-store') {
    setCachedUser(user);
  }
  
  return user;
}

/**
 * updateMe: si tu backend devuelve 204/200 sin body, puede fallar si intentamos parsear JSON.
 * Estrategia segura: PATCH + GET.
 */
export async function updateMe(payload: Partial<Pick<UsuarioMe, 'nombre'>>, opts?: NextOpts) {
  await apiProxy<unknown>('/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...opts,
  });
  
  // Limpiar caché después de actualizar
  clearUserCache();
  
  return getMe({ ...opts, cache: 'no-store' });
}

/* ───────────────────────────
   Direcciones
──────────────────────────── */
export async function listAddresses(opts?: NextOpts) {
  return apiProxy<Direccion[]>('/users/me/addresses', { ...opts, cache: 'no-store' });
}

export async function addAddress(input: DireccionInput, opts?: NextOpts) {
  return apiProxy<Direccion>('/users/me/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    ...opts,
  });
}

export async function upsertAddress(input: DireccionUpsertInput, opts?: NextOpts) {
  return apiProxy<Direccion>('/users/me/addresses', {
    method: 'POST', // el backend hace upsert si viene id
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    ...opts,
  });
}

export async function removeAddress(id: string, opts?: NextOpts) {
  return apiProxy<void>(`/users/me/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...opts,
  });
}

/* ───────────────────────────
   Favoritos (CRUD base)
──────────────────────────── */
export async function listFavorites(opts?: NextOpts) {
  return apiProxy<FavoriteProduct[]>('/users/me/favorites', { ...opts, cache: 'no-store' });
}

export async function addFavorite(productoId: string, opts?: NextOpts) {
  if (!productoId || typeof productoId !== 'string' || productoId.trim() === '') {
    throw new Error('productoId debe ser un string válido');
  }
  
  const payload = { productoId: productoId.trim() };
  
  return apiProxy<void>('/users/me/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...opts,
  });
}

export async function removeFavorite(productoId: string, opts?: NextOpts) {
  if (!productoId || typeof productoId !== 'string' || productoId.trim() === '') {
    throw new Error('productoId debe ser un string válido');
  }
  return apiProxy<void>(`/users/me/favorites/${encodeURIComponent(productoId.trim())}`, {
    method: 'DELETE',
    ...opts,
  });
}

export async function toggleFavorite(productoId: string, isFav: boolean, opts?: NextOpts) {
  return isFav ? removeFavorite(productoId, opts) : addFavorite(productoId, opts);
}

/* ───────────────────────────
   Favoritos → Productos
   - Resolver por slug contra Catálogo (bySlug).
   - Fallback: construir ProductMinimal desde el propio favorito.
──────────────────────────── */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const ret: R[] = [];
  let idx = 0;
  const run = async () => {
    while (idx < items.length) {
      const i = idx++;
      ret[i] = await mapper(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return ret;
}

/** Detalle de producto por SLUG (ajustá el path si tu back difiere) */
async function getProductBySlug(slug: string, opts?: NextOpts): Promise<ProductMinimal | null> {
  try {
    const p = await apiProxy<ProductMinimal>(
      `/catalog/productos/${encodeURIComponent(slug)}`,
      { ...opts, cache: 'no-store' }
    );
    return p ?? null;
  } catch {
    return null;
  }
}

export async function listFavoriteProducts(opts?: NextOpts): Promise<ProductMinimal[]> {
  // Forzamos no-cache para obtener datos actualizados
  const favs = await listFavorites({ cache: 'no-store' });
  if (!Array.isArray(favs) || favs.length === 0) {
    console.log('⚠️ No se encontraron favoritos');
    return [];
  }

  console.log(`✅ Obtenidos ${favs.length} favoritos del backend`);
  
  // Extraemos slugs únicos para consultar productos completos
  const slugs = Array.from(new Set(favs.map((f) => f.slug).filter(Boolean))) as string[];

  let resolved: ProductMinimal[] = [];
  if (slugs.length) {
    // Consultamos detalles de productos por slug (en paralelo con límite)
    const prods = await mapLimit(slugs, 5, (s) => getProductBySlug(s, { cache: 'no-store' }));
    resolved = prods.filter((p): p is ProductMinimal => !!p);
    console.log(`✅ Resueltos ${resolved.length} productos por slug`);
  }

  // Fallback para los que no pudieron resolverse por catálogo
  const resolvedSlugs = new Set(resolved.map((p) => p.slug));
  const fallback: ProductMinimal[] = favs
    .filter((f) => !f.slug || !resolvedSlugs.has(f.slug))
    .map((f) => ({
      id: f.id,
      slug: f.slug ?? f.id, // si no hay slug, usamos id como sustituto
      titulo: f.titulo ?? 'Producto',
      precio: typeof f.precio === 'number' ? f.precio : 0,
      imagen: f.imagen ?? null,
      imagenes: [],
      destacado: null,
      stock: null,
      ratingProm: null,
      ratingConteo: null,
      marca: null,
      categoria: null,
      precioLista: null,
    }));

  if (fallback.length > 0) {
    console.log(`⚠️ Se usó fallback para ${fallback.length} productos`);
  }

  const result = [...resolved, ...fallback];
  console.log(`✅ Total de productos favoritos: ${result.length}`);
  return result;
}

/* ───────────────────────────
   Órdenes
   - listOrders: llamada directa con params
   - listOrdersSmart: estrategia robusta (sin params → page=0 → page=1)
──────────────────────────── */
export async function listOrders(
  params?: { page?: number; perPage?: number },
  opts?: NextOpts
) {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.perPage !== undefined) qs.set('perPage', String(params.perPage));
  const q = qs.toString();
  return apiProxy<{ items: Orden[]; meta?: { page?: number; pages?: number; total?: number } }>(
    `/users/me/orders${q ? `?${q}` : ''}`,
    { ...opts, cache: 'no-store' }
  );
}

/* Normalizador tolerante a backend para órdenes */
type OrdersMeta = { page?: number; pages?: number; total?: number };
export type OrdersResponse = { items: Orden[]; meta?: OrdersMeta };

// Tipo para respuestas de API que pueden tener diferentes estructuras
type ApiResponse = {
  items?: unknown;
  data?: {
    items?: unknown;
    meta?: unknown;
  };
  results?: unknown;
  rows?: unknown;
  meta?: unknown;
};

function normalizeOrdersResponse(raw: unknown): OrdersResponse {
  // Si es array plano
  if (Array.isArray(raw)) return { items: raw as Orden[] };

  // Type assertion para acceder a propiedades
  const rawObj = raw as ApiResponse;
  
  // Intentos comunes
  const candidates = [rawObj?.items, rawObj?.data?.items, rawObj?.results, rawObj?.rows, rawObj?.data];
  const found = candidates.find((c) => Array.isArray(c)) as Orden[] | undefined;

  if (Array.isArray(found)) {
    const meta: OrdersMeta | undefined = rawObj?.meta ?? rawObj?.data?.meta ?? undefined;
    return { items: found, meta };
  }

  return { items: [] };
}

async function fetchOrdersOnce(
  params?: { page?: number; perPage?: number },
  opts?: NextOpts
): Promise<OrdersResponse> {
  const qs = new URLSearchParams();
  if (params?.page !== undefined) qs.set('page', String(params.page));
  if (params?.perPage !== undefined) qs.set('perPage', String(params.perPage));
  const q = qs.toString();

  const raw = await apiProxy<unknown>(`/users/me/orders${q ? `?${q}` : ''}`, {
    ...opts,
    cache: 'no-store',
  });
  return normalizeOrdersResponse(raw);
}

/** Estrategia robusta para cubrir 0-based / 1-based y distintas formas de payload */
export async function listOrdersSmart(opts?: NextOpts): Promise<OrdersResponse> {
  // 1) sin params (defaults del backend)
  let res = await fetchOrdersOnce(undefined, opts);
  if (res.items.length > 0) return res;

  // 2) 0-based
  res = await fetchOrdersOnce({ page: 0, perPage: 20 }, opts);
  if (res.items.length > 0) return res;

  // 3) 1-based
  res = await fetchOrdersOnce({ page: 1, perPage: 20 }, opts);
  return res; // puede venir vacío; la UI lo maneja
}

/* ───────────────────────────
   Inscripciones
──────────────────────────── */
type BackendEnrollment = {
  id: string;
  cursoId: string;
  estado: EstadoInscripcion;
  creadoEn: string;
  actualizadoEn: string;
  progreso?: unknown;
  curso?: { 
    id: string; 
    slug?: string; 
    titulo?: string; 
    portadaUrl?: string | null;
    instructor?: { nombre: string } | null;
    _count?: { modulos: number };
  };
  Curso?: { 
    id: string; 
    slug?: string; 
    titulo?: string; 
    portadaUrl?: string | null;
    instructor?: { nombre: string } | null;
    _count?: { modulos: number };
  };
};

export async function listEnrollments(opts?: NextOpts) {
  const rows = await apiProxy<BackendEnrollment[]>('/users/me/enrollments', {
    ...opts,
    cache: 'no-store',
  });
  return rows.map((r) => {
    const c = r.curso ?? r.Curso;
    return {
      id: r.id,
      cursoId: r.cursoId,
      estado: r.estado, // Usar estado directo sin mapeo
      creadoEn: r.creadoEn,
      progreso: r.progreso,
      curso: c ? { 
        id: c.id, 
        slug: c.slug, 
        titulo: c.titulo, 
        portadaUrl: c.portadaUrl,
        instructor: c.instructor,
        _count: c._count
      } : undefined,
    } satisfies Inscripcion;
  });
}

/* ───────────────────────────
   Verificación de inscripción
──────────────────────────── */
export async function checkUserEnrollment(
  courseId: string,
  userId: string, 
  opts?: NextOpts
): Promise<Inscripcion | null> {
  try {
    const enrollments = await listEnrollments(opts);
    const enrollment = enrollments.find(e => {
      const courseIdMatch = String(e.cursoId).trim() === String(courseId).trim();
      const validState = ['ACTIVADA', 'PAUSADA', 'DESACTIVADA'].includes(e.estado);
      return courseIdMatch && validState;
    });
    
    if (enrollment) {
      console.log('✅ Enrollment found:', {
        id: enrollment.id,
        estado: enrollment.estado,
        cursoId: enrollment.cursoId
      });
    } else {
      console.log('🔍 No enrollment found for course:', courseId);
    }
    
    return enrollment || null;
  } catch (error) {
    console.error('❌ Error checking user enrollment:', error);
    return null;
  }
}

/* ───────────────────────────
   Progreso de lecciones
──────────────────────────── */
export async function updateLessonProgress(
  enrollmentId: string,
  moduleId: string,
  lessonId: string,
  progressData?: Record<string, unknown>,
  opts?: NextOpts
) {
  return apiProxy<{ id: string; progreso: unknown; actualizadoEn: string }>('/users/me/enrollments/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enrollmentId,
      moduleId,
      lessonId,
      progressData,
    }),
    ...opts,
  });
}
