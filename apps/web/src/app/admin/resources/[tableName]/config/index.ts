// Configuración de foreign keys para FkSelect
export const fkConfig = {
  // Productos
  marca_id: {
    resource: 'Marca',
    labelKey: 'nombre',
    fieldLabel: 'Marca'
  },
  rubro_id: {
    resource: 'Rubro',
    labelKey: 'nombre',
    fieldLabel: 'Rubro'
  },
  categoria_id: {
    resource: 'Categoria',
    labelKey: 'nombre',
    fieldLabel: 'Categoría'
  },

  // Cursos
  curso_id: {
    resource: 'Curso',
    labelKey: 'titulo',
    fieldLabel: 'Curso'
  },

  // Módulos
  modulo_id: {
    resource: 'Modulo',
    labelKey: 'titulo',
    fieldLabel: 'Módulo'
  },

  // Usuarios
  usuario_id: {
    resource: 'Usuario',
    labelKey: 'email',
    fieldLabel: 'Usuario'
  },

  // Productos
  producto_id: {
    resource: 'Producto',
    labelKey: 'nombre',
    fieldLabel: 'Producto'
  },

  // Órdenes y otros
  orden_id: {
    resource: 'Orden',
    labelKey: 'id',
    fieldLabel: 'Orden'
  }
}

// Re-exportar configuración de filtros
export * from './filterConfig'