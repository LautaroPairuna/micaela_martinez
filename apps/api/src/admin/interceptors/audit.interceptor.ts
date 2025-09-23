import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Reflector } from '@nestjs/core';
import { EventTypes, ResourceEventPayload } from '../../events/event.types';
import { AuditService } from '../audit.service';

import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para marcar endpoints que deben ser auditados
 */
export const Auditable = (tableName: string, action?: string) =>
  SetMetadata('auditable', { tableName, action });

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Verificar si el método está marcado como auditable
    const auditableMetadata = this.reflector.get('auditable', handler);

    if (!auditableMetadata) {
      return next.handle();
    }

    const { tableName, action } = auditableMetadata;
    const userId = this.extractUserId(request);

    if (!userId) {
      // Si no hay usuario autenticado, no auditamos
      return next.handle();
    }

    const startTime = Date.now();
    const method = request.method;
    const url = request.originalUrl;

    // Determinar la acción basada en el método HTTP si no se especifica
    const auditAction = action || this.getActionFromMethod(method);

    // Obtener el ID del registro desde los parámetros
    const recordId = this.extractRecordId(request);

    // Capturar datos del request para CREATE/UPDATE
    const requestData = ['POST', 'PUT', 'PATCH'].includes(method)
      ? request.body
      : undefined;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const duration = Date.now() - startTime;

          // Para operaciones de creación, obtener el ID del response
          const finalRecordId =
            recordId || this.extractIdFromResponse(response);

          if (finalRecordId) {
            try {
              await this.auditService.logCrudAction(
                auditAction,
                tableName,
                finalRecordId,
                userId || 'system', // Asegurar que userId nunca sea undefined
                undefined, // oldData - se podría implementar para UPDATE
                requestData,
                request,
              );
            } catch (error: unknown) {
              // Capturar errores específicos del servicio de auditoría
              const auditError = error as Error;
              this.logger.error(`Error en auditoría: ${auditError.message || 'Error desconocido'}`, auditError);
              // No propagamos el error para no afectar la operación principal
            }
          }

          this.logger.debug(
            `Audit logged: ${auditAction} on ${tableName} (${finalRecordId}) by user ${userId} - ${duration}ms`,
          );
        } catch (error) {
          this.logger.error('Error in audit logging:', error);
        }
      }),
      catchError((error) => {
        // Log del error también
        this.logger.error(
          `Failed operation: ${auditAction} on ${tableName} by user ${userId}`,
          error,
        );
        throw error;
      }),
    );
  }

  /**
   * Extrae el ID del usuario del request (desde JWT o sesión)
   */
  private extractUserId(request: Request): string | undefined {
    // Asumiendo que el usuario está en request.user después de la autenticación JWT
    return (request as any).user?.id || (request as any).user?.sub;
  }

  /**
   * Extrae el ID del registro desde los parámetros de la URL
   */
  private extractRecordId(request: Request): string | undefined {
    return request.params?.id || request.params?.recordId;
  }

  /**
   * Extrae el ID del registro desde la respuesta (para operaciones CREATE)
   */
  private extractIdFromResponse(response: any): string | undefined {
    if (!response) return undefined;

    // Diferentes formatos de respuesta posibles
    return response.id || response.data?.id || response.result?.id;
  }

  /**
   * Mapea métodos HTTP a acciones de auditoría
   */
  private getActionFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'GET':
        return 'VIEW';
      default:
        return 'UNKNOWN';
    }
  }
}

