/**
 * Utilidad para obtener el foreign key correcto entre tablas padre-hijo
 * Mantiene la misma lógica que guessFK en ResourceDetailClient
 * Actualizado según el esquema de Prisma real con soporte mejorado para filtros jerárquicos
 */

// Entidades que soportan relaciones jerárquicas (auto-referencia con parent_id)
export const HIERARCHICAL_ENTITIES = new Set(['Modulo', 'Categoria', 'ResenaRespuesta']);

/**
 * Verifica si una entidad soporta filtros jerárquicos
 */
export const isHierarchicalEntity = (tableName: string): boolean => {
  return HIERARCHICAL_ENTITIES.has(tableName);
};

/**
 * Obtiene el foreign key para filtros jerárquicos (parentId en Prisma)
 */
export const getHierarchicalForeignKey = (tableName: string): string | null => {
  return isHierarchicalEntity(tableName) ? 'parentId' : null;
};

/**
 * Convierte una clave snake_case a camelCase (pensado para FKs)
 */
function snakeToCamelFK(key: string): string {
  if (!key) return key
  if (!key.includes('_')) return key
  return key
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/Id$/, 'Id') // asegurar sufijo correcto
}

export const getForeignKey = (childTable: string, parentTable: string): string => {
  // Validación de parámetros
  if (!childTable || !parentTable) {
    throw new Error('childTable y parentTable son requeridos');
  }

  // Manejo especial para relaciones jerárquicas (auto-referencia)
  if (childTable === parentTable && isHierarchicalEntity(childTable)) {
    return 'parentId';
  }

  // Mapeo dinámico basado en la relación padre-hijo específica según schema.prisma
  const relationshipMap: Record<string, Record<string, string>> = {
    Curso: {
      Modulo: 'cursoId',        // modulo.curso_id -> curso.id
      Inscripcion: 'cursoId',   // inscripcion.curso_id -> curso.id
      Resena: 'cursoId',        // resena.curso_id -> curso.id
      ResenaBorrador: 'cursoId' // resena_borrador.curso_id -> curso.id
    },
    Usuario: {
      Inscripcion: 'usuarioId',              // inscripcion.usuario_id -> usuario.id
      Direccion: 'usuarioId',                // direccion.usuario_id -> usuario.id
      Favorito: 'usuarioId',                 // favorito.usuario_id -> usuario.id
      Resena: 'usuarioId',                   // resena.usuario_id -> usuario.id
      Notificacion: 'usuarioId',             // notificacion.usuario_id -> usuario.id
      ResenaBorrador: 'usuarioId',           // resena_borrador.usuario_id -> usuario.id
      ResenaLike: 'usuarioId',               // resena_like.usuario_id -> usuario.id
      ResenaRespuesta: 'usuarioId',          // resena_respuesta.usuario_id -> usuario.id
      PreferenciasNotificacion: 'usuarioId', // preferencias_notificacion.usuario_id -> usuario.id
      UsuarioRol: 'usuarioId',               // usuario_rol.usuario_id -> usuario.id
      Orden: 'usuarioId',                    // orden.usuario_id -> usuario.id
      PagoSuscripcion: 'usuarioId',          // pagos_suscripciones.usuario_id -> usuario.id
      AuditLog: 'userId'                     // audit_log.user_id -> usuario.id (excepción)
    },
    Producto: {
      ProductoImagen: 'productoId',          // producto_imagen.producto_id -> producto.id
      Favorito: 'productoId',                // favorito.producto_id -> producto.id
      ResenaBorrador: 'productoId'           // resena_borrador.producto_id -> producto.id
    },
    Modulo: {
      Leccion: 'moduloId',                   // leccion.modulo_id -> modulo.id
      Modulo: 'parentId'                     // modulo.parent_id -> modulo.id (auto-referencia)
    },
    Orden: {
      ItemOrden: 'ordenId',                  // item_orden.orden_id -> orden.id
      PagoSuscripcion: 'ordenId'             // pagos_suscripciones.orden_id -> orden.id
    },
    Resena: {
      ResenaLike: 'resenaId',                // resena_like.resena_id -> resena.id
      ResenaRespuesta: 'resenaId'            // resena_respuesta.resena_id -> resena.id
    },
    Categoria: {
      Producto: 'categoriaId',               // producto.categoria_id -> categoria.id
      Categoria: 'parentId'                  // categoria.parent_id -> categoria.id (auto-referencia)
    },
    Marca: {
      Producto: 'marcaId'                    // producto.marca_id -> marca.id
    },
    Direccion: {
      Orden: 'direccionEnvioId'             // orden.direccion_envio_id -> direccion.id (una de las relaciones)
    },
    Role: {
      UsuarioRol: 'roleId'                   // usuario_rol.role_id -> role.id
    },
    ResenaRespuesta: {
      ResenaRespuesta: 'parentId'            // resena_respuesta.parent_id -> resena_respuesta.id (auto-referencia)
    }
  }
  
  // Buscar la relación específica
  if (relationshipMap[parentTable] && relationshipMap[parentTable][childTable]) {
    return relationshipMap[parentTable][childTable];
  }
  
  // Fallback: generar FK basado en convención camelCase (desde nombre del padre)
  const parentLower = parentTable.replace(/s$/, '')
  const fallbackSnake = `${parentLower.toLowerCase()}_id`
  const fallbackKey = snakeToCamelFK(fallbackSnake)
  
  // Log para debugging en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.warn(`getForeignKey: Usando fallback '${fallbackKey}' para ${childTable} -> ${parentTable}`);
  }
  
  return fallbackKey;
};