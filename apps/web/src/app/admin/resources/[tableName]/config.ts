// Config y constantes compartidas por el módulo admin

export const READ_ONLY_RESOURCES: string[] = ['Orden', 'ItemOrden', 'Resena', 'ResenaLike', 'ResenaRespuesta', 'Notificacion']

export const relationMap = {
  Producto: ['ProductoImagen', 'Resena', 'Favorito'],
  Curso: ['Modulo', 'Inscripcion', 'Resena'],
  Modulo: ['Leccion'],
  Usuario: ['UsuarioRol', 'Inscripcion', 'Orden', 'Resena', 'Direccion', 'Favorito'],
  Orden: ['ItemOrden'],
  Resena: ['ResenaLike', 'ResenaRespuesta'],
} as const satisfies Record<string, readonly string[]>

export const relationLabels = {
  ProductoImagen:     'Imágenes',
  Modulo:             'Módulos',
  Leccion:            'Lecciones',
  Inscripcion:        'Inscripciones',
  ItemOrden:          'Items',
  ResenaLike:         'Likes',
  ResenaRespuesta:    'Respuestas',
  UsuarioRol:         'Roles',
  Direccion:          'Direcciones',
  Favorito:           'Favoritos',
} as const

export const HIDDEN_COLUMNS = {
  Producto:           ['marcaId', 'categoriaId'],
  ProductoImagen:     ['productoId'],
  Curso:              ['instructorId'],
  Modulo:             ['cursoId'],
  Leccion:            ['moduloId'],
  Inscripcion:        ['usuarioId', 'cursoId'],
  Orden:              ['usuarioId', 'direccionEnvioId', 'direccionFacturacionId'],
  ItemOrden:          ['ordenId'],
  Direccion:          ['usuarioId'],
  Favorito:           ['usuarioId', 'productoId'],
  Resena:             ['usuarioId', 'cursoId', 'productoId'],
  ResenaLike:         ['resenaId', 'usuarioId'],
  ResenaRespuesta:    ['resenaId', 'usuarioId', 'parentId'],
  UsuarioRol:         ['usuarioId', 'roleId'],
  Notificacion:       ['usuarioId'],
  PreferenciasNotificacion: ['usuarioId'],
  ResenaBorrador:     ['usuarioId', 'cursoId', 'productoId'],
} as const