/**
 * Interceptor específico para operaciones de administración
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any).user?.id;

    if (!userId) {
      return next.handle();
    }

    // Detectar automáticamente la tabla y acción desde la URL
    const { tableName, action, recordId } = this.parseAdminUrl(
      request.originalUrl,
      request.method,
    );

    if (!tableName) {
      return next.handle();
    }

    const requestData = ['POST', 'PUT', 'PATCH'].includes(request.method)
      ? request.body
      : undefined;
    const endpoint = `${request.method} ${request.originalUrl}`;
    const userAgent = request.get('User-Agent');
    const ipAddress = this.getClientIp(request);

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const finalRecordId =
            recordId || this.extractIdFromResponse(response);

          if (finalRecordId && action !== 'VIEW') {
            // Determinar el tipo de evento basado en la acción
            let eventType: string;
            switch (action) {
              case 'CREATE':
                eventType = EventTypes.RESOURCE_CREATED;
                break;
              case 'UPDATE':
                eventType = EventTypes.RESOURCE_UPDATED;
                break;
              case 'DELETE':
                eventType = EventTypes.RESOURCE_DELETED;
                break;
              default:
                eventType = EventTypes.SYSTEM_EVENT;
            }

            // Crear payload del evento
            const payload: ResourceEventPayload = {
              tableName: tableName,
              recordId: finalRecordId,
              action: (action || 'create').toLowerCase() as
                | 'create'
                | 'update'
                | 'delete',
              userId,
              endpoint,
              data: requestData,
              previousData: undefined, // No tenemos datos previos en este contexto
              userAgent,
              ipAddress,
            };

            // Emitir el evento
            this.eventEmitter.emit(eventType, payload);
          }
        } catch (error) {
          this.logger.error('Error in admin audit logging:', error);
        }
      }),
    );
  }

  /**
   * Extrae el nombre del recurso desde la respuesta o los datos de la solicitud
   */
  private extractResourceName(
    response: any,
    requestData: any,
  ): string | undefined {
    // Intentar extraer un nombre descriptivo del recurso
    if (response) {
      return (
        response.nombre ||
        response.name ||
        response.title ||
        response.email ||
        response.descripcion ||
        response.description ||
        (response.data &&
          (response.data.nombre ||
            response.data.name ||
            response.data.title ||
            response.data.email))
      );
    }

    if (requestData) {
      return (
        requestData.nombre ||
        requestData.name ||
        requestData.title ||
        requestData.email ||
        requestData.descripcion ||
        requestData.description
      );
    }

    return undefined;
  }

  /**
   * Obtiene la dirección IP del cliente
   */
  private getClientIp(request: Request): string {
    return (
      request.ip ||
      (request.headers['x-forwarded-for'] as string) ||
      (request.socket && request.socket.remoteAddress) ||
      'unknown'
    );
  }

  /**
   * Parsea la URL de admin para extraer tabla, acción y ID
   */
  private parseAdminUrl(
    url: string,
    method: string,
  ): { tableName?: string; action?: string; recordId?: string } {
    // Patrones para URLs de admin:
    // /admin/tables/Usuario/records -> tabla: Usuario
    // /admin/tables/Usuario/records/123 -> tabla: Usuario, recordId: 123
    // /admin/dashboard -> no auditable

    const adminTableMatch = url.match(
      /\/admin\/tables\/([^/]+)\/records(?:\/([^/]+))?/,
    );

    if (adminTableMatch) {
      const tableName = adminTableMatch[1];
      const recordId = adminTableMatch[2];
      const action = this.getActionFromMethod(method);

      return { tableName, action, recordId };
    }

    // Otras rutas específicas de admin
    const specificRoutes: Record<string, string> = {
      '/admin/users': 'Usuario',
      '/admin/courses': 'Curso',
      '/admin/products': 'Producto',
      '/admin/orders': 'Orden',
    };

    for (const [route, table] of Object.entries(specificRoutes)) {
      if (url.startsWith(route)) {
        const action = this.getActionFromMethod(method);
        const recordId = url.split('/').pop();
        return { tableName: table, action, recordId };
      }
    }

    return {};
  }

  private getActionFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'GET':
        return 'VIEW';
      default:
        return 'UNKNOWN';
    }
  }

  private extractIdFromResponse(response: any): string | undefined {
    if (!response) return undefined;
    return response.id || response.data?.id || response.result?.id;
  }
}
