import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { HierarchicalDetectorService } from './utils/hierarchical-detector.service';
import { AuditService } from './audit.service';
import { ActivityType, ActivitySource } from './activity.dto';
import { WebsocketGateway } from '../websockets/websocket.gateway';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private hierarchicalDetector: HierarchicalDetectorService,
    private auditService: AuditService,
    private websocketGateway: WebsocketGateway,
    private cacheService: CacheService,
  ) {}

  /**
   * Intenta convertir el ID proveniente de la URL al tipo correcto.
   * La mayoría de los modelos usan ID numérico (Int). Si el valor es
   * numérico, se retorna como Number; de lo contrario, se deja como string.
   */
  private coerceId(_resource: string, id: string): number | string {
    if (id === undefined || id === null) return id as any;
    const n = Number(id);
    return Number.isFinite(n) ? n : id;
  }

  /**
   * Normaliza el payload de entrada convirtiendo strings numéricos a números
   * y la cadena 'null' a valor null. Se aplica de forma superficial para evitar
   * conversiones inesperadas en objetos anidados complejos.
   */
  private normalizeDataInput<T = any>(data: T): T {
    if (!data || typeof data !== 'object') return data;
    const normalized: Record<string, any> = Array.isArray(data) ? [] : {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (typeof value === 'string') {
        if (value === 'null') {
          normalized[key] = null;
          continue;
        }
        const maybeNum = Number(value);
        if (value.trim() !== '' && Number.isFinite(maybeNum)) {
          normalized[key] = maybeNum;
        } else {
          normalized[key] = value;
        }
      } else {
        normalized[key] = value;
      }
    }
    return normalized as T;
  }

  // Mapeo de nombres de recursos a modelos de Prisma
  private getModel(resource: string) {
    const modelMap: Record<string, any> = {
      Usuario: this.prisma.usuario,
      Role: this.prisma.role,
      UsuarioRol: this.prisma.usuarioRol,
      Marca: this.prisma.marca,
      Categoria: this.prisma.categoria,
      Producto: this.prisma.producto,
      ProductoImagen: this.prisma.productoImagen,
      Curso: this.prisma.curso,
      Modulo: this.prisma.modulo,
      Leccion: this.prisma.leccion,
      Inscripcion: this.prisma.inscripcion,
      Orden: this.prisma.orden,
      ItemOrden: this.prisma.itemOrden,
      Direccion: this.prisma.direccion,
      Slider: this.prisma.slider,
      Resena: this.prisma.resena,
      ResenaLike: this.prisma.resenaLike,
      ResenaRespuesta: this.prisma.resenaRespuesta,
      Favorito: this.prisma.favorito,
      Notificacion: this.prisma.notificacion,
      PreferenciasNotificacion: this.prisma.preferenciasNotificacion,
      ResenaBorrador: this.prisma.resenaBorrador,
    };

    const model = modelMap[resource];
    if (!model) {
      throw new BadRequestException(`Recurso '${resource}' no encontrado`);
    }
    return model;
  }

  // Obtener estadísticas del dashboard
  async getDashboardStats() {
    try {
      const [usuarios, cursos, productos, ordenes, resenas] = await Promise.all(
        [
          this.prisma.usuario.count(),
          this.prisma.curso.count(),
          this.prisma.producto.count(),
          this.prisma.orden.count(),
          this.prisma.resena.count(),
        ],
      );

      // Obtener actividad reciente (últimos 10 registros)
      const [recentUsers, recentCourses, recentProducts, recentEnrollments] =
        await Promise.all([
          this.prisma.usuario.findMany({
            take: 3,
            orderBy: { creadoEn: 'desc' },
            select: { id: true, nombre: true, email: true, creadoEn: true },
          }),
          this.prisma.curso.findMany({
            take: 3,
            orderBy: { creadoEn: 'desc' },
            select: { id: true, titulo: true, creadoEn: true },
          }),
          this.prisma.producto.findMany({
            take: 3,
            orderBy: { creadoEn: 'desc' },
            select: { id: true, titulo: true, creadoEn: true },
          }),
          this.prisma.inscripcion.findMany({
            take: 3,
            orderBy: { creadoEn: 'desc' },
            include: {
              usuario: { select: { nombre: true, email: true } },
              curso: { select: { titulo: true } },
            },
          }),
        ]);

      // Calcular ingresos del mes actual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Calcular ingresos totales de órdenes pagadas
      const totalRevenue = await this.prisma.orden.aggregate({
        where: {
          estado: 'PAGADO',
        },
        _sum: {
          total: true,
        },
      });

      // Calcular ingresos del mes actual
      const monthlyRevenue = await this.prisma.orden.aggregate({
        where: {
          creadoEn: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          estado: 'PAGADO',
        },
        _sum: {
          total: true,
        },
      });

      // Contar órdenes pendientes
      const pendingOrders = await this.prisma.orden.count({
        where: {
          estado: 'PENDIENTE',
        },
      });

      return {
        totalUsers: usuarios,
        totalCourses: cursos,
        totalRevenue: totalRevenue._sum?.total || 0, // Ingresos reales de órdenes pagadas
        activeUsers: Math.floor(usuarios * 0.3), // 30% de usuarios activos estimado
        pendingOrders: pendingOrders, // Órdenes pendientes
        monthlyRevenue: [
          (monthlyRevenue._sum?.total || 0) * 0.8,
          (monthlyRevenue._sum?.total || 0) * 0.9,
          (monthlyRevenue._sum?.total || 0) * 1.1,
          (monthlyRevenue._sum?.total || 0) * 0.7,
          (monthlyRevenue._sum?.total || 0) * 1.2,
          monthlyRevenue._sum?.total || 0,
        ],
        recentActivity: await this.getRecentActivityWithAudit(
          recentUsers,
          recentCourses,
          recentProducts,
          recentEnrollments,
        ),
        tableCounts: [
          { table: 'Usuario', count: usuarios, label: 'Usuarios' },
          { table: 'Curso', count: cursos, label: 'Cursos' },
          { table: 'Producto', count: productos, label: 'Productos' },
          { table: 'Orden', count: ordenes, label: 'Órdenes' },
          { table: 'Resena', count: resenas, label: 'Reseñas' },
        ],
      };
    } catch (error) {
      throw new BadRequestException(
        `Error al obtener estadísticas del dashboard: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Obtener todos los registros de un recurso
  /**
   * Verifica si un recurso tiene relaciones padre-hijo
   */
  private hasParentChildRelation(resource: string): boolean {
    return this.hierarchicalDetector.hasParentChildRelation(resource);
  }

  /**
   * Procesa filtros jerárquicos de forma genérica para cualquier tabla con relaciones padre-hijo
   * Soporta: esHija, esPadre, nivelJerarquia, padreId
   */
  private processRegularFilters(
    filters: Record<string, any>,
    processedFilters: any,
  ): void {
    if (!filters) return;

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;

      // Validación específica para campos jerárquicos
      if (key === 'parentId' && value !== null) {
        const numericValue = Number(value);
        if (isNaN(numericValue)) {
          console.warn(`Valor inválido para parentId: ${value}, ignorando filtro`);
          continue;
        }
        processedFilters[key] = numericValue;
        continue;
      }

      // Tratar strings: igualdad para claves tipo ID/slug, contains para el resto
      if (typeof value === 'string') {
        const k = key.toLowerCase();
        const isIdLike = k === 'id' || k.endsWith('id') || k.includes('id');
        const isSlug = k === 'slug' || k.endsWith('slug');
        
        if (isIdLike || isSlug) {
          // Para campos ID, intentar conversión numérica si es apropiado
          if (isIdLike && !isNaN(Number(value))) {
            processedFilters[key] = Number(value);
          } else {
            // Igualdad exacta para evitar coincidencias parciales en FKs/IDs/slug
            processedFilters[key] = value;
          }
        } else {
          // Búsqueda parcial solo para campos de texto no identificadores
          processedFilters[key] = { contains: value };
        }
      } else if (typeof value === 'number') {
        // Para números, usar igualdad exacta
        processedFilters[key] = value;
      } else if (typeof value === 'boolean') {
        // Para booleanos, usar igualdad exacta
        processedFilters[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        // Para arrays, usar 'in' para múltiples valores
        // Validar que todos los elementos sean del tipo correcto
        const validValues = value.filter(v => v !== null && v !== undefined && v !== '');
        if (validValues.length > 0) {
          processedFilters[key] = { in: validValues };
        }
      } else if (typeof value === 'object' && value !== null) {
        // Para objetos, asumir que ya están en formato Prisma
        processedFilters[key] = value;
      }
    }
  }

  private async processHierarchicalFilters(
    resource: string,
    filters: Record<string, any>,
    processedFilters: any,
  ): Promise<void> {
    try {
      // Verificar si el recurso tiene relaciones jerárquicas
      const hierarchyInfo =
        this.hierarchicalDetector.getHierarchicalInfo(resource);
      if (!hierarchyInfo.hasHierarchy) return;

      const {
        esHija,
        esPadre,
        nivelJerarquia,
        padreId,
        _directChildrenOnly,
        _parentSpecific,
        ...otherFilters
      } = filters;
      const model = this.getModel(resource);

      // Log para depuración
      console.log(
        `🔍 [DEBUG] processHierarchicalFilters - Resource: ${resource}, Filters:`,
        JSON.stringify(filters, null, 2),
      );

      // Validación de campos jerárquicos
      if (!hierarchyInfo.parentField || !hierarchyInfo.childrenField) {
        throw new BadRequestException(
          `Configuración jerárquica incompleta para ${resource}: faltan campos parent/children`
        );
      }

      // Filtro "Es Hija" (tiene padre)
      if (esHija !== undefined) {
        const parentField = hierarchyInfo.parentField;
        if (esHija === 'true' || esHija === true) {
          processedFilters[parentField] = { not: null };
        } else if (esHija === 'false' || esHija === false) {
          processedFilters[parentField] = null;
        } else {
          throw new BadRequestException(
            `Valor inválido para filtro 'esHija': ${esHija}. Debe ser true o false`
          );
        }
      }

      // Filtro "Es Padre" (tiene hijos)
      if (esPadre !== undefined) {
        const childrenField = hierarchyInfo.childrenField;

        if (esPadre === 'true' || esPadre === true) {
          // Buscar registros que tengan al menos un hijo
          try {
            const recordsWithChildren = await model.findMany({
              where: {
                [childrenField]: {
                  some: {},
                },
              },
              select: { id: true },
            });

            const idsWithChildren = recordsWithChildren.map(
              (record: { id: any }) => record.id,
            );
            if (idsWithChildren.length > 0) {
              processedFilters.id = { in: idsWithChildren };
            } else {
              // Si no hay registros con hijos, asegurar que no se devuelva nada
              processedFilters.id = { in: [] };
            }
          } catch (dbError) {
            throw new BadRequestException(
              `Error al consultar registros padre para ${resource}: ${dbError instanceof Error ? dbError.message : String(dbError)}`
            );
          }
        } else if (esPadre === 'false' || esPadre === false) {
          // Buscar registros que NO tengan hijos
          try {
            const recordsWithChildren = await model.findMany({
              where: {
                [childrenField]: {
                  some: {},
                },
              },
              select: { id: true },
            });

            const idsWithChildren = recordsWithChildren.map(
              (record: { id: any }) => record.id,
            );
            if (idsWithChildren.length > 0) {
              processedFilters.id = { notIn: idsWithChildren };
            }
          } catch (dbError) {
            throw new BadRequestException(
              `Error al consultar registros sin hijos para ${resource}: ${dbError instanceof Error ? dbError.message : String(dbError)}`
            );
          }
        } else {
          throw new BadRequestException(
            `Valor inválido para filtro 'esPadre': ${esPadre}. Debe ser true o false`
          );
        }
      }

      // Filtro por padre específico
      if (padreId !== undefined) {
        const parentField = hierarchyInfo.parentField;
        if (padreId === null || padreId === 'null') {
          processedFilters[parentField] = null;
        } else {
          // Validar que el padreId sea un número válido
          const parentIdNum = typeof padreId === 'string' ? parseInt(padreId, 10) : padreId;
          if (isNaN(parentIdNum) || parentIdNum <= 0) {
            throw new BadRequestException(
              `ID de padre inválido: ${padreId}. Debe ser un número positivo`
            );
          }
          processedFilters[parentField] = parentIdNum;
        }
      }

    // Filtro por nivel jerárquico (0 = raíz, 1 = primer nivel, etc.)
    if (nivelJerarquia !== undefined) {
      const nivel = parseInt(nivelJerarquia.toString());
      if (isNaN(nivel) || nivel < 0) {
        throw new BadRequestException(
          `Nivel jerárquico inválido: ${nivelJerarquia}. Debe ser un número entero no negativo`
        );
      }

      try {
        if (nivel === 0) {
          // Nivel 0: elementos raíz (sin padre)
          const parentField = hierarchyInfo.parentField;
          processedFilters[parentField] = null;
        } else {
          // Para otros niveles, necesitamos una consulta más compleja
          // Por ahora, implementamos solo nivel 1 (hijos directos de raíz)
          if (nivel === 1) {
            const parentField = hierarchyInfo.parentField;
            // Buscar elementos que tengan padre pero cuyos padres no tengan padre
            const rootParents = await model.findMany({
              where: {
                [parentField]: null,
              },
              select: { id: true },
            });

            const rootIds = rootParents.map((record: { id: any }) => record.id);
            if (rootIds.length > 0) {
              processedFilters[parentField] = { in: rootIds };
            } else {
              processedFilters.id = { in: [] };
            }
          } else {
            // Para niveles > 1, por ahora no implementado
            throw new BadRequestException(
              `Filtro por nivel jerárquico ${nivel} no implementado. Solo se soportan niveles 0 y 1`
            );
          }
        }
      } catch (dbError) {
        if (dbError instanceof BadRequestException) {
          throw dbError;
        }
        throw new BadRequestException(
          `Error al procesar filtro de nivel jerárquico para ${resource}: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        );
      }
    }

    // Procesar _directChildrenOnly (solo hijos directos)
    if (_directChildrenOnly === true || _directChildrenOnly === 'true') {
      console.log(
        `🔍 [DEBUG] Aplicando filtro _directChildrenOnly para ${resource}`,
      );

      // Si también hay un filtro de productoId (o similar), es un caso de hijos directos de un padre específico
      const possibleParentFields = [
        'productoId',
        'cursoId',
        'categoriaId',
        'marcaId',
      ];
      const parentFieldInFilters = possibleParentFields.find(
        (field) => filters[field] !== undefined,
      );

      if (parentFieldInFilters) {
        console.log(
          `🔍 [DEBUG] Encontrado campo padre en filtros: ${parentFieldInFilters} = ${filters[parentFieldInFilters]}`,
        );
        // Ya tenemos el filtro por padre específico, no necesitamos hacer nada más
      } else if (padreId) {
        console.log(`🔍 [DEBUG] Usando padreId explícito: ${padreId}`);
        // Ya tenemos el filtro por padreId, no necesitamos hacer nada más
      }
    }

    // Procesar _parentSpecific (específico del padre)
    if (_parentSpecific === true || _parentSpecific === 'true') {
      console.log(
        `🔍 [DEBUG] Aplicando filtro _parentSpecific para ${resource}`,
      );

      // Este filtro ya está implícito cuando se filtra por un campo de padre específico
      // No necesitamos hacer nada adicional si ya hay un filtro de padre
    }

    // Agregar otros filtros
    Object.assign(processedFilters, otherFilters);
    } catch (error) {
      // Si es una BadRequestException, la re-lanzamos tal como está
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Para cualquier otro error, lo envolvemos en una BadRequestException
      throw new BadRequestException(
        `Error al procesar filtros jerárquicos para ${resource}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async findAll(
    resource: string,
    page = 1,
    limit = 10,
    search?: string,
    filters: any = {},
    sortBy?: string,
    sortDir?: 'asc' | 'desc',
  ) {
    // ✅ Implementar caché para consultas frecuentes
    const cacheKey = this.cacheService.generateAdminKey(
      resource,
      page,
      limit,
      search,
      filters,
      sortBy,
      sortDir,
    );

    // Intentar obtener del caché primero
    const cachedResult = this.cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const model = this.getModel(resource);
    const skip = (page - 1) * limit;

    try {
      // ✅ Optimización: Limitar logs de debug solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🔍 [DEBUG] findAll - Resource: ${resource}, Filters:`,
          JSON.stringify(filters, null, 2),
        );
      }

      // Extraer parámetros globales
      const {
        directChildrenOnly,
        _parentSpecific,
        _directChildrenOnly,
        ...regularFilters
      } = filters;

      // Procesar filtros jerárquicos genéricos
      const processedFilters = {};
      await this.processHierarchicalFilters(
        resource,
        regularFilters,
        processedFilters,
      );

      // Procesar filtros regulares (no jerárquicos)
      this.processRegularFilters(regularFilters, processedFilters);

      // Procesar filtros OR especiales
      if (regularFilters.OR && Array.isArray(regularFilters.OR)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 [DEBUG] Procesando filtros OR para ${resource}`);
        }

        // Procesar cada filtro OR individualmente
        const processedOrFilters = await Promise.all(
          regularFilters.OR.map(async (orFilter: Record<string, any>) => {
            const processed: Record<string, any> = {};
            await this.processHierarchicalFilters(
              resource,
              orFilter,
              processed,
            );
            this.processRegularFilters(orFilter, processed);
            return processed;
          }),
        );

        // Reemplazar los filtros OR originales con los procesados
        (processedFilters as Record<string, any>).OR = processedOrFilters;
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `🔍 [DEBUG] Filtros OR procesados:`,
            JSON.stringify((processedFilters as Record<string, any>).OR, null, 2),
          );
        }
      }

      // ✅ Optimización: Configurar búsqueda con índices optimizados
      let where: any = { ...processedFilters };
      if (search) {
        let searchCondition: any = {};
        switch (resource) {
          case 'Usuario':
            searchCondition = {
              OR: [
                { email: { contains: search } },
                { nombre: { contains: search } },
              ],
            };
            break;
          case 'Producto':
            // ✅ Usar búsqueda de texto completo cuando sea posible
            if (search.length > 2) {
              searchCondition = {
                OR: [
                  { titulo: { search: search } }, // Búsqueda de texto completo
                  { titulo: { contains: search } }, // Fallback para búsquedas cortas
                  { sku: { contains: search } },
                ],
              };
            } else {
              searchCondition = {
                OR: [
                  { titulo: { contains: search } },
                  { sku: { contains: search } },
                ],
              };
            }
            break;
          case 'Curso':
            searchCondition = {
              OR: [
                { titulo: { contains: search } },
                { resumen: { contains: search } },
              ],
            };
            break;
          case 'Marca':
          case 'Categoria':
            searchCondition = { nombre: { contains: search } };
            break;
          default:
            // Para otros recursos, buscar por ID si es numérico
            if (!isNaN(Number(search))) {
              searchCondition = { id: Number(search) };
            }
        }

        // Combinar filtros con búsqueda usando AND
        if (Object.keys(searchCondition).length > 0) {
          where = {
            AND: [processedFilters, searchCondition],
          };
        }
      }

      // ✅ Optimización: Configurar include selectivo para reducir datos transferidos
      let include: any = {};
      if (resource === 'Orden') {
        include = {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        };
      }

      // ✅ Optimización: Incluir solo campos necesarios para módulos
      if (resource === 'Modulo') {
        include.lecciones = {
          select: {
            id: true,
            titulo: true,
            orden: true,
            duracionS: true,
            tipo: true,
          },
          orderBy: { orden: 'asc' },
          take: 50, // ✅ Limitar número de lecciones por módulo
        };
      }

      // ✅ Optimización: Incluir relaciones jerárquicas con límites
      if (this.hasParentChildRelation(resource)) {
        const hierarchicalInfo =
          this.hierarchicalDetector.getHierarchicalInfo(resource);
        if (hierarchicalInfo.hasHierarchy && hierarchicalInfo.childrenField) {
          include[hierarchicalInfo.childrenField] = {
            select: {
              id: true,
              [hierarchicalInfo.parentField || 'parentId']: true,
              // Incluir campos de display comunes
              ...(resource === 'Categoria' && { nombre: true }),
              ...(resource === 'ResenaRespuesta' && { contenido: true }),
              ...(resource === 'Modulo' && { titulo: true, orden: true }),
            },
            take: 100, // ✅ Limitar número de hijos
          };
        }
      }

      // Configurar ordenamiento
      let orderBy: any;
      if (sortBy && sortDir) {
        orderBy = { [sortBy]: sortDir };
      } else {
        orderBy = this.getOrderBy(resource);
      }

      // ✅ Optimización: Usar transacción para consultas paralelas
      const [data, total] = await Promise.all([
        model.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include,
        }),
        model.count({ where }),
      ]);

      const result = {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      // ✅ Guardar resultado en caché (TTL: 2 minutos para datos administrativos)
      this.cacheService.set(cacheKey, result, 120000);

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Error al obtener ${resource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Obtener un registro por ID
  async findOne(resource: string, id: string) {
    const model = this.getModel(resource);

    try {
      const record = await model.findUnique({
        where: { id: this.coerceId(resource, id) },
      });

      if (!record) {
        throw new NotFoundException(`${resource} con ID ${id} no encontrado`);
      }

      return record;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Error al obtener ${resource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Crear un nuevo registro
  async create(resource: string, data: any) {
    const model = this.getModel(resource);

    try {
      const result = await model.create({
        data,
      });

      // ✅ Invalidar caché relacionado al recurso
      this.cacheService.deletePattern(`admin:${resource}:`);

      // Emitir evento WebSocket para actualización en tiempo real
      console.log(`[AdminService] Emitiendo evento WebSocket: create para ${resource}`);
      this.websocketGateway.emitToAll('crud-update', {
        action: 'create',
        resource,
        data: result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Ya existe un registro con estos datos únicos',
          );
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Referencia a registro inexistente');
        }
      }
      throw new BadRequestException(
        `Error al crear ${resource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Actualizar un registro
  async update(resource: string, id: string, data: any) {
    const model = this.getModel(resource);

    try {
      const normalized = this.normalizeDataInput(data);
      // No permitir actualizar claves primarias ni timestamps
      if (normalized && typeof normalized === 'object') {
        delete (normalized as any).id;
        delete (normalized as any).creadoEn;
        delete (normalized as any).actualizadoEn;
        delete (normalized as any).createdAt;
        delete (normalized as any).updatedAt;
      }
      
      const result = await model.update({
        where: { id: this.coerceId(resource, id) },
        data: normalized,
      });

      // ✅ Invalidar caché relacionado al recurso
      this.cacheService.deletePattern(`admin:${resource}:`);

      // Emitir evento WebSocket para actualización en tiempo real
      console.log(`[AdminService] Emitiendo evento WebSocket: update para ${resource} ID ${id}`);
      this.websocketGateway.emitToAll('crud-update', {
        action: 'update',
        resource,
        id,
        data: result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`${resource} con ID ${id} no encontrado`);
        }
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'Ya existe un registro con estos datos únicos',
          );
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Referencia a registro inexistente');
        }
      }
      throw new BadRequestException(
        `Error al actualizar ${resource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Eliminar un registro
  async remove(resource: string, id: string) {
    const model = this.getModel(resource);

    try {
      const result = await model.delete({
        where: { id: this.coerceId(resource, id) },
      });

      // ✅ Invalidar caché relacionado al recurso
      this.cacheService.deletePattern(`admin:${resource}:`);

      // Emitir evento WebSocket para actualización en tiempo real
      console.log(`[AdminService] Emitiendo evento WebSocket: delete para ${resource} ID ${id}`);
      this.websocketGateway.emitToAll('crud-update', {
        action: 'delete',
        resource,
        id,
        data: result,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`${resource} con ID ${id} no encontrado`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'No se puede eliminar: existen registros relacionados',
          );
        }
      }
      throw new BadRequestException(
        `Error al eliminar ${resource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Obtener opciones para selects (para claves foráneas)
  async getSelectOptions(resource: string) {
    const model = this.getModel(resource);

    try {
      const records = await model.findMany({
        select: this.getSelectFields(resource),
        orderBy: this.getOrderBy(resource),
      });

      return records;
    } catch (error) {
      throw new BadRequestException(
        `Error al obtener opciones de ${resource}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Campos para selects según el recurso
  private getSelectFields(resource: string) {
    const selectMap: Record<string, any> = {
      Usuario: { id: true, nombre: true, email: true },
      Role: { id: true, name: true, slug: true },
      Marca: { id: true, nombre: true, slug: true },
      Categoria: { id: true, nombre: true, slug: true },
      Producto: { id: true, titulo: true, sku: true },
      Curso: { id: true, titulo: true, slug: true },
      Modulo: { id: true, titulo: true },
      Direccion: { id: true, etiqueta: true, nombre: true },
    };

    return selectMap[resource] || { id: true };
  }

  // Ordenamiento por defecto según el recurso
  private getOrderBy(resource: string) {
    const orderMap: Record<string, any> = {
      Usuario: { creadoEn: 'desc' },
      Curso: { creadoEn: 'desc' },
      Producto: { creadoEn: 'desc' },
      Orden: { creadoEn: 'desc' },
      Resena: { creadoEn: 'desc' },
      Categoria: { nombre: 'asc' },
      Marca: { nombre: 'asc' },
      Role: { name: 'asc' },
      Modulo: { orden: 'asc' },
    };

    return orderMap[resource] || { id: 'desc' };
  }

  /**
   * Combina eventos de auditoría reales con datos de creación para mostrar actividad completa
   */
  private async getRecentActivityWithAudit(
    recentUsers: any[],
    recentCourses: any[],
    recentProducts: any[],
    recentEnrollments: any[],
  ) {
    try {
      // Obtener eventos de auditoría recientes
      const auditLogs = await this.auditService.getRecentAuditLogs(15);

      // Convertir logs de auditoría a formato de actividad
      const auditActivities = auditLogs.map((log) => ({
        id: `audit-${log.id}`,
        type: this.mapAuditActionToActivityType(log.action, log.tableName, {
          newData: (log as any).newData,
          oldData: (log as any).oldData,
        }),
        description: this.generateAuditDescription({
          action: log.action,
          tableName: log.tableName,
          user: log.user,
          newData: (log as any).newData,
          oldData: (log as any).oldData,
        }),
        timestamp: log.timestamp.toISOString(),
        user: log.user.nombre || log.user.email,
        source: 'admin' as const,
        metadata: {
          auditId: log.id,
          tableName: log.tableName,
          recordId: log.recordId,
          action: log.action,
          userId: log.userId,
          endpoint: log.endpoint,
        },
      }));

      // Combinar con eventos de creación tradicionales (como fallback)
      const creationActivities = [
        ...recentUsers.slice(0, 2).map((user) => ({
          id: `user-${user.id}`,
          type: 'user_registered' as const,
          description: `Nuevo usuario registrado: ${user.nombre}`,
          timestamp: user.creadoEn.toISOString(),
          user: user.nombre,
          source: 'web' as const,
          metadata: {
            userId: user.id,
            email: user.email,
            nombre: user.nombre,
            fechaRegistro: user.creadoEn,
          },
        })),
        ...recentEnrollments.slice(0, 2).map((enrollment) => ({
          id: `inscripcion-${enrollment.id}`,
          type: 'enrollment' as const,
          description: `Se inscribió en ${enrollment.curso.titulo}`,
          timestamp: enrollment.creadoEn.toISOString(),
          user: enrollment.usuario.nombre,
          source: 'web' as const,
          metadata: {
            inscripcionId: enrollment.id,
            cursoTitulo: enrollment.curso.titulo,
            usuarioEmail: enrollment.usuario.email,
            usuarioNombre: enrollment.usuario.nombre,
          },
        })),
      ];

      // Combinar y ordenar por timestamp
      const allActivities = [...auditActivities, ...creationActivities]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 10);

      return allActivities;
    } catch (error) {
      // Fallback a actividad tradicional si hay error con auditoría
      return [
        ...recentUsers.map((user) => ({
          id: `user-${user.id}`,
          type: 'user_registered' as const,
          description: `Nuevo usuario registrado: ${user.nombre}`,
          timestamp: user.creadoEn.toISOString(),
          user: user.nombre,
          source: 'web' as const,
          metadata: {
            userId: user.id,
            email: user.email,
            nombre: user.nombre,
            fechaRegistro: user.creadoEn,
          },
        })),
        ...recentCourses.map((course) => ({
          id: `curso-${course.id}`,
          type: 'course_created' as const,
          description: `Nuevo curso creado: "${course.titulo}"`,
          timestamp: course.creadoEn.toISOString(),
          source: 'admin' as const,
          metadata: {
            cursoId: course.id,
            titulo: course.titulo,
            isNew: true,
          },
        })),
      ]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 10);
    }
  }

  /**
   * Mapea acciones de auditoría a tipos de actividad del dashboard
   */
  private mapAuditActionToActivityType(
    action: string,
    tableName: string,
    log?: { newData?: any; oldData?: any }
  ): string {
    const actionMap: Record<string, Record<string, string>> = {
      CREATE: {
        Usuario: 'user_registered',
        Curso: 'course_created',
        Producto: 'content_updated',
        // Para órdenes creadas (efectivo/transferencia) reflejamos actividad genérica
        // en lugar de “payment_received”
        Orden: 'user_activity',
        Inscripcion: 'enrollment',
      },
      UPDATE: {
        Usuario: 'user_activity',
        Curso: 'content_updated',
        Producto: 'content_updated',
        // En actualización de orden, solo marcamos payment_received
        // cuando el estado cambió a PAGADO. Caso contrario: actividad genérica
        Orden: ((): string => {
          const estado = log?.newData?.estado ?? log?.oldData?.estado;
          return estado === 'PAGADO' ? 'payment_received' : 'user_activity';
        })(),
      },
      DELETE: {
        default: 'system_event',
      },
      LOGIN: {
        default: 'admin_login',
      },
      LOGOUT: {
        default: 'system_event',
      },
    };

    return (
      actionMap[action]?.[tableName] ||
      actionMap[action]?.default ||
      'system_event'
    );
  }

  /**
   * Genera descripción legible para eventos de auditoría
   */
  private generateAuditDescription(log: {
    action: string;
    tableName: string;
    user: { nombre?: string | null; email: string };
    oldData?: any;
    newData?: any;
  }): string {
    const { action, tableName, user } = log;
    const userName = user.nombre || user.email;

    const actionDescriptions: Record<string, Record<string, string>> = {
      CREATE: {
        Usuario: `${userName} creó un nuevo usuario`,
        Curso: `${userName} creó un nuevo curso`,
        Producto: `${userName} agregó un nuevo producto`,
        // Órdenes creadas quedan pendentes hasta verificar pago
        Orden: `${userName} creó una nueva orden (pendiente)`,
        Inscripcion: `${userName} procesó una nueva inscripción`,
        default: `${userName} creó un registro en ${tableName}`,
      },
      UPDATE: {
        Usuario: `${userName} actualizó información de usuario`,
        Curso: `${userName} modificó un curso`,
        Producto: `${userName} actualizó un producto`,
        // Si pasó a PAGADO, reflejar explícitamente el cobro
        Orden:
          log?.newData?.estado === 'PAGADO'
            ? `${userName} confirmó pago de una orden`
            : `${userName} actualizó una orden`,
        default: `${userName} actualizó un registro en ${tableName}`,
      },
      DELETE: {
        default: `${userName} eliminó un registro de ${tableName}`,
      },
      LOGIN: {
        default: `${userName} inició sesión en el panel administrativo`,
      },
      LOGOUT: {
        default: `${userName} cerró sesión del panel administrativo`,
      },
    };

    return (
      actionDescriptions[action]?.[tableName] ||
      actionDescriptions[action]?.default ||
      `${userName} realizó una acción en ${tableName}`
    );
  }

  /**
   * Obtiene logs de auditoría con filtros (delegado al AuditService)
   */
  async getAuditLogs(params: {
    userId?: string;
    tableName?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.auditService.getAuditLogs(params);
  }

  /**
   * Obtiene logs de auditoría recientes (delegado al AuditService)
   */
  async getRecentAuditLogs(limit: number = 15) {
    return this.auditService.getRecentAuditLogs(limit);
  }

  /**
   * Crea un registro de actividad en el sistema
   * Esta función registra eventos de actividad para mostrarlos en el dashboard
   */
  async createActivity(activityData: {
    type: string;
    description: string;
    user?: string;
    source: 'web' | 'admin' | 'system';
    metadata?: Record<string, unknown>;
  }) {
    try {
      // Generar un ID único para la actividad
      const id = `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Crear objeto de actividad con timestamp actual
      const activity = {
        id,
        ...activityData,
        timestamp: new Date().toISOString(),
      };

      // Registrar la actividad en el sistema de auditoría si es posible
      if (
        this.auditService &&
        typeof this.auditService.logCustomActivity === 'function'
      ) {
        await this.auditService.logCustomActivity(activity);
      }

      // Devolver la actividad creada
      return {
        success: true,
        activity,
      };
    } catch (error) {
      console.error('Error al crear actividad:', error);
      return {
        success: false,
        error: 'Error al registrar la actividad',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Registra un evento de eliminación en el sistema
   * @param entityType Tipo de entidad eliminada (usuario, producto, etc.)
   * @param entityId ID de la entidad eliminada
   * @param userId ID del usuario que realizó la acción
   * @param metadata Datos adicionales sobre la eliminación
   */
  async logDeleteEvent(
    entityType: string,
    entityId: string,
    userId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      const activityType =
        entityType === 'usuario'
          ? ActivityType.USER_ACTIVITY
          : ActivityType.SYSTEM_EVENT;

      const description = `Eliminación de ${entityType} (ID: ${entityId})`;

      return this.createActivity({
        type: activityType,
        description,
        user: userId,
        source: ActivitySource.ADMIN,
        metadata: {
          ...metadata,
          action: 'delete',
          entityType,
          entityId,
          userId,
        },
      });
    } catch (error) {
      console.error(`Error al registrar eliminación de ${entityType}:`, error);
      return {
        success: false,
        error: `Error al registrar eliminación de ${entityType}`,
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Registra un evento de registro de usuario en el sistema
   * @param userId ID del usuario registrado
   * @param metadata Datos adicionales sobre el registro
   */
  async logUserRegistration(
    userId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      return this.createActivity({
        type: ActivityType.USER_REGISTERED,
        description: `Nuevo usuario registrado (ID: ${userId})`,
        user: userId,
        source: ActivitySource.WEB,
        metadata: {
          ...metadata,
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error al registrar nuevo usuario:', error);
      return {
        success: false,
        error: 'Error al registrar nuevo usuario',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Registra un evento de pedido de cliente en el sistema
   * @param orderId ID del pedido
   * @param userId ID del usuario que realizó el pedido
   * @param metadata Datos adicionales sobre el pedido
   */
  async logClientOrder(
    orderId: string,
    userId: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      return this.createActivity({
        type: ActivityType.PAYMENT_RECEIVED,
        description: `Nuevo pedido realizado (ID: ${orderId})`,
        user: userId,
        source: ActivitySource.WEB,
        metadata: {
          ...metadata,
          orderId,
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error al registrar nuevo pedido:', error);
      return {
        success: false,
        error: 'Error al registrar nuevo pedido',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
