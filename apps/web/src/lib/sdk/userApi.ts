// src/lib/sdk/userApi.ts
import { apiProxy } from '@/lib/api-proxy';
import { getServerCookies } from '@/lib/server-utils';

/** Opciones compatibles con fetch de Next (SSR o cliente) */
export type NextOpts = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

/* ───────────────────────────
   Tipos (compatibles con tu UI)
12→──────────────────────────── */
export type Rol = 'ADMIN' | 'ESTUDIANTE' | 'CUSTOMER' | 'STAFF';

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
  id: string | number;
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
  id: string | number;
  slug: string;
  titulo: string;
  precio: number; // precio directo
  descuento?: number | null;
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
  | 'REEMBOLSADO'
  | 'PROCESANDO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'RECHAZADO';
export type TipoItemOrden = 'CURSO' | 'PRODUCTO';

export type OrdenItem = {
  id: string;
  tipo: TipoItemOrden;
  refId: string;
  titulo: string;
  cantidad: number;
  precioUnitario: number;
  imagen?: string | null;
};

export type Orden = {
  id: string;
  estado: EstadoOrden;
  total: number;
  moneda: string;
  referenciaPago?: string | null;
  creadoEn: string;
  items?: OrdenItem[];
  esSuscripcion?: boolean;
  suscripcionActiva?: boolean | null;
  suscripcionId?: string | null;
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
  subscriptionOrderId?: string | number | null;
  subscriptionId?: string | null;
  subscriptionEndDate?: string | Date | null;
  subscriptionActive?: boolean | null;
  curso?: { 
    id: string; 
    slug?: string; 
    titulo?: string; 
    portada?: string | null;
    portadaUrl?: string | null;
    totalLessons?: number;
    _count?: { modulos: number };
    modulos?: {
      id: number;
      titulo: string;
      orden: number;
      lecciones: {
        id: number;
        titulo: string;
        orden: number;
      }[];
    }[];
  };
};

/* ───────────────────────────
   Adapters
──────────────────────────── */
const preferenciaRoles = ['ADMIN', 'STAFF', 'CUSTOMER'] as const;
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
  const cached = getCachedUser();
  if (opts?.cache !== 'no-store' && cached) {
    return cached;
  }
  try {
    const raw = await apiProxy<BackendMe>('/users/me', { ...opts, cache: 'no-store' });
    const accessToken = await getServerCookies();
    const user = adaptMe(raw, accessToken);
    if (opts?.cache !== 'no-store') {
      setCachedUser(user);
    }
    return user;
  } catch (error) {
    if (error instanceof Error && error.message.includes('HTTP 401')) {
      clearUserCache();
      return null;
    }
    if (cached) {
      return cached;
    }
    console.error('getMe failed:', error);
    return null;
  }
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
  // Usar el catchAll existente para evitar problemas de contenido mixto
  return fetch('/api/users/me/addresses', { ...opts, cache: 'no-store' })
    .then(async res => {
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }) as Promise<Direccion[]>;
}

export async function addAddress(input: DireccionInput, opts?: NextOpts) {
  // Usar el catchAll existente para evitar problemas de contenido mixto
  return fetch('/api/users/me/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    ...opts,
  }).then(res => res.json()) as Promise<Direccion>;
}

export async function upsertAddress(input: DireccionUpsertInput, opts?: NextOpts) {
  // Usar el catchAll existente para evitar problemas de contenido mixto
  return fetch('/api/users/me/addresses', {
    method: 'POST', // el backend hace upsert si viene id
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    ...opts,
  }).then(res => res.json()) as Promise<Direccion>;
}

