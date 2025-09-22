// src/admin/activity.dto.ts
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum ActivityType {
  USER_REGISTERED = 'user_registered',
  COURSE_COMPLETED = 'course_completed',
  PAYMENT_RECEIVED = 'payment_received',
  COURSE_CREATED = 'course_created',
  ADMIN_LOGIN = 'admin_login',
  CONTENT_UPDATED = 'content_updated',
  SYSTEM_EVENT = 'system_event',
  USER_ACTIVITY = 'user_activity',
  ENROLLMENT = 'enrollment',
  DATABASE_SYNC = 'database_sync',
}

export enum ActivitySource {
  WEB = 'web',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export class CreateActivityDto {
  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  user?: string;

  @IsEnum(ActivitySource)
  source: ActivitySource;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  constructor(partial?: Partial<CreateActivityDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
    // Inicialización por defecto para evitar errores de TypeScript
    this.type = partial?.type || ActivityType.SYSTEM_EVENT;
    this.description = partial?.description || '';
    this.source = partial?.source || ActivitySource.SYSTEM;
  }
}
