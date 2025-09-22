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

    const excludeUserId = toStr(payload.userId);
    await this.createNotificationForAdmins({ title, url, excludeUserId });
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
    excludeUserId?: string;
  }) {
    const admins = await this.prisma.usuario.findMany({
      where: {
        roles: {
          some: { role: { slug: 'admin' } },
        },
        ...(data.excludeUserId ? { id: { not: data.excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      this.logger.warn('No se encontraron administradores para notificar.');
      return;
    }

    for (const admin of admins) {
      const notification = await this.prisma.notificacion.create({
        data: {
          usuarioId: admin.id,
          tipo: 'SISTEMA' as TipoNotificacion,
          titulo: data.title,
          mensaje: data.title, // Usar título como mensaje por simplicidad
          url: data.url,
        },
      });

      this.websocketGateway.emitToUser(
        notification.usuarioId,
        'nueva-notificacion',
        notification,
      );
    }

    this.logger.log(
      `Notificación de sistema creada para ${admins.length} administradores.`,
    );
  }
}
