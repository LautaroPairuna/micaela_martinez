// Configuración de filtros dinámicos por tabla
import { LucideIcon } from 'lucide-react'
import {
  DollarSign, Package, Tag, Folder, FolderOpen, CheckCircle,
  User, Mail, MapPin, Star, FileText,
  BookOpen, GraduationCap, Award, ShoppingCart, CreditCard
} from 'lucide-react'

export interface FilterField {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'hierarchical_select' | 'date' | 'range'
  icon?: LucideIcon
  placeholder?: string
  options?: { value: string | number; label: string }[]
  fkTable?: string // Para selects de foreign keys
  min?: number
  max?: number
}

export interface TableFilterConfig {
  [tableName: string]: FilterField[]
}

export const FILTER_CONFIG: TableFilterConfig = {
  // Productos (corregido nombre de tabla)
  Producto: [
    {
      key: 'marcaId',
      label: 'Marca',
      type: 'select',
      icon: Tag,
      fkTable: 'Marca'
    },
    {
      key: 'categoriaId',
      label: 'Categoría',
      type: 'select',
      icon: Folder,
      fkTable: 'Categoria'
    },
    {
      key: 'precioMin',
      label: 'Precio mínimo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Precio mínimo',
      min: 0
    },
    {
      key: 'precioMax',
      label: 'Precio máximo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Precio máximo',
      min: 0
    },
    {
      key: 'stockMin',
      label: 'Stock mínimo',
      type: 'number',
      icon: Package,
      placeholder: 'Stock mínimo',
      min: 0
    },
    {
      key: 'stockMax',
      label: 'Stock máximo',
      type: 'number',
      icon: Package,
      placeholder: 'Stock máximo',
      min: 0
    },
    {
      key: 'publicado',
      label: 'Publicado',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'destacado',
      label: 'Destacado',
      type: 'boolean',
      icon: Star
    }
  ],

  // Marca
  Marca: [
    {
      key: 'activa',
      label: 'Marca activa',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'nombre',
      label: 'Nombre',
      type: 'text',
      icon: Tag,
      placeholder: 'Buscar por nombre'
    }
  ],

  // Categoria
  Categoria: [
    {
      key: 'activa',
      label: 'Categoría activa',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'parentId',
      label: 'Categoría padre',
      type: 'hierarchical_select',
      icon: Folder,
      fkTable: 'Categoria',
      placeholder: 'Seleccionar categoría padre'
    },
    {
      key: 'esHija',
      label: 'Solo categorías hijas',
      type: 'boolean',
      icon: Folder
    },
    {
      key: 'esPadre',
      label: 'Solo categorías padre',
      type: 'boolean',
      icon: FolderOpen
    },
    {
      key: 'nombre',
      label: 'Nombre',
      type: 'text',
      icon: Tag,
      placeholder: 'Buscar por nombre'
    }
  ],

  // Usuarios
  Usuario: [
    {
      key: 'activo',
      label: 'Usuario activo',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'emailVerificadoEn',
      label: 'Email verificado',
      type: 'boolean',
      icon: Mail
    },
    {
      key: 'rol',
      label: 'Rol',
      type: 'select',
      icon: User,
      options: [
        { value: 'USER', label: 'Usuario' },
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'STAFF', label: 'Staff' }
      ]
    }
  ],

  // Role
  Role: [
    {
      key: 'name',
      label: 'Nombre del rol',
      type: 'text',
      icon: User,
      placeholder: 'Buscar por nombre'
    },
    {
      key: 'slug',
      label: 'Slug',
      type: 'text',
      icon: Tag,
      placeholder: 'Buscar por slug'
    }
  ],

  // Cursos
  Curso: [
    {
      key: 'publicado',
      label: 'Curso publicado',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'destacado',
      label: 'Curso destacado',
      type: 'boolean',
      icon: Star
    },
    {
      key: 'instructorId',
      label: 'Instructor',
      type: 'select',
      icon: User,
      fkTable: 'Usuario'
    },
    {
      key: 'precioMin',
      label: 'Precio mínimo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Precio mínimo',
      min: 0
    },
    {
      key: 'precioMax',
      label: 'Precio máximo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Precio máximo',
      min: 0
    },
    {
      key: 'nivel',
      label: 'Nivel',
      type: 'select',
      icon: GraduationCap,
      options: [
        { value: 'BASICO', label: 'Básico' },
        { value: 'INTERMEDIO', label: 'Intermedio' },
        { value: 'AVANZADO', label: 'Avanzado' }
      ]
    }
  ],

  // ItemOrden
  ItemOrden: [
    {
      key: 'ordenId',
      label: 'Orden',
      type: 'select',
      icon: ShoppingCart,
      fkTable: 'Orden'
    },
    {
      key: 'tipo',
      label: 'Tipo de item',
      type: 'select',
      icon: Package,
      options: [
        { value: 'PRODUCTO', label: 'Producto' },
        { value: 'CURSO', label: 'Curso' }
      ]
    },
    {
      key: 'precioMin',
      label: 'Precio mínimo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Precio mínimo',
      min: 0
    },
    {
      key: 'precioMax',
      label: 'Precio máximo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Precio máximo',
      min: 0
    }
  ],

  // Órdenes
  Orden: [
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      icon: ShoppingCart,
      options: [
        { value: 'PENDIENTE', label: 'Pendiente' },
        { value: 'PROCESANDO', label: 'Procesando' },
        { value: 'ENVIADO', label: 'Enviado' },
        { value: 'ENTREGADO', label: 'Entregado' },
        { value: 'CANCELADO', label: 'Cancelado' }
      ]
    },
    {
      key: 'metodoPago',
      label: 'Método de pago',
      type: 'select',
      icon: CreditCard,
      options: [
        { value: 'TARJETA', label: 'Tarjeta' },
        { value: 'TRANSFERENCIA', label: 'Transferencia' },
        { value: 'EFECTIVO', label: 'Efectivo' }
      ]
    },
    {
      key: 'totalMin',
      label: 'Total mínimo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Total mínimo',
      min: 0
    },
    {
      key: 'totalMax',
      label: 'Total máximo',
      type: 'number',
      icon: DollarSign,
      placeholder: 'Total máximo',
      min: 0
    }
  ],

  // Direccion
  Direccion: [
    {
      key: 'usuarioId',
      label: 'Usuario',
      type: 'select',
      icon: User,
      fkTable: 'Usuario'
    },
    {
      key: 'predeterminada',
      label: 'Dirección predeterminada',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'provincia',
      label: 'Provincia',
      type: 'text',
      icon: MapPin,
      placeholder: 'Buscar por provincia'
    },
    {
      key: 'ciudad',
      label: 'Ciudad',
      type: 'text',
      icon: MapPin,
      placeholder: 'Buscar por ciudad'
    },
    {
      key: 'pais',
      label: 'País',
      type: 'select',
      icon: MapPin,
      options: [
        { value: 'AR', label: 'Argentina' },
        { value: 'UY', label: 'Uruguay' },
        { value: 'CL', label: 'Chile' },
        { value: 'BR', label: 'Brasil' }
      ]
    }
  ],

  // Inscripciones
  Inscripcion: [
    {
      key: 'estado',
      label: 'Estado',
      type: 'select',
      icon: BookOpen,
      options: [
        { value: 'ACTIVA', label: 'Activa' },
        { value: 'COMPLETADA', label: 'Completada' },
        { value: 'CANCELADA', label: 'Cancelada' },
        { value: 'SUSPENDIDA', label: 'Suspendida' }
      ]
    },
    {
      key: 'progreso',
      label: 'Progreso mínimo (%)',
      type: 'number',
      icon: Award,
      placeholder: 'Progreso mínimo',
      min: 0,
      max: 100
    }
  ],

  // Módulos
  Modulo: [
    {
      key: 'activo',
      label: 'Módulo activo',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'cursoId',
      label: 'Curso',
      type: 'select',
      icon: BookOpen,
      fkTable: 'Curso'
    }
  ],

  // Lecciones
  Leccion: [
    {
      key: 'activo',
      label: 'Lección activa',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'moduloId',
      label: 'Módulo',
      type: 'select',
      icon: FileText,
      fkTable: 'Modulo'
    },
    {
      key: 'tipo',
      label: 'Tipo de lección',
      type: 'select',
      icon: FileText,
      options: [
        { value: 'VIDEO', label: 'Video' },
        { value: 'TEXTO', label: 'Texto' },
        { value: 'QUIZ', label: 'Quiz' },
        { value: 'EJERCICIO', label: 'Ejercicio' }
      ]
    }
  ],

  // Reseñas
  Resena: [
    {
      key: 'calificacion',
      label: 'Calificación mínima',
      type: 'number',
      icon: Star,
      placeholder: 'Calificación mínima',
      min: 1,
      max: 5
    },
    {
      key: 'verificada',
      label: 'Reseña verificada',
      type: 'boolean',
      icon: CheckCircle
    }
  ],

  // ResenaRespuesta - Filtros jerárquicos
  ResenaRespuesta: [
    {
      key: 'resenaId',
      label: 'Reseña',
      type: 'select',
      icon: FileText,
      fkTable: 'Resena'
    },
    {
      key: 'usuarioId',
      label: 'Usuario',
      type: 'select',
      icon: User,
      fkTable: 'Usuario'
    },
    {
      key: 'parentId',
      label: 'Respuesta padre',
      type: 'hierarchical_select',
      icon: FileText,
      fkTable: 'ResenaRespuesta',
      placeholder: 'Seleccionar respuesta padre'
    },
    {
      key: 'esHijo',
      label: 'Solo respuestas hijas',
      type: 'boolean',
      icon: FileText
    },
    {
      key: 'esPadre',
      label: 'Solo respuestas padre',
      type: 'boolean',
      icon: FileText
    },
    {
      key: 'eliminado',
      label: 'Eliminado',
      type: 'boolean',
      icon: CheckCircle
    }
  ],

  // ProductoImagen
  ProductoImagen: [
    {
      key: 'productoId',
      label: 'Producto',
      type: 'select',
      icon: Package,
      fkTable: 'Producto'
    },
    {
      key: 'orden',
      label: 'Orden mínimo',
      type: 'number',
      icon: Tag,
      placeholder: 'Orden mínimo',
      min: 0
    }
  ],

  // Favorito
  Favorito: [
    {
      key: 'usuarioId',
      label: 'Usuario',
      type: 'select',
      icon: User,
      fkTable: 'Usuario'
    },
    {
      key: 'productoId',
      label: 'Producto',
      type: 'select',
      icon: Package,
      fkTable: 'Producto'
    }
  ],

  // Slider
  Slider: [
    {
      key: 'activa',
      label: 'Imagen activa',
      type: 'boolean',
      icon: CheckCircle
    },
    {
      key: 'orden',
      label: 'Orden mínimo',
      type: 'number',
      icon: Tag,
      placeholder: 'Orden mínimo',
      min: 0
    },
    {
      key: 'titulo',
      label: 'Título',
      type: 'text',
      icon: FileText,
      placeholder: 'Buscar por título'
    }
  ],

  // Notificaciones
  Notificacion: [
    {
      key: 'leida',
      label: 'Leída',
      type: 'boolean',
      icon: Mail
    },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      icon: FileText,
      options: [
        { value: 'INFO', label: 'Información' },
        { value: 'WARNING', label: 'Advertencia' },
        { value: 'ERROR', label: 'Error' },
        { value: 'SUCCESS', label: 'Éxito' }
      ]
    }
  ]
}

// Función para obtener los filtros de una tabla
export function getTableFilters(tableName: string): FilterField[] {
  return FILTER_CONFIG[tableName] || []
}

// Función para verificar si una tabla tiene filtros configurados
export function hasTableFilters(tableName: string): boolean {
  return tableName in FILTER_CONFIG && FILTER_CONFIG[tableName].length > 0
}