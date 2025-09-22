// src/lib/services/dashboard.service.ts

import { adminApi } from '../sdk/adminApi';

/* ======================= Tipos públicos ======================= */

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalRevenue: number;
  activeUsers: number;
  pendingOrders: number;
  monthlyRevenue: number[];
  recentActivity: ActivityItem[];
  tableCounts: TableCount[];
  // Propiedades adicionales para dashboard de instructor
  totalModules?: number;
  totalLessons?: number;
  activeStudents?: number;
  completedCourses?: number;
  pendingReviews?: number;
}

export interface ActivityItem {
  id: string;
  type:
    | 'user_registered'
    | 'course_completed'
    | 'payment_received'
    | 'course_created'
    | 'admin_login'
    | 'content_updated'
    | 'system_event'
    | 'user_activity'
    | 'enrollment'
    | 'database_sync';
  description: string;
  timestamp: string; // relativo ("5 min ago") o ISO si no se puede calcular
  user?: string;
  metadata?: Record<string, unknown>;
  source?: 'web' | 'admin' | 'system';
}

export interface TableCount {
  table: string;
  count: number;
  label: string;
}

/* ======================= Tipos utilitarios ======================= */

type UnknownRec = Record<string, unknown>;

type ListResponse<T> = {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  pagination?: { total: number; page: number; limit: number };
};

/* ======================= Fallback ======================= */

const FALLBACK_STATS: DashboardStats = {
  totalUsers: 0,
  totalCourses: 0,
  totalRevenue: 0,
  activeUsers: 0,
  pendingOrders: 0,
  monthlyRevenue: [0, 0, 0, 0, 0, 0],
  totalModules: 0,
  totalLessons: 0,
  activeStudents: 0,
  completedCourses: 0,
  pendingReviews: 0,
  recentActivity: [
    {
      id: '1',
      type: 'user_registered',
      description: 'Sistema en modo de desarrollo - datos limitados',
      timestamp: new Date().toISOString(),
      user: 'Sistema',
    },
  ],
  tableCounts: [
    { table: 'Usuario', count: 0, label: 'Usuarios' },
    { table: 'Curso', count: 0, label: 'Cursos' },
    { table: 'Modulo', count: 0, label: 'Módulos' },
    { table: 'Leccion', count: 0, label: 'Lecciones' },
  ],
};

/* ======================= Servicio ======================= */