export const DEFAULT_COLUMNS = {
  // Usuarios y Roles
  Usuario: [
    'id', 'email', 'nombre', 'creadoEn', 'emailVerificadoEn',
  ],
  Role: [
    'id', 'slug', 'name', 'createdAt',
  ],
  UsuarioRol: [
    'usuarioId', 'roleId',
  ],
  
  // Catálogo
  Marca: [
    'id', 'slug', 'nombre', 'imagen', 'activa', 'orden', 'creadoEn',
  ],
  Categoria: [
    'id', 'slug', 'nombre', 'descripcion', 'imagen', 'activa', 'orden', 'parentId', 'creadoEn',
  ],
  Producto: [
    'id', 'slug', 'titulo', 'sku', 'precio', 'stock', 'publicado', 'destacado', 
    'imagen', 'precioLista', 'ratingProm', 'ratingConteo', 'marcaId', 'categoriaId', 'creadoEn',
  ],
  ProductoImagen: [
    'id', 'productoId', 'archivo', 'alt', 'orden',
  ],
  
  // Cursos
  Curso: [
    'id', 'slug', 'titulo', 'resumen', 'precio', 'publicado', 'nivel', 
    'portada', 'destacado', 'ratingProm', 'ratingConteo', 'instructorId', 'creadoEn',
  ],
  Modulo: [
    'id', 'cursoId', 'titulo', 'orden',
  ],
  Leccion: [
    'id', 'moduloId', 'titulo', 'duracionS', 'rutaSrc', 'orden', 'tipo', 'descripcion', 'contenido',
  ],
  Inscripcion: [
    'id', 'usuarioId', 'cursoId', 'estado', 'creadoEn', 'actualizadoEn',
  ],
  
  // Órdenes
  Orden: [
    'id', 'usuario.nombre', 'estado', 'total', 'moneda', 'referenciaPago', 'creadoEn', 'actualizadoEn',
  ],
  ItemOrden: [
    'id', 'ordenId', 'tipo', 'refId', 'titulo', 'cantidad', 'precioUnitario',
  ],
  
  // Direcciones
  Direccion: [
    'id', 'usuarioId', 'etiqueta', 'nombre', 'telefono', 'calle', 'numero', 
    'ciudad', 'provincia', 'cp', 'pais', 'predeterminada',
  ],
  
  // Slider
  Slider: [
    'id', 'titulo', 'alt', 'archivo', 'activa', 'orden', 'creadoEn',
  ],
  
  // Reseñas
  Resena: [
    'id', 'cursoId', 'productoId', 'usuarioId', 'puntaje', 'comentario', 'creadoEn',
  ],
  ResenaLike: [
    'id', 'resenaId', 'usuarioId', 'tipo', 'creadoEn',
  ],
  ResenaRespuesta: [
    'id', 'resenaId', 'usuarioId', 'parentId', 'contenido', 'eliminado', 'creadoEn',
  ],
  
  // Favoritos
  Favorito: [
    'id', 'usuarioId', 'productoId', 'creadoEn',
  ],
  
  // Notificaciones
  Notificacion: [
    'id', 'usuarioId', 'tipo', 'titulo', 'mensaje', 'leida', 'url', 'creadoEn',
  ],
  PreferenciasNotificacion: [
    'id', 'usuarioId', 'nuevaResena', 'respuestaResena', 'actualizacionesSistema', 
    'resumenDiario', 'notificacionesInstantaneas',
  ],
  
  // Borradores
  ResenaBorrador: [
    'id', 'usuarioId', 'cursoId', 'productoId', 'puntaje', 'comentario', 'creadoEn', 'actualizadoEn',
  ],
} as const

export const fkConfig = {
  // Relaciones de Producto
  marcaId: {
    resource: 'Marca',
    labelKey: 'nombre',
    fieldLabel: 'Marca',
  },
  categoriaId: {
    resource: 'Categoria',
    labelKey: 'nombre',
    fieldLabel: 'Categoría',
  },
  productoId: {
    resource: 'Producto',
    labelKey: 'titulo',
    fieldLabel: 'Producto',
  },
  
  // Relaciones de Curso
  cursoId: {
    resource: 'Curso',
    labelKey: 'titulo',
    fieldLabel: 'Curso',
  },
  instructorId: {
    resource: 'Usuario',
    labelKey: 'nombre',
    fieldLabel: 'Instructor',
  },
  moduloId: {
    resource: 'Modulo',
    labelKey: 'titulo',
    fieldLabel: 'Módulo',
  },
  
  // Relaciones de Usuario
  usuarioId: {
    resource: 'Usuario',
    labelKey: 'nombre',
    fieldLabel: 'Usuario',
  },
  roleId: {
    resource: 'Role',
    labelKey: 'name',
    fieldLabel: 'Rol',
  },
  
  // Relaciones de Orden
  ordenId: {
    resource: 'Orden',
    labelKey: 'id',
    fieldLabel: 'Orden',
  },
  direccionEnvioId: {
    resource: 'Direccion',
    labelKey: 'etiqueta',
    fieldLabel: 'Dirección de Envío',
  },
  direccionFacturacionId: {
    resource: 'Direccion',
    labelKey: 'etiqueta',
    fieldLabel: 'Dirección de Facturación',
  },
  
  // Relaciones de Reseña
  resenaId: {
    resource: 'Resena',
    labelKey: 'id',
    fieldLabel: 'Reseña',
  },
  parentId: {
    resource: 'ResenaRespuesta',
    labelKey: 'contenido',
    fieldLabel: 'Respuesta Padre',
  },
} as const satisfies Record<string, { resource: string; labelKey: string; fieldLabel: string }>
