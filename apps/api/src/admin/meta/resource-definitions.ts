export type FieldDefinition = {
  label?: string;
  help?: string;
  placeholder?: string;
  showInList?: boolean;
  showInForm?: boolean;
  widget?:
    | 'markdown'
    | 'video'
    | 'list'
    | 'json-list'
    | 'image'
    | 'date'
    | 'select';
  readOnly?: boolean;
  isRequired?: boolean;
};

export type ResourceDefinitions = Record<
  string,
  Record<string, FieldDefinition>
>;

export const RESOURCE_DEFINITIONS: ResourceDefinitions = {
  // ─────────────────────────────────────────────────────────────
  // 📚 Cursos y Contenido
  // ─────────────────────────────────────────────────────────────
  Leccion: {
    moduloId: {
      label: 'Módulo',
      help: 'Módulo al que pertenece esta lección.',
    },
    titulo: { label: 'Título', placeholder: 'Ej: Introducción al Maquillaje' },
    duracion: {
      label: 'Duración (min)',
      help: 'Tiempo estimado en minutos (ej: 1.5 para 1m 30s).',
    },
    rutaSrc: {
      label: 'Archivo Fuente',
      help: 'Nombre del archivo de video o documento.',
    },
    previewUrl: {
      label: 'Imagen de Portada (Preview)',
      showInList: false,
      help: 'Imagen o URL pública para previsualización.',
      showInForm: false,
    },
    orden: {
      label: 'Orden',
      help: 'Posición de la lección dentro del módulo.',
    },
    tipo: { label: 'Tipo', help: 'Video, Documento, Quiz o Texto.' },
    descripcion: { label: 'Descripción', showInList: false },
    contenido: { label: 'Contenido JSON', showInList: false },
  },
  Modulo: {
    cursoId: { label: 'Curso' },
    titulo: { label: 'Título del Módulo' },
    orden: { label: 'Orden' },
    lecciones: { label: 'Lecciones', showInList: false },
  },
  Curso: {
    portada: { label: 'Imagen de Portada', widget: 'image' },
    titulo: { label: 'Título del Curso' },
    slug: { label: 'Slug (URL)', help: 'Identificador único para la URL.' },
    nivel: { label: 'Nivel', help: 'Básico, Intermedio o Avanzado.' },
    precio: { label: 'Precio', help: 'Precio actual del curso.' },
    descuento: {
      label: 'Descuento (%)',
      help: 'Porcentaje de descuento (0-100).',
      isRequired: false,
    },
    publicado: { label: '¿Publicado?', help: 'Visible para los usuarios.' },
    destacado: {
      label: '¿Destacado?',
      help: 'Aparece en secciones principales.',
    },
    ratingProm: {
      label: 'Rating Promedio',
      showInForm: false,
      showInList: false,
    },
    tags: {
      label: 'Tags',
      help: 'Etiquetas para búsqueda (Enter para agregar).',
      showInList: true,
      widget: 'json-list',
    },
    resumen: { label: 'Resumen Corto', showInList: true },
    queAprenderas: {
      label: 'Lo que aprenderás',
      help: 'Lista de puntos clave.',
      showInList: true,
      widget: 'json-list',
    },
    videoPreview: {
      label: 'Vista Previa (Video)',
      help: 'Video promocional del curso.',
      showInList: false,
      showInForm: false,
      widget: 'video',
    },
    requisitos: {
      label: 'Requisitos',
      help: 'Lista de requisitos (uno por línea o bullets).',
      widget: 'json-list',
      showInList: true,
    },
    descripcionMD: {
      label: 'Descripción Completa',
      showInList: true,
      widget: 'markdown',
    },
    ratingConteo: {
      label: 'Total Reseñas',
      showInList: false,
      showInForm: false,
    },
  },
  Inscripcion: {
    usuarioId: { label: 'Usuario' },
    cursoId: { label: 'Curso' },
    estado: { label: 'Estado de inscripción' },
    subscriptionOrderId: { label: 'Orden de suscripción' },
    subscriptionId: { label: 'ID suscripción' },
    subscriptionEndDate: { label: 'Fin de suscripción' },
    subscriptionActive: { label: 'Estado suscripción' },
    creadoEn: { label: 'Creada el', showInForm: false },
    actualizadoEn: { label: 'Actualizada el', showInForm: false },
    progreso: { label: 'Progreso (%)', showInList: false },
  },

  // ─────────────────────────────────────────────────────────────
  // 🛍️ Tienda y Productos
  // ─────────────────────────────────────────────────────────────
  Producto: {
    imagen: { label: 'Imagen Principal' },
    titulo: { label: 'Nombre del Producto' },
    slug: { label: 'Slug (URL)' },
    especificaciones: {
      label: 'Especificaciones',
      help: 'Lista de especificaciones (Enter para agregar).',
      widget: 'json-list',
      showInList: false,
    },
    precio: { label: 'Precio' },
    stock: { label: 'Stock Disponible' },
    marcaId: { label: 'Marca' },
    categoriaId: { label: 'Categoría' },
    publicado: { label: '¿Publicado?' },
    destacado: { label: '¿Destacado?' },
    descuento: {
      label: 'Descuento (%)',
      help: 'Porcentaje de descuento (0-100).',
      isRequired: false,
    },
    descripcionMD: {
      label: 'Descripción Completa (MD)',
      widget: 'markdown',
      showInList: false,
    },
    ratingProm: {
      label: 'Rating Promedio',
      showInList: false,
      showInForm: false,
    },
    ratingConteo: {
      label: 'Total Reseñas',
      showInList: false,
      showInForm: false,
    },
  },
  Marca: {
    nombre: { label: 'Nombre de Marca' },
    imagen: { label: 'Logo', showInList: false, showInForm: false },
    activa: { label: '¿Activa?' },
    productos: { label: 'Productos', showInList: false },
  },
  Categoria: {
    nombre: { label: 'Nombre Categoría' },
    descripcion: { label: 'Descripción' },
    productos: { label: 'Productos', showInList: false },
  },
  Orden: {
    usuarioId: { label: 'Cliente', readOnly: true },
    estado: { label: 'Estado Orden', widget: 'select' },
    total: { label: 'Total a Pagar', readOnly: true },
    moneda: { label: 'Moneda', readOnly: true },
    referenciaPago: {
      label: 'Ref. Pago',
      help: 'ID de transacción externa.',
      readOnly: true,
    },
    esSuscripcion: { label: '¿Es Suscripción?', readOnly: true },
    suscripcionActiva: { label: 'Suscripción Activa', readOnly: true },
    suscripcionId: { label: 'ID Suscripción MP', readOnly: true },
    direccionEnvioId: {
      label: 'Dirección Envío',
      showInList: false,
      readOnly: true,
    },
    direccionFacturacionId: {
      label: 'Dirección Facturación',
      showInList: false,
      readOnly: true,
    },
    metadatos: { label: 'Metadatos', readOnly: true, showInList: false },
  },

  // ─────────────────────────────────────────────────────────────
  // 👥 Usuarios y Sistema
  // ─────────────────────────────────────────────────────────────
  Usuario: {
    email: { label: 'Correo Electrónico' },
    nombre: { label: 'Nombre Completo' },
    passwordHash: {
      label: 'Contraseña (Hash)',
      showInList: false,
      showInForm: false,
    },
    roles: { label: 'Roles Asignados' },
    creadoEn: { label: 'Registrado El' },
    emailVerificadoEn: { label: 'Verificado El' },
  },
  Role: {
    name: { label: 'Nombre del Rol' },
    slug: { label: 'Identificador (Slug)' },
  },
  Direccion: {
    usuarioId: { label: 'Usuario' },
    calle: { label: 'Calle' },
    ciudad: { label: 'Ciudad' },
    provincia: { label: 'Provincia' },
    cp: { label: 'Código Postal' },
    predeterminada: { label: '¿Predeterminada?' },
  },
  Slider: {
    archivo: { label: 'Imagen Banner', widget: 'image' },
    titulo: { label: 'Título Principal' },
    subtitulo: { label: 'Subtítulo', showInList: true },
    etiqueta: { label: 'Etiqueta (Badge)', showInList: true },
    descripcion: { label: 'Descripción', widget: 'markdown', showInList: true },
    activa: { label: '¿Visible?' },
    orden: { label: 'Orden' },
    ctaPrimarioTexto: { label: 'Botón 1: Texto', showInList: true },
    ctaPrimarioHref: { label: 'Botón 1: Enlace', showInList: true },
    ctaSecundarioTexto: { label: 'Botón 2: Texto', showInList: true },
    ctaSecundarioHref: { label: 'Botón 2: Enlace', showInList: true },
    alt: { label: 'Texto Alt (SEO)', showInList: true },
  },
  Notificacion: {
    usuarioId: { label: 'Destinatario' },
    tipo: { label: 'Tipo Evento' },
    titulo: { label: 'Título' },
    mensaje: { label: 'Contenido' },
    leida: { label: '¿Leída?' },
  },
};

export const RESOURCE_LABELS: Record<string, string> = {
  // Usuarios & Accesos
  Usuario: 'Usuarios',
  Role: 'Roles',

  // Catálogo & Ventas
  Producto: 'Productos',
  ProductoImagen: 'Imágenes de Productos',
  Marca: 'Marcas',
  Categoria: 'Categorías',
  Orden: 'Pedidos',
  Slider: 'Banners',

  // Cursos & Lecciones
  Curso: 'Cursos',
  Leccion: 'Lecciones',
  Modulo: 'Módulos',
  Inscripcion: 'Inscripciones',

  // Sistema
  Direccion: 'Direcciones',

  // Otros
  Carrito: 'Carritos',
  ItemCarrito: 'Items Carrito',
  LeccionTipoConfig: 'Config. Lecciones',
  Resena: 'Reseñas',
};
