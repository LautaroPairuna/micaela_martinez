import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

export interface AuditLogData {
  tableName: string;
  recordId: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'VIEW'
    | 'EXPORT';
  oldData?: any;
  newData?: any;
  userId?: string; // Hacemos userId opcional para manejar casos donde no esté disponible
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra una acción de auditoría en la base de datos
   */
  async logAction(data: AuditLogData): Promise<void> {
    try {
      // Validar campos requeridos
      if (!data.tableName || !data.recordId || !data.action) {
        this.logger.warn('Missing required audit fields', { 
          tableName: data.tableName, 
          recordId: data.recordId, 
          action: data.action 
        });
        return;
      }

      // Verificar si el userId existe o es nulo
      let userId = data.userId;
      
      // Si no hay userId, intentamos usar un usuario administrador existente
      if (!userId) {
        try {
          // Buscar un usuario administrador para usar como fallback
            const adminUser = await this.prisma.usuario.findFirst({
              where: {
                roles: {
                  some: {
                    role: {
                      slug: 'admin'
                    }
                  }
                }
              },
              select: {
                id: true
              }
            });
          
          // Si encontramos un admin, usamos su ID
          if (adminUser) {
            userId = adminUser.id;
          } else {
            // Si no hay admin, omitimos el registro de auditoría
            this.logger.warn('No se pudo registrar auditoría: no hay userId válido y no se encontró usuario admin');
            return;
          }
        } catch (userError) {
          // Si hay error al buscar usuario, omitimos el registro
          this.logger.warn('Error al buscar usuario admin para auditoría', userError);
          return;
        }
      } else {
        // Verificar que el usuario existe
        const userExists = await this.prisma.usuario.findUnique({
          where: { id: userId },
          select: { id: true }
        });
        
        if (!userExists) {
          this.logger.warn(`No se pudo registrar auditoría: el usuario con ID ${userId} no existe`);
          return;
        }
      }

      await this.prisma.auditLog.create({
        data: {
          tableName: data.tableName,
          recordId: data.recordId,
          action: data.action,
          oldData: data.oldData || null,
          newData: data.newData || null,
          userId: userId,
          userAgent: data.userAgent || null,
          ipAddress: data.ipAddress || null,
          endpoint: data.endpoint || null,
        },
      });

      // Log estructurado para debugging
      this.logger.log({
        message: `Audit: ${data.action} on ${data.tableName}`,
        userId: userId,
        tableName: data.tableName,
        recordId: data.recordId,
        action: data.action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error logging audit action:', error);
      // No lanzamos el error para no interrumpir la operación principal
    }
  }

  /**
   * Registra una acción CRUD con datos del request
   */
  async logCrudAction(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string,
    userId: string,
    oldData?: any,
    newData?: any,
    request?: Request,
  ): Promise<void> {
    // Validar campos requeridos
    if (!tableName || !recordId || !action) {
      this.logger.warn('Missing required audit fields in logCrudAction', { 
        tableName, 
        recordId, 
        action 
      });
      return;
    }
    
    const auditData: AuditLogData = {
      tableName,
      recordId,
      action,
      oldData,
      newData,
      userId, // Pasamos el userId tal cual, logAction se encargará de validarlo
      userAgent: request?.get('User-Agent'),
      ipAddress: this.getClientIp(request),
      endpoint: request
        ? `${request.method} ${request.originalUrl}`
        : undefined,
    };

    await this.logAction(auditData);
  }

  /**
   * Registra un login administrativo
   */
  async logAdminLogin(userId: string, request?: Request): Promise<void> {
    await this.logAction({
      tableName: 'Usuario',
      recordId: userId,
      action: 'LOGIN',
      userId,
      userAgent: request?.get('User-Agent'),
      ipAddress: this.getClientIp(request),
      endpoint: request
        ? `${request.method} ${request.originalUrl}`
        : undefined,
    });
  }

  /**
   * Registra una actividad personalizada en el sistema de auditoría
   * Esta función permite registrar eventos de actividad que no están directamente
   * relacionados con operaciones CRUD en la base de datos
   */
  async logCustomActivity(activity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
    source: 'web' | 'admin' | 'system';
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      // Convertir el tipo de actividad a una acción de auditoría
      const actionMap: Record<
        string,
        'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT'
      > = {
        user_registered: 'CREATE',
        user_deleted: 'DELETE',
        course_created: 'CREATE',
        content_updated: 'UPDATE',
        payment_received: 'CREATE',
        enrollment: 'CREATE',
        order_created: 'CREATE',
        order_updated: 'UPDATE',
        order_deleted: 'DELETE',
      };

      // Determinar la acción basada en el tipo
      const action = actionMap[activity.type] || 'CREATE';

      // Determinar la tabla basada en el tipo
      const tableMap: Record<string, string> = {
        user_registered: 'Usuario',
        user_deleted: 'Usuario',
        course_created: 'Curso',
        content_updated: 'Contenido',
        payment_received: 'Pago',
        enrollment: 'Inscripcion',
        order_created: 'Orden',
        order_updated: 'Orden',
        order_deleted: 'Orden',
      };

      const tableName = tableMap[activity.type] || 'Sistema';

      // Extraer ID de registro si está disponible en los metadatos
      const recordId =
        (activity.metadata?.recordId as string) ||
        (activity.metadata?.userId as string) ||
        activity.id ||
        '';

      // Crear entrada en el log de auditoría
      await this.logAction({
        action,
        tableName,
        recordId,
        userId: activity.user || '',
        endpoint: `/api/admin/activity/${activity.type}`,
        newData: activity.metadata || {},
      });

      return true;
    } catch (error) {
      this.logger.error('Error al registrar actividad personalizada:', error);
      return false;
    }
  }

  /**
   * Registra un logout administrativo
   */
  async logAdminLogout(userId: string, request?: Request): Promise<void> {
    await this.logAction({
      tableName: 'Usuario',
      recordId: userId,
      action: 'LOGOUT',
      userId,
      userAgent: request?.get('User-Agent'),
      ipAddress: this.getClientIp(request),
      endpoint: request
        ? `${request.method} ${request.originalUrl}`
        : undefined,
    });
  }

  /**
   * Obtiene logs de auditoría por usuario
   */
  async getAuditLogsByUser(userId: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene logs de auditoría por tabla
   */
  async getAuditLogsByTable(tableName: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: { tableName },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene logs de auditoría por registro específico
   */
  async getAuditLogsByRecord(tableName: string, recordId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        tableName,
        recordId,
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene logs de auditoría recientes para el dashboard
   */
  async getRecentAuditLogs(limit: number = 10) {
    return await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
          },
        },
      },
      where: {
        // Excluir acciones muy frecuentes que no son relevantes para el dashboard
        action: {
          notIn: ['READ'],
        },
      },
    });
  }

  /**
   * Obtiene logs de auditoría con filtros avanzados
   */
  async getAuditLogs({
    userId,
    tableName,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  }: {
    userId?: string;
    tableName?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (userId) where.userId = userId;
    if (tableName) where.tableName = tableName;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombre: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Limpia logs antiguos (para mantenimiento)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} audit logs older than ${daysToKeep} days`,
    );
    return result.count;
  }

  /**
   * Extrae la IP del cliente del request
   */
  private getClientIp(request?: Request): string | undefined {
    if (!request) return undefined;

    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      undefined
    );
  }

  /**
   * Formatea los datos para logging, removiendo campos sensibles
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'key',
    ];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
