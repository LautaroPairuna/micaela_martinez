import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TipoNotificacion } from '@prisma/client';

import {
  EventTypes,
  ResourceEventPayload,
  AuthEventPayload,
} from '../events/event.types';
import { PrismaService } from '../prisma/prisma.service';
// Importación corregida del WebsocketGateway
import { WebsocketGateway } from '../websockets/websocket.gateway';

const toStr = (v: string | number | null | undefined): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

@Injectable()
export class NotificationListenerService {
  private readonly logger = new Logger(NotificationListenerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  @OnEvent(EventTypes.RESOURCE_CREATED)
  async handleResourceCreated(payload: ResourceEventPayload) {
    await this.handleResourceEvent('created', payload);
  }

  @OnEvent(EventTypes.RESOURCE_UPDATED)
  async handleResourceUpdated(payload: ResourceEventPayload) {
    await this.handleResourceEvent('updated', payload);
  }

  @OnEvent(EventTypes.RESOURCE_DELETED)
  async handleResourceDeleted(payload: ResourceEventPayload) {
    await this.handleResourceEvent('deleted', payload);
  }

  @OnEvent(EventTypes.USER_REGISTERED)
  async handleUserRegistered(payload: AuthEventPayload) {
    const title = `Nuevo usuario registrado: ${payload.userEmail}`;
    const url = '/admin/usuarios';
    const excludeUserId = toStr(payload.userId);

    await this.createNotificationForAdmins({ title, url, excludeUserId });
  }

  private async handleResourceEvent(
    action: 'created' | 'updated' | 'deleted',
    payload: ResourceEventPayload,
  ) {
    const { resourceType, resourceId, resourceName } =
      this.deriveResourceMeta(payload);
    let title: string;
    let url: string;

    switch (action) {
      case 'created':
        title = `Nuevo ${resourceType} creado: ${resourceName || resourceId}`;
        url = `/admin/${resourceType.toLowerCase()}s/${resourceId}`;
        break;
      case 'updated':
        title = `${resourceType} actualizado: ${resourceName || resourceId}`;
        url = `/admin/${resourceType.toLowerCase()}s/${resourceId}`;
        break;
      case 'deleted':
        title = `${resourceType} eliminado: ${resourceName || resourceId}`;
        url = `/admin/${resourceType.toLowerCase()}s`;
        break;
    }

    // Obtener información del actor (administrador que realizó la acción)
    const actorId = toStr(payload.userId);
    let actorName: string | undefined;
    if (actorId) {
      try {
        const actor = await this.prisma.usuario.findUnique({
          where: { id: Number(actorId) },
          select: { nombre: true, email: true },
        });
        actorName = actor?.nombre || actor?.email || undefined;
      } catch (e) {
        this.logger.warn(`No se pudo obtener el nombre del actor ${actorId}: ${e instanceof Error ? e.message : e}`);
      }
    }

    // Importante: NO excluir al actor. El mismo admin debe ver su propia actividad.
    await this.createNotificationForAdmins({
      title,
      url,
      // excludeUserId: undefined,
      actorId,
      actorName,
      meta: {
        action,
        resourceType,
        resourceId,
        resourceName,
        actorId,
        actorName,
      },
    });
  }

  private deriveResourceMeta(payload: ResourceEventPayload) {
    const resourceType = payload.tableName ?? 'recurso';
    const resourceId = toStr(payload.recordId) ?? 'n/a';
    const resourceName =
      (payload as any)?.data?.name ??
      (payload as any)?.data?.nombre ??
      (payload as any)?.previousData?.name ??
      (payload as any)?.previousData?.nombre ??
      null;

    return { resourceType, resourceId, resourceName };
  }

  private async createNotificationForAdmins(data: {
    title: string;
    url: string;
    excludeUserId?: string; // se mantiene por compatibilidad, pero no se usa para eventos de recurso
    actorId?: string;
    actorName?: string;
    meta?: Record<string, any>;
  }) {
    const admins = await this.prisma.usuario.findMany({
      where: {
        roles: {
          some: { role: { slug: 'admin' } },
        },
        ...(data.excludeUserId ? { id: { not: Number(data.excludeUserId) } } : {}),
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      this.logger.warn('No se encontraron administradores para notificar.');
      return;
    }

    const toSpanishVerb = (a: 'created' | 'updated' | 'deleted') =>
      a === 'created' ? 'creó' : a === 'updated' ? 'actualizó' : 'eliminó';

    for (const admin of admins) {
      const isActor = data.actorId ? admin.id === Number(data.actorId) : false;
      const displayActor = isActor ? 'Tú' : data.actorName || 'Administrador';
      const resourceLabel = data.meta?.resourceName || `#${data.meta?.resourceId ?? ''}`;
      const actionVerb = data.meta?.action ? toSpanishVerb(data.meta.action) : 'actualizó';

      const message = `${displayActor} ${actionVerb} ${String(data.meta?.resourceType || 'recurso').toLowerCase()} ${resourceLabel}`;

      const notification = await this.prisma.notificacion.create({
        data: {
          usuarioId: admin.id,
          tipo: 'SISTEMA' as TipoNotificacion,
          titulo: data.title,
          mensaje: message,
          url: data.url,
          metadata: {
            ...(data.meta || {}),
            displayActor,
            isActor,
            createdAt: new Date().toISOString(),
          },
        },
      });

      this.websocketGateway.emitToUser(
        String(notification.usuarioId),
        'nueva-notificacion',
        notification,
      );
    }

    this.logger.log(
      `Notificación de sistema creada para ${admins.length} administradores.`,
    );
  }
}
