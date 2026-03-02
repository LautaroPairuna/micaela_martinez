import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TipoNotificacion } from '@prisma/client';

import {
  EventTypes,
  ResourceEventPayload,
  AuthEventPayload,
  AuditCreatedPayload,
} from '../events/event.types';
import { PrismaService } from '../prisma/prisma.service';
// Importación corregida del WebsocketGateway
import { WebsocketGateway } from '../websockets/websocket.gateway';

const toStr = (v: string | number | null | undefined): string | undefined =>
  v === null || v === undefined ? undefined : String(v);

@Injectable()
export class NotificationListenerService {
  private readonly logger = new Logger(NotificationListenerService.name);
  private readonly auditCorrelationMap = new Map<string, number>(); // Mapa temporal para correlacionar eventos

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

  @OnEvent(EventTypes.AUDIT_CREATED)
  async handleAuditCreated(payload: AuditCreatedPayload) {
    this.logger.debug(
      `Audit created with ID: ${payload.auditId} for ${payload.tableName}:${payload.recordId}`,
    );

    // Crear clave de correlación basada en el evento original
    const correlationKey = `${payload.tableName}:${payload.recordId}:${payload.action}:${payload.userId}`;

    // Almacenar el auditId para correlación con notificaciones
    this.auditCorrelationMap.set(correlationKey, payload.auditId);

    // Limpiar la correlación después de 30 segundos para evitar memory leaks
    setTimeout(() => {
      this.auditCorrelationMap.delete(correlationKey);
    }, 30000);
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

    // Enriquecer mensaje según el recurso
    let richMessage: string | undefined;
    const data = (payload as any).data;
    const prevData = (payload as any).previousData;

    if (resourceType === 'Orden') {
      if (action === 'created') {
        const total = data?.total ? `$${data.total}` : '';
        const items = data?.items?.length ? `(${data.items.length} items)` : '';
        richMessage = `Orden #${resourceId} creada. Total: ${total} ${items}`;
      } else if (action === 'updated') {
        const estado = data?.estado;
        if (estado && estado !== prevData?.estado) {
           richMessage = `Orden #${resourceId} cambió a estado: ${estado}`;
        }
      }
    } else if (resourceType === 'Usuario') {
      if (action === 'created') {
        richMessage = `Nuevo usuario registrado: ${data?.email || resourceId}`;
      } else if (action === 'updated') {
        // Detectar cambios de rol si es posible, o campos clave
        if (data?.rol && data.rol !== prevData?.rol) {
           richMessage = `Usuario ${resourceName || resourceId} cambió de rol a: ${data.rol}`;
        }
      }
    } else if (resourceType === 'Producto') {
      if (action === 'updated') {
        if (data?.stock !== undefined && prevData?.stock !== undefined && data.stock !== prevData.stock) {
           richMessage = `Producto "${resourceName}" stock actualizado: ${prevData.stock} ➝ ${data.stock}`;
        } else if (data?.precio !== undefined && prevData?.precio !== undefined && data.precio !== prevData.precio) {
           richMessage = `Producto "${resourceName}" precio actualizado: $${prevData.precio} ➝ $${data.precio}`;
        }
      }
    } else if (resourceType === 'Curso') {
      if (action === 'updated') {
         if (data?.publicado !== undefined && data.publicado !== prevData?.publicado) {
            const estado = data.publicado ? 'PUBLICADO' : 'OCULTO';
            richMessage = `Curso "${resourceName}" ahora está ${estado}`;
         }
      }
    }

    // Fallback genérico para actualizaciones: detectar campos cambiados
    if (!richMessage && action === 'updated' && data && prevData) {
      const changedFields = this.detectChangedFields(data, prevData);
      if (changedFields.length > 0) {
        const fieldNames = changedFields.slice(0, 3).join(', ');
        const more = changedFields.length > 3 ? ` y ${changedFields.length - 3} más` : '';
        richMessage = `${resourceType} "${resourceName || resourceId}" actualizado: ${fieldNames}${more}`;
      }
    }

    // Obtener auditId correlacionado
    const auditId = this.getCorrelatedAuditId(payload, action);

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
        this.logger.warn(
          `No se pudo obtener el nombre del actor ${actorId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }

    // Importante: NO excluir al actor. El mismo admin debe ver su propia actividad.
    await this.createNotificationForAdmins({
      title,
      url,
      // excludeUserId: undefined,
      actorId,
      actorName,
      auditId, // Incluir auditId para correlación
      richMessage, // Mensaje personalizado si existe
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

  private detectChangedFields(
    newData: Record<string, any>,
    oldData: Record<string, any>,
  ): string[] {
    const ignoredKeys = [
      // Identificadores y Timestamps
      'id',
      'uuid',
      'createdAt',
      'updatedAt',
      'creadoEn',
      'actualizadoEn',
      'emailVerificadoEn',
      'deleted',
      'eliminado',
      
      // Datos sensibles y técnicos
      'password',
      'passwordHash',
      'hash',
      'metadatos',
      'metadata',
      'token',
      'refreshToken',
      
      // Claves foráneas (IDs de relaciones)
      'usuarioId',
      'roleId',
      'productoId',
      'cursoId',
      'marcaId',
      'categoriaId',
      'moduloId',
      'ordenId',
      'carritoId',
      'resenaId',
      'parentId',
      'direccionEnvioId',
      'direccionFacturacionId',
      'refId', // ItemOrden
      'suscripcionId',
      
      // Campos de auditoría interna o conteos
      'ratingProm',
      'ratingConteo',
      'orden', // Ordenamiento visual
    ];
    const changes: string[] = [];

    for (const key in newData) {
      if (ignoredKeys.includes(key)) continue;
      // Comparación simple (no profunda para objetos anidados complejos)
      // JSON.stringify para manejar arrays/objetos simples que cambiaron
      if (JSON.stringify(newData[key]) !== JSON.stringify(oldData[key])) {
        // Formatear nombre del campo (camelCase -> Title Case)
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase());
        changes.push(formattedKey);
      }
    }

    return changes;
  }

  private getCorrelatedAuditId(
    payload: ResourceEventPayload,
    action: 'created' | 'updated' | 'deleted',
  ): number | undefined {
    const correlationKey = `${payload.tableName}:${payload.recordId}:${action}:${payload.userId}`;
    return this.auditCorrelationMap.get(correlationKey);
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
    auditId?: number; // ID del log de auditoría para correlación
    richMessage?: string; // Mensaje enriquecido opcional
  }) {
    const admins = await this.prisma.usuario.findMany({
      where: {
        roles: {
          some: { role: { slug: 'ADMIN' } },
        },
        ...(data.excludeUserId
          ? { id: { not: Number(data.excludeUserId) } }
          : {}),
      },
      select: {
        id: true,
        email: true,
        preferencias: {
          select: { actualizacionesSistema: true },
        },
      },
    });

    if (admins.length === 0) {
      this.logger.warn('No se encontraron administradores para notificar.');
      return;
    }

    const toSpanishVerb = (a: 'created' | 'updated' | 'deleted') =>
      a === 'created' ? 'creó' : a === 'updated' ? 'actualizó' : 'eliminó';

    for (const admin of admins) {
      const quiereNotificaciones =
        admin.preferencias?.actualizacionesSistema ?? true;

      if (!quiereNotificaciones) {
        continue;
      }

      const isActor = data.actorId ? admin.id === Number(data.actorId) : false;
      const displayActor = isActor ? 'Tú' : data.actorName || 'Administrador';
      const resourceLabel =
        data.meta?.resourceName || `#${data.meta?.resourceId ?? ''}`;
      const actionVerb = data.meta?.action
        ? toSpanishVerb(data.meta.action)
        : 'actualizó';

      // Usar mensaje enriquecido si existe, sino construir el genérico
      const message = data.richMessage || `${displayActor} ${actionVerb} ${String(data.meta?.resourceType || 'recurso').toLowerCase()} ${resourceLabel}`;

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
            ...(data.auditId ? { auditId: data.auditId } : {}), // Correlación con auditoría
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
