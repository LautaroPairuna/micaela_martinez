/**
 * Utilidad para obtener el foreign key correcto entre tablas padre-hijo
 * Mantiene la misma lógica que guessFK en ResourceDetailClient
 */
export const getForeignKey = (childTable: string, parentTable: string): string => {
  // Mapeo dinámico basado en la relación padre-hijo específica
  const relationshipMap: Record<string, Record<string, string>> = {
    Curso: {
      Modulo: 'cursoId',
      Inscripcion: 'cursoId',
      Resena: 'cursoId'
    },
    Usuario: {
      Inscripcion: 'usuarioId',
      Direccion: 'usuarioId',
      Favorito: 'usuarioId',
      Resena: 'usuarioId',
      Notificacion: 'usuarioId',
      ResenaBorrador: 'usuarioId'
    },
    Producto: {
      ProductoFotos: 'producto_id',
      ProductoVersiones: 'producto_id',
      ProductoEspecificaciones: 'producto_id',
      ProductoImagen: 'productoId'
    },
    Modulo: {
      Leccion: 'moduloId'
    },
    Orden: {
      ItemOrden: 'ordenId'
    },
    Resena: {
      ResenaLike: 'resenaId',
      ResenaRespuesta: 'resenaId'
    }
  }
  
  // Buscar la relación específica
  if (relationshipMap[parentTable] && relationshipMap[parentTable][childTable]) {
    return relationshipMap[parentTable][childTable]
  }
  
  // Fallback: generar FK basado en convención
  const parentLower = parentTable.toLowerCase().replace(/s$/, '')
  return `${parentLower}Id`
}