import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxy } from '../../../_proxy';

/**
 * Endpoint batch para obtener múltiples conteos de tablas hijas
 * Optimiza las solicitudes múltiples en una sola llamada
 */

interface BatchCountRequest {
  requests: Array<{
    parentTable: string;
    parentId: string | number;
    childTable: string;
    foreignKey: string;
    directChildrenOnly?: boolean;
  }>;
}

interface BatchCountResponse {
  counts: Record<string, Record<string, number>>; // parentId -> childTable -> count
  errors?: Array<{
    parentId: string | number;
    childTable: string;
    error: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const jar = await cookies();
    const token = jar.get('mp_session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado - Token requerido' },
        { status: 401 }
      );
    }

    const body: BatchCountRequest = await request.json();
    
    if (!body.requests || !Array.isArray(body.requests)) {
      return NextResponse.json(
        { error: 'Se requiere un array de requests' },
        { status: 400 }
      );
    }

    console.log(`🔄 [Batch Counts] Processing ${body.requests.length} count requests - OPTIMIZED MODE`);
    console.log(`📊 [PERFORMANCE] Usando consultas optimizadas de solo conteo`);

    // Agrupar requests por tabla hija para optimizar
    const requestsByChildTable = body.requests.reduce((acc, req) => {
      if (!acc[req.childTable]) {
        acc[req.childTable] = [];
      }
      acc[req.childTable].push(req);
      return acc;
    }, {} as Record<string, typeof body.requests>);
    
    console.log(`🔍 [DEBUG] Tablas a procesar: ${Object.keys(requestsByChildTable).join(', ')}`);
    console.log(`🔍 [DEBUG] Total de consultas agrupadas: ${Object.values(requestsByChildTable).flat().length}`);

    const result: BatchCountResponse = {
      counts: {},
      errors: []
    };

    // Procesar cada tabla hija
    for (const [childTable, requests] of Object.entries(requestsByChildTable)) {
      try {
        // Saltamos la optimización de filtros OR y vamos directamente a conteos individuales
        // ya que necesitamos conteos específicos por cada padre
        console.log(`🔍 [DEBUG] Batch Counts - Procesando ${requests.length} solicitudes individuales para ${childTable}`);
        
        // Inicializamos los conteos para esta tabla
        requests.forEach(req => {
          if (!result.counts[req.parentId]) {
            result.counts[req.parentId] = {};
          }
          // Inicializamos con 0 y luego actualizaremos
          result.counts[req.parentId][req.childTable] = 0;
        });

        // Vamos directamente a hacer solicitudes individuales para cada parent
          const countPromises = requests.map(async (req) => {
            try {
              // Verificar tipo de parentId y convertir a string si es necesario
              const parentIdValue = typeof req.parentId === 'number' ? String(req.parentId) : req.parentId;
              
              console.log(`🔍 [DEBUG] Individual Count - ParentId: ${req.parentId}, Tipo: ${typeof req.parentId}, ChildTable: ${childTable}`);
              
              // Optimizamos para usar el endpoint records con parámetros específicos para conteo
              const countParams = new URLSearchParams({
                // Solo necesitamos el filtro por clave foránea para contar hijos directos
                filters: JSON.stringify({ 
                  [req.foreignKey]: parentIdValue
                }),
                // Parámetros para optimizar la consulta (solo conteo)
                countOnly: 'true',
                // Eliminamos parámetros innecesarios que podrían traer datos
                _skipPagination: 'true',
                _countOnly: 'true'
              });
              
              console.log(`🔍 [DEBUG] Count Optimized - ParentId: ${parentIdValue}, ChildTable: ${childTable}, Params:`, countParams.toString());

              // Crear un nuevo NextRequest para el proxy que solo cuenta
              const countUrl = new URL(`/api/admin/tables/${childTable}/records?${countParams}`, request.url);
              const countRequest = new NextRequest(countUrl, {
                method: 'GET',
                headers: request.headers
              });

              // Llamamos al endpoint records con parámetro countOnly para optimizar
              const individualResponse = await proxy(countRequest, `/admin/tables/${childTable}/records?${countParams}`);
              
              if (individualResponse.ok) {
                const responseData = await individualResponse.json();
                
                // Extraer el conteo de la respuesta optimizada
                let count = 0;
                
                // La respuesta puede venir en diferentes formatos según el endpoint
                if (typeof responseData === 'number') {
                  // Respuesta directa como número
                  count = responseData;
                } else if (responseData.count !== undefined) {
                  // Respuesta con campo count explícito
                  count = responseData.count;
                } else if (responseData.total !== undefined) {
                  // Respuesta con campo total (común en endpoints paginados)
                  count = responseData.total;
                } else if (responseData.meta?.total !== undefined) {
                  // Respuesta con metadatos de paginación
                  count = responseData.meta.total;
                }
                
                // Asegurar que el parentId se use consistentemente como clave
                const parentIdKey = String(req.parentId);
                
                if (!result.counts[parentIdKey]) {
                  result.counts[parentIdKey] = {};
                }
                result.counts[parentIdKey][req.childTable] = count;
                
                console.log(`✅ [DEBUG] Conteo optimizado - ParentId: ${parentIdKey}, ChildTable: ${req.childTable}, Count: ${count}`);
              } else {
                console.error(`❌ [ERROR] Fallo en consulta de conteo - ParentId: ${req.parentId}, ChildTable: ${req.childTable}, Status: ${individualResponse.status}`);
                
                // Manejo específico según el código de error
                let errorMessage = `Error de conteo: ${individualResponse.statusText}`;
                
                if (individualResponse.status === 404) {
                  errorMessage = `Tabla ${req.childTable} no encontrada`;
                } else if (individualResponse.status === 400) {
                  errorMessage = `Parámetros de filtro inválidos para ${req.childTable}`;
                } else if (individualResponse.status === 401 || individualResponse.status === 403) {
                  errorMessage = `Sin permisos para acceder a ${req.childTable}`;
                } else if (individualResponse.status >= 500) {
                  errorMessage = `Error del servidor al contar registros en ${req.childTable}`;
                }
                
                result.errors?.push({
                  parentId: req.parentId,
                  childTable: req.childTable,
                  error: errorMessage
                });
                
                // Inicializamos con 0 para evitar errores en el frontend
                const parentIdKey = String(req.parentId);
                if (!result.counts[parentIdKey]) {
                  result.counts[parentIdKey] = {};
                }
                result.counts[parentIdKey][req.childTable] = 0;
              }
            } catch (error) {
              console.error(`❌ [ERROR] Excepción en consulta de conteo - ParentId: ${req.parentId}, ChildTable: ${req.childTable}`, error);
              
              result.errors?.push({
                parentId: req.parentId,
                childTable: req.childTable,
                error: `Error al procesar conteo: ${error instanceof Error ? error.message : String(error)}`
              });
              
              // Inicializamos con 0 para evitar errores en el frontend
              const parentIdKey = String(req.parentId);
              if (!result.counts[parentIdKey]) {
                result.counts[parentIdKey] = {};
              }
              result.counts[parentIdKey][req.childTable] = 0;
            }
          });

          await Promise.allSettled(countPromises);

      } catch (error) {
        console.error(`Error processing ${childTable}:`, error);
        requests.forEach(req => {
          result.errors?.push({
            parentId: req.parentId,
            childTable: req.childTable,
            error: `Processing error: ${error}`
          });
        });
      }
    }

    console.log(`✅ [Batch Counts] Completed with ${Object.keys(result.counts).length} parent records`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Batch Counts] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}