export async function removeAddress(id: string, opts?: NextOpts) {
  // Usar el catchAll existente para evitar problemas de contenido mixto
  return fetch(`/api/users/me/addresses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    ...opts,
  }).then(res => {
    if (!res.ok) throw new Error('Error al eliminar dirección');
    return undefined;
  }) as Promise<void>;
}

/* ───────────────────────────
   Favoritos (CRUD base)
──────────────────────────── */
export async function listFavorites(opts?: NextOpts) {
  console.log('[FRONTEND] listFavorites - Iniciando petición:', {
    url: '/api/users/me/favorites',
    opts,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Usar el catchAll existente para evitar problemas de contenido mixto
    const response = await fetch('/api/users/me/favorites', { ...opts, cache: 'no-store' });
    
    console.log('[FRONTEND] listFavorites - Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('[FRONTEND] listFavorites - Datos parseados:', {
      data,
      type: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'N/A',
      timestamp: new Date().toISOString()
    });
    
    return data as FavoriteProduct[];
  } catch (error) {
    console.error('[FRONTEND] listFavorites - Error:', {
      error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function addFavorite(productoId: string | number, opts?: NextOpts) {
  const pid = String(productoId).trim();
  if (!pid) {
    throw new Error('productoId debe ser un string válido');
  }
  const payload = { productoId: /^\d+$/.test(pid) ? Number(pid) : pid };
  
  // Usar el catchAll existente para evitar problemas de contenido mixto
  return fetch('/api/users/me/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...opts,
  }).then(async res => {
    if (res.ok) return undefined;
    if (res.status === 409) return undefined;
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'Error al añadir favorito');
  }) as Promise<void>;
}

export async function removeFavorite(productoId: string | number, opts?: NextOpts) {
  const pid = String(productoId).trim();
  if (!pid) {
    throw new Error('productoId debe ser un string válido');
  }
  return fetch(`/api/users/me/favorites/${encodeURIComponent(pid)}`, {
    method: 'DELETE',
    ...opts,
  }).then(async res => {
    if (res.ok) return undefined;
    if (res.status === 404) return undefined;
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'Error al eliminar favorito');
  }) as Promise<void>;
}

export async function toggleFavorite(productoId: string | number, isFav: boolean, opts?: NextOpts) {
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

export async function listFavoriteProducts(): Promise<ProductMinimal[]> {
  try {
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
      try {
        // Consultamos detalles de productos por slug (en paralelo con límite)
        const prods = await mapLimit(slugs, 5, (s) => getProductBySlug(s, { cache: 'no-store' }));
        resolved = prods.filter((p): p is ProductMinimal => !!p);
        console.log(`✅ Resueltos ${resolved.length} productos por slug`);
      } catch (error) {
        console.error('Error al resolver productos por slug:', error);
        // Continuamos con el fallback
      }
    }

    // Fallback para los que no pudieron resolverse por catálogo
    const resolvedSlugs = new Set(resolved.map((p) => p.slug));
    const fallback: ProductMinimal[] = favs
      .filter((f) => !f.slug || !resolvedSlugs.has(f.slug))
      .map((f) => ({
        id: f.id,
        slug: f.slug ?? String(f.id),
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
      descuento: null,
    }));

    if (fallback.length > 0) {
      console.log(`⚠️ Se usó fallback para ${fallback.length} productos`);
    }

    const result = [...resolved, ...fallback];
    console.log(`✅ Total de productos favoritos: ${result.length}`);
    return result;
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return []; // Devolver array vacío en caso de error
  }
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
  subscriptionOrderId?: string | number | null;
  subscriptionId?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionActive?: boolean | null;
  curso?: { 
    id: string; 
    slug?: string; 
    titulo?: string; 
    portada?: string | null;
    portadaUrl?: string | null;
    instructor?: { nombre: string } | null;
    _count?: { modulos: number };
    modulos?: {
      id: number;
      titulo: string;
      orden: number;
      lecciones: {
        id: number;
        titulo: string;
        orden: number;
      }[];
    }[];
  };
  Curso?: { 
    id: string; 
    slug?: string; 
    titulo?: string; 
    portada?: string | null;
    portadaUrl?: string | null;
    instructor?: { nombre: string } | null;
    _count?: { modulos: number };
    modulos?: {
      id: number;
      titulo: string;
      orden: number;
      lecciones: {
        id: number;
        titulo: string;
        orden: number;
      }[];
    }[];
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
      subscriptionOrderId: r.subscriptionOrderId ?? null,
      subscriptionId: r.subscriptionId ?? null,
      subscriptionEndDate: r.subscriptionEndDate ?? null,
      subscriptionActive: r.subscriptionActive ?? null,
      curso: c ? { 
        id: c.id, 
        slug: c.slug, 
        titulo: c.titulo, 
        portada: c.portada,
        portadaUrl: c.portadaUrl,
        _count: c._count,
        // Incluimos los módulos y lecciones si vienen desde el backend
        modulos: c.modulos?.map((m) => ({
          id: m.id,
          titulo: m.titulo,
          orden: m.orden,
          lecciones: m.lecciones?.map((l) => ({
            id: l.id,
            titulo: l.titulo,
            orden: l.orden,
          })) ?? [],
        }))
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
  enrollmentId: string | number,
  moduleId: string | number,
  lessonId: string | number,
  progressData?: Record<string, unknown>,
  opts?: NextOpts
) {
  const payload = {
    enrollmentId: Number(enrollmentId),
    moduleId: Number(moduleId),
    lessonId: Number(lessonId),
    progressData,
  };

  return apiProxy<{ id: string; progreso: unknown; actualizadoEn: string }>('/users/me/enrollments/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    ...opts,
  });
}
