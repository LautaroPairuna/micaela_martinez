export type FieldDefinition = {
  label?: string;
  help?: string;
  placeholder?: string;
  showInList?: boolean;
  showInForm?: boolean;
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
      label: 'URL Vista Previa',
      showInList: false,
      help: 'URL pública para previsualización.',
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
    },
  },
  Curso: {
    slug: { label: 'Slug (URL)', help: 'Identificador único para la URL.' },
    titulo: { label: 'Título del Curso' },
    resumen: { label: 'Resumen Corto', showInList: false },
    descripcionMD: {
      label: 'Descripción Completa (Markdown)',
      showInList: false,
    },
    precio: { label: 'Precio', help: 'Precio actual del curso.' },
    publicado: { label: '¿Publicado?', help: 'Visible para los usuarios.' },
    nivel: { label: 'Nivel', help: 'Básico, Intermedio o Avanzado.' },
    portada: { label: 'Imagen de Portada' },
    destacado: {
      label: '¿Destacado?',
      help: 'Aparece en secciones principales.',
    },
    instructorId: { label: 'Instructor' },
    ratingProm: { label: 'Rating Promedio' },
    ratingConteo: { label: 'Total Reseñas' },
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
    slug: { label: 'Slug (URL)' },
    titulo: { label: 'Nombre del Producto' },
    precio: { label: 'Precio' },
    stock: { label: 'Stock Disponible' },
    publicado: { label: '¿Publicado?' },
    destacado: { label: '¿Destacado?' },
    imagen: { label: 'Imagen Principal' },
    marcaId: { label: 'Marca' },
    categoriaId: { label: 'Categoría' },
    precioLista: {
      label: 'Precio de Lista (Tachado)',
      help: 'Precio original antes de descuento.',
    },
  },
  Marca: {
    nombre: { label: 'Nombre de Marca' },
    imagen: { label: 'Logo' },
    activa: { label: '¿Activa?' },
  },
  Categoria: {
    nombre: { label: 'Nombre Categoría' },
    descripcion: { label: 'Descripción' },
    parentId: { label: 'Categoría Padre' },
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
    titulo: { label: 'Título Principal' },
    archivo: { label: 'Imagen Banner' },
    activa: { label: '¿Visible?' },
    orden: { label: 'Orden Visualización' },
    ctaPrimarioTexto: { label: 'Texto Botón 1' },
    ctaPrimarioHref: { label: 'Enlace Botón 1' },
  },
  Notificacion: {
    usuarioId: { label: 'Destinatario' },
    tipo: { label: 'Tipo Evento' },
    titulo: { label: 'Título' },
    mensaje: { label: 'Contenido' },
    leida: { label: '¿Leída?' },
  },
};
