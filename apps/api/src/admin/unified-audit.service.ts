import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websockets/websocket.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventTypes,
  ResourceEventPayload,
  AuthEventPayload,
  SystemEventPayload,
  AuditCreatedPayload,
} from '../events/event.types';

interface AuditInput {
  tableName: string;
  recordId: string;
  action: string;
  userId?: string;
  endpoint?: string;
  data?: any;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

interface NotificationInput {
  type: 'system' | 'user' | 'admin';
  title: string;
  message: string;
  userId?: string | null;
  metadata?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class UnifiedAuditService {
  private readonly logger = new Logger(UnifiedAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== RESOURCE EVENTS ====================
  @OnEvent(EventTypes.RESOURCE_CREATED)
  async handleResourceCreated(payload: ResourceEventPayload) {
    await this.processResourceEvent(payload, 'create');
  }

  @OnEvent(EventTypes.RESOURCE_UPDATED)
  async handleResourceUpdated(payload: ResourceEventPayload) {
    await this.processResourceEvent(payload, 'update');
  }

  @OnEvent(EventTypes.RESOURCE_DELETED)
  async handleResourceDeleted(payload: ResourceEventPayload) {
    await this.processResourceEvent(payload, 'delete');
  }

  // ==================== AUTH EVENTS ====================
  @OnEvent(EventTypes.USER_REGISTERED)
  async handleUserRegistered(payload: AuthEventPayload) {
    const auditInput: AuditInput = {
      tableName: 'users',
      recordId: payload.userId?.toString() || 'unknown',
      action: 'register',
      userId: payload.userId?.toString(),
      endpoint: payload.endpoint,
      data: { email: payload.userEmail },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      timestamp: payload.timestamp || new Date(),
    };

    const auditRecord = await this.saveAuditRecord(auditInput);

    // Crear notificación para administradores
    await this.createNotification({
      type: 'admin',
      title: 'Nuevo Usuario Registrado',
      message: `Usuario ${payload.userEmail} se ha registrado en el sistema`,
      metadata: {
        auditId: auditRecord.id,
        userEmail: payload.userEmail,
        userId: payload.userId,
      },
      priority: 'medium',
    });

    // Emitir evento de correlación
    this.emitAuditCreated(auditRecord, payload);
  }

  @OnEvent(EventTypes.USER_LOGIN)
  async handleUserLogin(payload: AuthEventPayload) {
    const auditInput: AuditInput = {
      tableName: 'users',
      recordId: payload.userId?.toString() || 'unknown',
      action: 'login',
      userId: payload.userId?.toString(),
      endpoint: payload.endpoint,
      data: { email: payload.userEmail },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      timestamp: payload.timestamp || new Date(),
    };

    const auditRecord = await this.saveAuditRecord(auditInput);
    this.emitAuditCreated(auditRecord, payload);
  }

  @OnEvent(EventTypes.USER_LOGOUT)
  async handleUserLogout(payload: AuthEventPayload) {
    const auditInput: AuditInput = {
      tableName: 'users',
      recordId: payload.userId?.toString() || 'unknown',
      action: 'logout',
      userId: payload.userId?.toString(),
      endpoint: payload.endpoint,
      data: { email: payload.userEmail },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      timestamp: payload.timestamp || new Date(),
    };

    const auditRecord = await this.saveAuditRecord(auditInput);
    this.emitAuditCreated(auditRecord, payload);
  }

  // ==================== SYSTEM EVENTS ====================
  @OnEvent(EventTypes.SYSTEM_EVENT)
  @OnEvent(EventTypes.SYSTEM_INFO)
  @OnEvent(EventTypes.SYSTEM_WARNING)
  @OnEvent(EventTypes.SYSTEM_ERROR)
  async handleSystemEvent(payload: SystemEventPayload) {
    const auditInput: AuditInput = {
      tableName: 'system',
      recordId: payload.id?.toString() || 'system',
      action: payload.level?.toLowerCase() || 'info',
      userId: payload.userId?.toString(),
      endpoint: payload.endpoint,
      data: {
        code: payload.code,
        message: payload.message,
        level: payload.level,
        ...payload.data,
      },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      timestamp: payload.timestamp || new Date(),
    };

    const auditRecord = await this.saveAuditRecord(auditInput);

    // Crear notificación para eventos críticos
    if (payload.level === 'ERROR' || payload.level === 'WARNING') {
      await this.createNotification({
        type: 'admin',
        title: `Sistema: ${payload.level}`,
        message: payload.message,
        metadata: {
          auditId: auditRecord.id,
          code: payload.code,
          level: payload.level,
        },
        priority: payload.level === 'ERROR' ? 'critical' : 'high',
      });
    }

    this.emitAuditCreated(auditRecord, payload);
  }

  // ==================== CORE PROCESSING METHODS ====================
  private async processResourceEvent(
    payload: ResourceEventPayload,
    action: 'create' | 'update' | 'delete',
  ) {
    const auditInput: AuditInput = {
      tableName: payload.tableName,
      recordId: payload.recordId.toString(),
      action,
      userId: payload.userId?.toString(),
      endpoint: payload.endpoint,
      data: payload.data,
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      timestamp: payload.timestamp || new Date(),
    };

    const auditRecord = await this.saveAuditRecord(auditInput);

    // Crear notificación basada en el tipo de recurso y acción
    const notificationConfig = this.getNotificationConfig(
      payload.tableName,
      action,
    );
    if (notificationConfig) {
      await this.createNotification({
        type: 'admin',
        title: notificationConfig.title,
        message: notificationConfig.message.replace(
          '{recordId}',
          payload.recordId.toString(),
        ),
        metadata: {
          auditId: auditRecord.id,
          tableName: payload.tableName,
          recordId: payload.recordId,
          action,
        },
        priority: notificationConfig.priority,
      });
    }

    this.emitAuditCreated(auditRecord, payload);
  }

  private async saveAuditRecord(input: AuditInput) {
    try {
      const auditRecord = await this.prisma.auditLog.create({
        data: {
          tableName: input.tableName,
          recordId: input.recordId,
          action: input.action,
          userId: input.userId ? parseInt(input.userId) : 1, // Default to admin user if no userId
          endpoint: input.endpoint,
          newData: input.data ? JSON.stringify(input.data) : undefined,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
          timestamp: input.timestamp,
        },
      });

      this.logger.log(
        `Audit record created: ${input.tableName}:${input.recordId} - ${input.action}`,
      );

      return auditRecord;
    } catch (error) {
      this.logger.error(
        `Failed to save audit record: ${input.tableName}:${input.recordId}`,
        error,
      );
      throw error;
    }
  }

  private async createNotification(input: NotificationInput) {
    try {
      const notification = await this.prisma.notificacion.create({
        data: {
          tipo: input.type as any, // Mapear el tipo según el enum TipoNotificacion
          titulo: input.title,
          mensaje: input.message,
          usuarioId: input.userId ? parseInt(input.userId) : 1, // Default to admin user
          metadata: input.metadata || null,
          leida: false,
          creadoEn: new Date(),
        },
      });

      // Emitir notificación via WebSocket
      this.websocketGateway.emitToAdmins('new-notification', {
        id: notification.id,
        type: notification.tipo,
        title: notification.titulo,
        message: notification.mensaje,
        metadata: notification.metadata,
        createdAt: notification.creadoEn,
        isRead: notification.leida,
      });

      this.logger.log(`Notification created: ${input.title}`);
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${input.title}`, error);
      throw error;
    }
  }

  private emitAuditCreated(
    auditRecord: any,
    originalPayload:
      | ResourceEventPayload
      | AuthEventPayload
      | SystemEventPayload,
  ) {
    const correlationPayload: AuditCreatedPayload = {
      auditId: auditRecord.id,
      tableName: auditRecord.tableName,
      recordId: auditRecord.recordId,
      action: auditRecord.action,
      userId: auditRecord.userId,
      timestamp: auditRecord.timestamp,
      originalEvent: originalPayload,
    };

    this.eventEmitter.emit(EventTypes.AUDIT_CREATED, correlationPayload);
  }

  private getNotificationConfig(tableName: string, action: string) {
    const configs: Record<
      string,
      Record<
        string,
        { title: string; message: string; priority: 'low' | 'medium' | 'high' }
      >
    > = {
      courses: {
        create: {
          title: 'Nuevo Curso',
          message: 'Se ha creado el curso {recordId}',
          priority: 'medium' as const,
        },
        update: {
          title: 'Curso Actualizado',
          message: 'Se ha actualizado el curso {recordId}',
          priority: 'low' as const,
        },
        delete: {
          title: 'Curso Eliminado',
          message: 'Se ha eliminado el curso {recordId}',
          priority: 'high' as const,
        },
      },
      orders: {
        create: {
          title: 'Nueva Orden',
          message: 'Se ha creado la orden {recordId}',
          priority: 'medium' as const,
        },
        update: {
          title: 'Orden Actualizada',
          message: 'Se ha actualizado la orden {recordId}',
          priority: 'low' as const,
        },
      },
      products: {
        create: {
          title: 'Nuevo Producto',
          message: 'Se ha creado el producto {recordId}',
          priority: 'medium' as const,
        },
        update: {
          title: 'Producto Actualizado',
          message: 'Se ha actualizado el producto {recordId}',
          priority: 'low' as const,
        },
        delete: {
          title: 'Producto Eliminado',
          message: 'Se ha eliminado el producto {recordId}',
          priority: 'high' as const,
        },
      },
      reviews: {
        create: {
          title: 'Nueva Reseña',
          message: 'Se ha creado la reseña {recordId}',
          priority: 'low' as const,
        },
      },
    };

    return configs[tableName]?.[action];
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Método público para registrar actividades personalizadas
   */
  async logCustomActivity(
    tableName: string,
    recordId: string | number,
    action: string,
    userId?: string | number,
    data?: any,
    createNotification = false,
  ) {
    const auditInput: AuditInput = {
      tableName,
      recordId: recordId.toString(),
      action,
      userId: userId?.toString(),
      data,
      timestamp: new Date(),
    };

    const auditRecord = await this.saveAuditRecord(auditInput);

    if (createNotification) {
      await this.createNotification({
        type: 'admin',
        title: 'Actividad Personalizada',
        message: `${action} en ${tableName}:${recordId}`,
        metadata: { auditId: auditRecord.id, tableName, recordId, action },
        priority: 'low',
      });
    }

    return auditRecord;
  }

  /**
   * Obtiene registros de auditoría con filtros opcionales
   */
  async getAuditLogs(filters?: {
    action?: string;
    resource?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const where: Record<string, any> = {};

    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
          },
        },
      },
    });
  }
}
