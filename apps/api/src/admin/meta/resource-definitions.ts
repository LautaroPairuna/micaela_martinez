export type FieldDefinition = {
  label?: string;
  help?: string;
  placeholder?: string;
  showInList?: boolean;
  showInForm?: boolean;
  widget?: 'markdown' | 'video' | 'list' | 'json-list' | 'image' | 'date';
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
    parentId: {
      label: 'Módulo Padre',
      help: 'Si es un submódulo, selecciona el padre.',
      showInList: false,
      showInForm: false,
    },
    hijos: { showInList: false },
  },
  Curso: {
    portada: { label: 'Imagen de Portada', widget: 'image' },
    titulo: { label: 'Título del Curso' },
    slug: { label: 'Slug (URL)', help: 'Identificador único para la URL.' },
    nivel: { label: 'Nivel', help: 'Básico, Intermedio o Avanzado.' },
    precio: { label: 'Precio', help: 'Precio actual del curso.' },
    publicado: { label: '¿Publicado?', help: 'Visible para los usuarios.' },
    destacado: {
      label: '¿Destacado?',
      help: 'Aparece en secciones principales.',
    },
    ratingProm: { label: 'Rating Promedio' },
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
      showInList: true,
      widget: 'video',
    },
    requisitos: {
      label: 'Requisitos',
      help: 'Lista de requisitos (uno por línea o bullets).',
      widget: 'markdown',
      showInList: true,
    },
    descripcionMD: {
      label: 'Descripción Completa',
      showInList: true,
      widget: 'markdown',
    },
    ratingConteo: { label: 'Total Reseñas', showInList: false },
  },
  Inscripcion: {
    usuarioId: { label: 'Usuario' },
    cursoId: { label: 'Curso' },
    estado: { label: 'Estado' },
    progreso: { label: 'Progreso (%)', showInList: false },
  },

  // ─────────────────────────────────────────────────────────────
  // 🛍️ Tienda y Productos
  // ─────────────────────────────────────────────────────────────
  Producto: {
    imagen: { label: 'Imagen Principal' },
    titulo: { label: 'Nombre del Producto' },
    slug: { label: 'Slug (URL)' },
    precio: { label: 'Precio' },
    stock: { label: 'Stock Disponible' },
    marcaId: { label: 'Marca' },
    categoriaId: { label: 'Categoría' },
    publicado: { label: '¿Publicado?' },
    destacado: { label: '¿Destacado?' },
    precioLista: {
      label: 'Precio de Lista (Tachado)',
      help: 'Precio original antes de descuento.',
    },
    descripcionMD: {
      label: 'Descripción Completa (MD)',
      widget: 'markdown',
      showInList: false,
    },
  },
  Marca: {
    nombre: { label: 'Nombre de Marca' },
    imagen: { label: 'Logo', showInList: false, showInForm: false },
    activa: { label: '¿Activa?' },
    orden: { label: 'Orden', showInList: false, showInForm: false },
  },
  Categoria: {
    nombre: { label: 'Nombre Categoría' },
    descripcion: { label: 'Descripción' },
    parentId: {
      label: 'Categoría Padre',
      showInList: false,
      showInForm: false,
    },
    hijos: { showInList: false },
  },
  Orden: {
    usuarioId: { label: 'Cliente' },
    estado: { label: 'Estado Orden' },
    total: { label: 'Total a Pagar' },
    referenciaPago: { label: 'Ref. Pago', help: 'ID de transacción externa.' },
    esSuscripcion: { label: '¿Es Suscripción?' },
    direccionEnvioId: { label: 'Dirección Envío', showInList: false },
    direccionFacturacionId: {
      label: 'Dirección Facturación',
      showInList: false,
    },
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
