// apps/web/src/app/admin/resources/[tableName]/schemas.ts
import { z } from 'zod'

/** Coerciones y normalizaciones */
const zBool = z.union([z.boolean(), z.string()]).transform(v => {
  if (typeof v === 'boolean') return v
  const s = v.trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'on' || s === 'yes'
})

const zInt = z.coerce.number().int().finite() // entero y finito
const zCuid = z.string().cuid() // CUID para IDs de Prisma
const zDecimal = z.coerce.number().finite() // Para campos Decimal de Prisma

/** Usuarios y Roles */
export const UsuarioSchema = z.object({
  id: zCuid.optional(),
  email: z.string().email(),
  nombre: z.string().min(1).optional().nullable(),
  passwordHash: z.string().min(1).optional(), // Solo para creación
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
  emailVerificadoEn: z.date().optional().nullable(),
}).strict()

export const RoleSchema = z.object({
  id: zCuid.optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.date().optional(),
}).strict()

export const UsuarioRolSchema = z.object({
  usuarioId: zCuid,
  roleId: zCuid,
}).strict()

/** Catálogo */
export const MarcaSchema = z.object({
  id: zCuid.optional(),
  slug: z.string().min(1),
  nombre: z.string().min(1),
  imagen: z.string().optional().nullable(),
  activa: zBool.default(true),
  orden: zInt.default(0),
  creadoEn: z.date().optional(),
}).strict()

export const CategoriaSchema = z.object({
  id: zCuid.optional(),
  slug: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  imagen: z.string().optional().nullable(),
  activa: zBool.default(true),
  orden: zInt.default(0),
  parentId: zCuid.optional().nullable(),
  creadoEn: z.date().optional(),
}).strict()

export const ProductoSchema = z.object({
  id: zCuid.optional(),
  slug: z.string().min(1),
  titulo: z.string().min(1),
  precio: zInt.nonnegative(),
  stock: zInt.nonnegative().default(0),
  publicado: zBool.default(false),
  destacado: zBool.default(false),
  imagen: z.string().optional().nullable(),
  descripcionMD: z.string().optional().nullable(),
  precioLista: zInt.optional().nullable(),
  ratingProm: zDecimal.optional().nullable(),
  ratingConteo: zInt.default(0),
  marcaId: zCuid.optional().nullable(),
  categoriaId: zCuid.optional().nullable(),
  creadoEn: z.date().optional(),
}).strict()

export const ProductoImagenSchema = z.object({
  id: zCuid.optional(),
  productoId: zCuid,
  archivo: z.string().min(1),
  alt: z.string().optional().nullable(),
  orden: zInt.default(0),
}).strict()

/** Cursos */
export const CursoSchema = z.object({
  id: zCuid.optional(),
  slug: z.string().min(1),
  titulo: z.string().min(1),
  resumen: z.string().optional().nullable(),
  descripcionMD: z.string().optional().nullable(),
  requisitos: z.string().optional().nullable(),
  precio: zInt.nonnegative(),
  publicado: zBool.default(false),
  nivel: z.enum(['BASICO', 'INTERMEDIO', 'AVANZADO']).default('BASICO'),
  portada: z.string().optional().nullable(),
  destacado: zBool.default(false),
  tags: z.any().optional().nullable(), // JSON
  ratingProm: zDecimal.optional().nullable(),
  ratingConteo: zInt.default(0),
  instructorId: zCuid.optional().nullable(),
  creadoEn: z.date().optional(),
}).strict()

export const ModuloSchema = z.object({
  id: zCuid.optional(),
  cursoId: zCuid,
  titulo: z.string().min(1),
  orden: zInt,
}).strict()

export const LeccionSchema = z.object({
  id: zCuid.optional(),
  moduloId: zCuid,
  titulo: z.string().min(1),
  duracionS: zInt.default(0),
  rutaSrc: z.string().optional().nullable(),
  orden: zInt,
  tipo: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  contenido: z.any().optional().nullable(), // JSON
}).strict()

export const InscripcionSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  cursoId: zCuid,
  estado: z.enum(['ACTIVADA', 'PAUSADA', 'DESACTIVADA']).default('ACTIVADA'),
  progreso: z.any(), // JSON
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

/** Órdenes */
export const OrdenSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  estado: z.enum(['PENDIENTE', 'PAGADO', 'CUMPLIDO', 'CANCELADO', 'REEMBOLSADO']).default('PENDIENTE'),
  total: zInt.nonnegative(),
  moneda: z.string().default('ARS'),
  referenciaPago: z.string().optional().nullable(),
  direccionEnvioId: zCuid.optional().nullable(),
  direccionFacturacionId: zCuid.optional().nullable(),
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

export const ItemOrdenSchema = z.object({
  id: zCuid.optional(),
  ordenId: zCuid,
  tipo: z.enum(['CURSO', 'PRODUCTO']),
  refId: zCuid,
  titulo: z.string().min(1),
  cantidad: zInt.positive().default(1),
  precioUnitario: zInt.nonnegative(),
}).strict()

/** Direcciones */
export const DireccionSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  etiqueta: z.string().optional().nullable(),
  nombre: z.string().min(1),
  telefono: z.string().optional().nullable(),
  calle: z.string().min(1),
  numero: z.string().optional().nullable(),
  pisoDepto: z.string().optional().nullable(),
  ciudad: z.string().min(1),
  provincia: z.string().min(1),
  cp: z.string().min(1),
  pais: z.string().default('AR'),
  predeterminada: zBool.default(false),
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

