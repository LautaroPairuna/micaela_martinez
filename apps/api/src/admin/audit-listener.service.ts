// src/admin/audit-listener.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventTypes,
  ResourceEventPayload,
  AuthEventPayload,
  SystemEventPayload,
} from '../events/event.types';

type Dict = Record<string, any>;

/**
 * Estructura interna que persistimos en la tabla de auditoría.
 * Debe alinear con tu Prisma schema (p. ej. model AuditLog).
 */
type AuditInput = {
  tableName: string;
  recordId: string;
  action: string;
  userId: string;
  endpoint?: string;
  oldData?: Dict;
  newData?: Dict;
  userAgent?: string;
  ipAddress?: string;
};

// Helpers
const s = (
  v: string | number | null | undefined,
  fallback = 'system',
): string => (v === null || v === undefined ? fallback : String(v));

const asDict = (obj: unknown): Dict | undefined =>
  obj && typeof obj === 'object' ? (obj as Dict) : undefined;

@Injectable()
export class AuditListenerService {
  private readonly logger = new Logger(AuditListenerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== RESOURCE EVENTS ==========
  @OnEvent(EventTypes.RESOURCE_CREATED, { async: true })
  async onResourceCreated(payload: ResourceEventPayload) {
    const input: AuditInput = {
      tableName: payload.tableName ?? 'unknown',
      recordId: s(payload.recordId, 'n/a'),
      action: 'create',
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: undefined,
      newData: asDict(payload.data),
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };
    await this.save(input);
  }

  @OnEvent(EventTypes.RESOURCE_UPDATED, { async: true })
  async onResourceUpdated(payload: ResourceEventPayload) {
    const input: AuditInput = {
      tableName: payload.tableName ?? 'unknown',
      recordId: s(payload.recordId, 'n/a'),
      action: 'update',
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: asDict(payload.previousData),
      newData: asDict(payload.data),
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };
    await this.save(input);
  }

  @OnEvent(EventTypes.RESOURCE_DELETED, { async: true })
  async onResourceDeleted(payload: ResourceEventPayload) {
    const input: AuditInput = {
      tableName: payload.tableName ?? 'unknown',
      recordId: s(payload.recordId, 'n/a'),
      action: 'delete',
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: asDict(payload.previousData) ?? asDict(payload.data),
      newData: undefined,
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };
    await this.save(input);
  }

  // ========== AUTH EVENTS ==========
  @OnEvent(EventTypes.USER_REGISTERED, { async: true })
  async onUserRegistered(payload: AuthEventPayload) {
    const input: AuditInput = {
      tableName: 'auth',
      recordId: s(payload.userId, 'n/a'),
      action: 'register',
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: undefined,
      newData: { email: payload.userEmail },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };
    await this.save(input);
  }

  @OnEvent(EventTypes.USER_LOGIN, { async: true })
  async onUserLogin(payload: AuthEventPayload) {
    const input: AuditInput = {
      tableName: 'auth',
      recordId: s(payload.userId, 'n/a'),
      action: 'login',
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: undefined,
      newData: { email: payload.userEmail },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };
    await this.save(input);
  }

  @OnEvent(EventTypes.USER_LOGOUT, { async: true })
  async onUserLogout(payload: AuthEventPayload) {
    const input: AuditInput = {
      tableName: 'auth',
      recordId: s(payload.userId, 'n/a'),
      action: 'logout',
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: { email: payload.userEmail },
      newData: undefined,
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };
    await this.save(input);
  }

  // ========== SYSTEM EVENTS ==========
  // Alias genérico si en algún momento emitieses EventTypes.SYSTEM_EVENT
  @OnEvent((EventTypes as any).SYSTEM_EVENT ?? 'system:event', { async: true })
  async onSystemEvent(payload: SystemEventPayload) {
    await this.persistSystem(payload);
  }

  @OnEvent(EventTypes.SYSTEM_INFO, { async: true })
  async onSystemInfo(payload: SystemEventPayload) {
    await this.persistSystem({ ...payload, level: 'INFO' });
  }

  @OnEvent(EventTypes.SYSTEM_WARNING, { async: true })
  async onSystemWarning(payload: SystemEventPayload) {
    await this.persistSystem({ ...payload, level: 'WARNING' });
  }

  @OnEvent(EventTypes.SYSTEM_ERROR, { async: true })
  async onSystemError(payload: SystemEventPayload) {
    await this.persistSystem({ ...payload, level: 'ERROR' });
  }

  // ========== Privates ==========
  private async persistSystem(payload: SystemEventPayload) {
    const level = (payload.level ?? 'INFO').toUpperCase() as
      | 'INFO'
      | 'WARNING'
      | 'ERROR';

    const input: AuditInput = {
      tableName: 'system',
      recordId: s(payload.id ?? payload.code ?? payload.userId ?? 'n/a'),
      action: level.toLowerCase(), // 'info' | 'warning' | 'error'
      userId: s(payload.userId, 'system'),
      endpoint: payload.endpoint,
      oldData: undefined,
      newData: {
        code: payload.code,
        level,
        message: payload.message,
        data: asDict(payload.data),
      },
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
    };

    await this.save(input);
  }

  private async save(input: AuditInput) {
    try {
      // Ajustá el nombre del modelo/tabla si difiere (AuditLog, AuditTrail, etc.)
      await this.prisma.auditLog.create({
        data: {
          tableName: input.tableName,
          recordId: input.recordId,
          action: input.action,
          userId: input.userId,
          endpoint: input.endpoint,
          oldData: input.oldData as any,
          newData: input.newData as any,
          userAgent: input.userAgent,
          ipAddress: input.ipAddress,
          // createdAt lo maneja Prisma por default si está en el schema
        },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al guardar auditoría: ${msg}`);
    }
  }
}
