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
  cursoId: {
    resource: 'Curso',
    labelKey: 'titulo',
    fieldLabel: 'Curso'
  },

  // Módulos
  moduloId: {
    resource: 'Modulo',
    labelKey: 'titulo',
    fieldLabel: 'Módulo'
  },

  // Usuarios
  usuarioId: {
    resource: 'Usuario',
    labelKey: 'email',
    fieldLabel: 'Usuario'
  },

  // Órdenes
  usuario_id: {
    resource: 'Usuario',
    labelKey: 'email',
    fieldLabel: 'Usuario'
  },

  // Inscripciones
  curso_id: {
    resource: 'Curso',
    labelKey: 'titulo',
    fieldLabel: 'Curso'
  }
}

// Re-exportar configuración de filtros
export * from './filterConfig'