/** Slider */
export const SliderSchema = z.object({
  id: zCuid.optional(),
  titulo: z.string().min(1),
  alt: z.string().min(1),
  archivo: z.string().min(1),
  activa: zBool.default(true),
  orden: zInt.default(0),
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

/** Reseñas */
export const ResenaSchema = z.object({
  id: zCuid.optional(),
  cursoId: zCuid.optional().nullable(),
  productoId: zCuid.optional().nullable(),
  usuarioId: zCuid,
  puntaje: zInt.min(1).max(5),
  comentario: z.string().optional().nullable(),
  creadoEn: z.date().optional(),
}).strict()

export const ResenaLikeSchema = z.object({
  id: zCuid.optional(),
  resenaId: zCuid,
  usuarioId: zCuid,
  tipo: z.enum(['LIKE', 'DISLIKE']),
  creadoEn: z.date().optional(),
}).strict()

export const ResenaRespuestaSchema = z.object({
  id: zCuid.optional(),
  resenaId: zCuid,
  usuarioId: zCuid,
  parentId: zCuid.optional().nullable(),
  contenido: z.string().min(1),
  eliminado: zBool.default(false),
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

/** Favoritos */
export const FavoritoSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  productoId: zCuid,
  creadoEn: z.date().optional(),
}).strict()

/** Notificaciones */
export const NotificacionSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  tipo: z.enum(['RESPUESTA_RESENA', 'LIKE_RESENA', 'MENCION']),
  titulo: z.string().min(1),
  mensaje: z.string().min(1),
  leida: zBool.default(false),
  url: z.string().optional().nullable(),
  metadata: z.any().optional().nullable(), // JSON
  creadoEn: z.date().optional(),
}).strict()

export const PreferenciasNotificacionSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  nuevaResena: zBool.default(true),
  respuestaResena: zBool.default(true),
  actualizacionesSistema: zBool.default(true),
  mantenimiento: zBool.default(true),
  reporteContenido: zBool.default(true),
  contenidoPendiente: zBool.default(true),
  resumenDiario: zBool.default(false),
  notificacionesInstantaneas: zBool.default(true),
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

export const ResenaBorradorSchema = z.object({
  id: zCuid.optional(),
  usuarioId: zCuid,
  cursoId: zCuid.optional().nullable(),
  productoId: zCuid.optional().nullable(),
  puntaje: zInt.min(1).max(5).optional().nullable(),
  comentario: z.string().optional().nullable(),
  creadoEn: z.date().optional(),
  actualizadoEn: z.date().optional(),
}).strict()

/** Mapa de schemas por recurso (tipo simple y compatible con tu versión de Zod) */
export const schemaByResource: Record<string, z.ZodTypeAny> = {
  // Usuarios y Roles
  Usuario: UsuarioSchema,
  Role: RoleSchema,
  UsuarioRol: UsuarioRolSchema,

  // Catálogo
  Marca: MarcaSchema,
  Categoria: CategoriaSchema,
  Producto: ProductoSchema,
  ProductoImagen: ProductoImagenSchema,

  // Cursos
  Curso: CursoSchema,
  Modulo: ModuloSchema,
  Leccion: LeccionSchema,
  Inscripcion: InscripcionSchema,

  // Órdenes
  Orden: OrdenSchema,
  ItemOrden: ItemOrdenSchema,

  // Direcciones
  Direccion: DireccionSchema,

  // Hero
  Slider: SliderSchema,

  // Reseñas
  Resena: ResenaSchema,
  ResenaLike: ResenaLikeSchema,
  ResenaRespuesta: ResenaRespuestaSchema,

  // Favoritos
  Favorito: FavoritoSchema,

  // Notificaciones
  Notificacion: NotificacionSchema,
  PreferenciasNotificacion: PreferenciasNotificacionSchema,

  // Borradores
  ResenaBorrador: ResenaBorradorSchema,
}

/** Campos de búsqueda por string para cada recurso */
export const searchStringFieldsByResource: Record<string, string[]> = {
  // Usuarios y Roles
  Usuario: ['nombre', 'email'],
  Role: ['name', 'slug'],
  UsuarioRol: [],

  // Catálogo
  Marca: ['nombre', 'slug'],
  Categoria: ['nombre', 'descripcion', 'slug'],
  Producto: ['titulo', 'descripcionMD', 'sku', 'slug'],
  ProductoImagen: ['alt'],

  // Cursos
  Curso: ['titulo', 'resumen', 'descripcionMD', 'slug'],
  Modulo: ['titulo'],
  Leccion: ['titulo', 'descripcion'],
  Inscripcion: [],

  // Órdenes
  Orden: ['referenciaPago'],
  ItemOrden: ['titulo'],

  // Direcciones
  Direccion: ['nombre', 'etiqueta', 'calle', 'ciudad', 'provincia'],

  // Hero
  Slider: ['titulo', 'alt'],

  // Reseñas
  Resena: ['comentario'],
  ResenaLike: [],
  ResenaRespuesta: ['contenido'],

  // Favoritos
  Favorito: [],

  // Notificaciones
  Notificacion: ['titulo', 'mensaje'],
  PreferenciasNotificacion: [],

  // Borradores
  ResenaBorrador: ['comentario'],
}