class DashboardService {
  /**
   * Obtiene las estadísticas del dashboard desde la API
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Endpoint específico del dashboard (backend)
      const response = await adminApi.get<DashboardStats>('/admin/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Error obteniendo estadísticas del dashboard:', error);

      if (process.env.NODE_ENV === 'development') {
        console.warn('Using fallback dashboard data due to API error:', error);
      }

      // Generar datos de fallback más completos usando métodos internos
      const [recentActivity, tableCounts] = await Promise.allSettled([
        this.getRecentActivity(),
        this.getTableCounts(['Usuario', 'Curso', 'Modulo', 'Leccion']),
      ]);

      return {
        ...FALLBACK_STATS,
        pendingOrders: 0,
        recentActivity:
          recentActivity.status === 'fulfilled'
            ? recentActivity.value
            : this.getFallbackActivity(),
        tableCounts:
          tableCounts.status === 'fulfilled' ? tableCounts.value : FALLBACK_STATS.tableCounts,
      };
    }
  }

  /**
   * Obtiene el conteo de registros de una tabla específica
   */
  private async getTableCount(tableName: string): Promise<number> {
    try {
      const response = await adminApi.get<ListResponse<UnknownRec>>(
        `/admin/${tableName}?page=1&limit=1`,
      );

      if (typeof response.total === 'number') return response.total;
      if (typeof response.pagination?.total === 'number') return response.pagination.total;
      if (Array.isArray(response.data)) return response.data.length;

      return 0;
    } catch (error) {
      console.error(`Error obteniendo conteo para tabla ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Obtiene la actividad reciente del sistema con eventos reales
   */
  private async getRecentActivity(): Promise<ActivityItem[]> {
    try {
      // Obtener registros recientes de diferentes tablas
      const [usuarios, cursos, productos, inscripciones, _sesiones] = await Promise.allSettled([
        adminApi.get<ListResponse<UnknownRec>>(
          '/admin/tables/Usuario/records?limit=3&orderBy=createdAt&order=desc',
        ),
        adminApi.get<ListResponse<UnknownRec>>(
          '/admin/tables/Curso/records?limit=2&orderBy=updatedAt&order=desc',
        ),
        adminApi.get<ListResponse<UnknownRec>>(
          '/admin/tables/Producto/records?limit=2&orderBy=updatedAt&order=desc',
        ),
        adminApi.get<ListResponse<UnknownRec>>(
          '/admin/tables/Inscripcion/records?limit=2&orderBy=createdAt&order=desc',
        ),
        // Logs de sesión (si existen). Si falla, devolvemos lista vacía
        adminApi
          .get<ListResponse<UnknownRec>>(
            '/admin/tables/Session/records?limit=2&orderBy=createdAt&order=desc',
          )
          .then((r) => r)
          .catch(() => ({ data: [] as UnknownRec[] } as ListResponse<UnknownRec>)),
      ]);

      const activities: ActivityItem[] = [];

      // Evento de sistema actual
      activities.push({
        id: `system-${Date.now()}`,
        type: 'system_event',
        description: 'Dashboard actualizado - Sistema operativo',
        timestamp: this.formatTimestamp(new Date()),
        source: 'system',
        user: 'Sistema',
      });

      // Usuarios
      if (usuarios.status === 'fulfilled' && Array.isArray(usuarios.value.data)) {
        usuarios.value.data.forEach((user) => {
          const createdAt = (user as UnknownRec)?.createdAt;
          if (this.isRecentActivity(createdAt)) {
            const idVal = (user as UnknownRec)?.id as string | number | undefined;
            const safeId =
              typeof idVal === 'string' || typeof idVal === 'number'
                ? String(idVal)
                : `${Date.now()}-${Math.random()}`;
            const userName = this.formatUserName(user as UnknownRec);
            const userEmail =
              typeof (user as UnknownRec)?.email === 'string'
                ? (user as UnknownRec).email
                : 'Sin email';

            activities.push({
              id: `user-${safeId}`,
              type: 'user_registered',
              description: `Nuevo usuario registrado: ${userName}`,
              timestamp: this.formatTimestamp(createdAt),
              source: 'web',
              user: userName,
              metadata: {
                userId: idVal,
                email: userEmail,
                nombre: (user as UnknownRec)?.nombre,
                verified: Boolean((user as UnknownRec)?.emailVerificado),
                telefono: (user as UnknownRec)?.telefono,
                fechaRegistro: createdAt,
              },
            });
          }
        });
      }

      // Cursos (creados/actualizados)
      if (cursos.status === 'fulfilled' && Array.isArray(cursos.value.data)) {
        cursos.value.data.forEach((curso) => {
          const isNew = this.isRecentActivity((curso as UnknownRec)?.createdAt);
          const isUpdated = this.isRecentActivity((curso as UnknownRec)?.updatedAt) && !isNew;

          if (isNew || isUpdated) {
            const idVal = (curso as UnknownRec)?.id as string | number | undefined;
            const safeId =
              typeof idVal === 'string' || typeof idVal === 'number'
                ? String(idVal)
                : `${Date.now()}-${Math.random()}`;

            activities.push({
              id: `curso-${safeId}`,
              type: 'course_created',
              description: isNew
                ? `Nuevo curso creado: "${this.formatCourseName(curso as UnknownRec)}"`
                : `Curso actualizado: "${this.formatCourseName(curso as UnknownRec)}"`,
              timestamp: this.formatTimestamp(
                (curso as UnknownRec)?.updatedAt ??
                  (curso as UnknownRec)?.createdAt ??
                  new Date(),
              ),
              source: 'admin',
              metadata: {
                cursoId: idVal,
                titulo: (curso as UnknownRec)?.titulo,
                estado: (curso as UnknownRec)?.estado,
                isNew,
              },
            });
          }
        });
      }

      // Inscripciones
      if (inscripciones.status === 'fulfilled' && Array.isArray(inscripciones.value.data)) {
        for (const inscripcion of inscripciones.value.data) {
          const createdAt = (inscripcion as UnknownRec)?.createdAt;
          if (this.isRecentActivity(createdAt)) {
            let usuarioInfo: UnknownRec | null = null;
            let cursoInfo: UnknownRec | null = null;

            try {
              const usuarioId = (inscripcion as UnknownRec)?.usuarioId as
                | string
                | number
                | undefined;
              if (usuarioId) {
                const usuarioResponse = await adminApi.get<{ data: UnknownRec }>(
                  `/admin/tables/Usuario/records/${usuarioId}`,
                );
                usuarioInfo = usuarioResponse.data;
              }

              const cursoId = (inscripcion as UnknownRec)?.cursoId as
                | string
                | number
                | undefined;
              if (cursoId) {
                const cursoResponse = await adminApi.get<{ data: UnknownRec }>(
                  `/admin/tables/Curso/records/${cursoId}`,
                );
                cursoInfo = cursoResponse.data;
              }
            } catch (err) {
              console.warn('Error obteniendo detalles de inscripción:', err);
            }

            const userName = usuarioInfo
              ? this.formatUserName(usuarioInfo)
              : `Usuario ${(inscripcion as UnknownRec)?.usuarioId as string}`;
            const courseName = cursoInfo
              ? this.formatCourseName(cursoInfo)
              : `Curso ${(inscripcion as UnknownRec)?.cursoId as string}`;
            const idVal = (inscripcion as UnknownRec)?.id as string | number | undefined;
            const safeId =
              typeof idVal === 'string' || typeof idVal === 'number'
                ? String(idVal)
                : `${Date.now()}-${Math.random()}`;

            activities.push({
              id: `inscripcion-${safeId}`,
              type: 'enrollment',
              description: `Se inscribió en ${courseName}`,
              timestamp: this.formatTimestamp(createdAt ?? new Date()),
              source: 'web',
              user: userName,
              metadata: {
                inscripcionId: idVal,
                cursoId: (inscripcion as UnknownRec)?.cursoId,
                usuarioId: (inscripcion as UnknownRec)?.usuarioId,
                cursoTitulo: (cursoInfo?.titulo as string | undefined) ?? (cursoInfo?.nombre as string | undefined),
                usuarioEmail: usuarioInfo?.email as string | undefined,
                usuarioNombre: usuarioInfo?.nombre as string | undefined,
              },
            });
          }
        }
      }

      // Productos como eventos de contenido
      if (productos.status === 'fulfilled' && Array.isArray(productos.value.data)) {
        productos.value.data.forEach((producto) => {
          const updatedAt = (producto as UnknownRec)?.updatedAt;
          if (this.isRecentActivity(updatedAt)) {
            const idVal = (producto as UnknownRec)?.id as string | number | undefined;
            const safeId =
              typeof idVal === 'string' || typeof idVal === 'number'
                ? String(idVal)
                : `${Date.now()}-${Math.random()}`;

            activities.push({
              id: `producto-${safeId}`,
              type: 'content_updated',
              description: `Producto actualizado: "${
                (typeof (producto as UnknownRec)?.nombre === 'string' &&
                  ((producto as UnknownRec).nombre as string)) ||
                'Producto sin nombre'
              }"`,
              timestamp: this.formatTimestamp(
                (producto as UnknownRec)?.updatedAt ??
                  (producto as UnknownRec)?.createdAt ??
                  new Date(),
              ),
              source: 'admin',
              metadata: {
                productoId: idVal,
                nombre: (producto as UnknownRec)?.nombre,
                precio: (producto as UnknownRec)?.precio,
              },
            });
          }
        });
      }

      // Ordenar por timestamp (relativo) y tomar los más recientes
      return activities
        .sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 6);
    } catch (error) {
      console.warn('Error obteniendo actividad reciente:', error);
      return this.getFallbackActivity();
    }
  }

  /* ======================= Helpers ======================= */

  private toDate(input: unknown): Date | null {
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    if (typeof input === 'string' || typeof input === 'number') {
      const d = new Date(input as string | number);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  /** Verifica si una actividad es reciente (últimas 24 horas) */
  private isRecentActivity(timestamp: unknown): boolean {
    const d = this.toDate(timestamp);
    if (!d) return false;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - d.getTime() <= twentyFourHours;
  }

  /** Formatea un timestamp para mostrar tiempo relativo */
  private formatTimestamp(dateLike: unknown): string {
    const targetDate = this.toDate(dateLike) ?? new Date();
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hora${hours > 1 ? 's' : ''} ago`;
    }
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} día${days > 1 ? 's' : ''} ago`;
  }

  /** Nombre del usuario para mostrar */
  private formatUserName(user: UnknownRec): string {
    if (typeof user?.nombre === 'string' && user.nombre) return user.nombre;
    if (typeof user?.email === 'string' && user.email) return user.email.split('@')[0];
    return 'Usuario nuevo';
  }

  /** Nombre del curso para mostrar */
  private formatCourseName(curso: UnknownRec): string {
    const titulo = typeof curso?.titulo === 'string' ? (curso.titulo as string) : '';
    const nombre = typeof curso?.nombre === 'string' ? (curso.nombre as string) : '';
    return titulo || nombre || 'Curso sin título';
  }

  /** Actividad de fallback cuando hay errores */
  private getFallbackActivity(): ActivityItem[] {
    return [
      {
        id: 'system-1',
        type: 'system_event',
        description: 'Sistema iniciado correctamente',
        timestamp: this.formatTimestamp(new Date()),
        source: 'system',
        user: 'Sistema',
      },
      {
        id: 'system-2',
        type: 'admin_login',
        description: 'Sesión de administración activa',
        timestamp: this.formatTimestamp(new Date(Date.now() - 300000)), // 5 min
        source: 'admin',
        user: 'Administrador',
      },
    ];
  }

  /** (Simulado) Ingresos mensuales */
  private async getMonthlyRevenue(): Promise<number> {
    try {
      const ordenes = await adminApi.get<ListResponse<UnknownRec>>(
        '/admin/tables/orden/records?limit=100',
      );
      if (Array.isArray(ordenes.data)) {
        return ordenes.data.length * 150; // Promedio de $150 por orden
      }
      return 0;
    } catch (error) {
      console.warn('Error calculando ingresos mensuales:', error);
      return 0;
    }
  }

  /** Obtiene el conteo de registros para las tablas indicadas */
  async getTableCounts(tables: string[]): Promise<TableCount[]> {
    const mainTables = ['Usuario', 'Curso', 'Modulo', 'Leccion', 'Producto', 'Orden'];
    const tablesToCount = tables.filter((table) => mainTables.includes(table));

    if (tablesToCount.length === 0) return FALLBACK_STATS.tableCounts;

    const countPromises = tablesToCount.map(async (table) => {
      try {
        const count = await this.getTableCount(table);
        return { table, count, label: this.getTableLabel(table) };
      } catch (error) {
        console.warn(`Error getting count for table ${table}:`, error);
        return { table, count: 0, label: this.getTableLabel(table) };
      }
    });

    const results = await Promise.allSettled(countPromises);
    const counts = results
      .filter((r): r is PromiseFulfilledResult<TableCount> => r.status === 'fulfilled')
      .map((r) => r.value);

    return counts.length > 0 ? counts : FALLBACK_STATS.tableCounts;
  }

  /** Etiqueta legible para una tabla */
  private getTableLabel(table: string): string {
    const labels: Record<string, string> = {
      Usuario: 'Usuarios',
      Curso: 'Cursos',
      Modulo: 'Módulos',
      Leccion: 'Lecciones',
      Producto: 'Productos',
      Orden: 'Órdenes',
      // Compatibilidad con minúsculas
      usuario: 'Usuarios',
      curso: 'Cursos',
      modulo: 'Módulos',
      leccion: 'Lecciones',
      producto: 'Productos',
      orden: 'Órdenes',
    };
    return labels[table] || table;
  }

  /** Estadísticas simples de una tabla */
  async getTableStats(tableName: string) {
    try {
      const response = await adminApi.get<{
        data: UnknownRec[];
        pagination?: { total: number };
        total?: number;
      }>(`/admin/tables/${tableName}/records?limit=1`);

      return {
        total: response.pagination?.total ?? response.total ?? response.data?.length ?? 0,
        tableName,
      };
    } catch (error) {
      console.warn(`Error obteniendo estadísticas para ${tableName}:`, error);
      return { total: 0, tableName };
    }
  }
}

/* ======================= Export ======================= */

export const dashboardService = new DashboardService();
export { DashboardService };
