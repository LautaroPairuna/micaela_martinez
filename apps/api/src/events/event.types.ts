// src/events/event.types.ts
export const EventTypes = {
  RESOURCE_CREATED: 'resource:created',
  RESOURCE_UPDATED: 'resource:updated',
  RESOURCE_DELETED: 'resource:deleted',

  USER_REGISTERED: 'auth:registered',
  USER_LOGIN: 'auth:login',
  USER_LOGOUT: 'auth:logout',

  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info',

  // Agrego este alias porque tu listener usa SYSTEM_EVENT
  SYSTEM_EVENT: 'system:event',

  // Nuevo evento para correlación de auditoría
  AUDIT_CREATED: 'audit:created',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

type Dict = Record<string, any>;

export type BaseEventPayload = {
  timestamp?: Date;
  endpoint?: string; // usado en listener + auth.service
  ipAddress?: string; // usado en listener + auth.service
  userAgent?: string;
  userId?: string | number | null; // puede venir number/undefined
};

export type ResourceEventPayload = BaseEventPayload & {
  tableName: string;
  action: 'create' | 'update' | 'delete';
  recordId: string | number; // en listener lo normalizamos a string
  previousData?: Dict; // el listener los usa
  data?: Dict; // el listener los usa
};

export type AuthEventPayload = BaseEventPayload & {
  action: 'login' | 'logout' | 'register';
  userEmail: string;
};

export type SystemEventPayload = BaseEventPayload & {
  code: string;
  level?: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  id?: string | number; // el listener lo consulta
  data?: Dict; // opcional para adjuntos
};

export type AuditCreatedPayload = BaseEventPayload & {
  auditId: number;
  tableName: string;
  recordId: string;
  action: string;
  originalEvent: ResourceEventPayload | AuthEventPayload | SystemEventPayload;
};
