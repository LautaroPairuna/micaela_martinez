// apps/api/src/orders/interfaces/orden-metadata.interface.service.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  AUTHORIZED = 'authorized',
}

export type FrequencyType = 'months' | 'days';

export interface SubscriptionMetadata {
  id: string;
  frequency?: number;
  frequencyType?: FrequencyType;
  status: string;
  createdAt: string;
  updatedAt?: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  cancelledAt?: string;
}

export interface OrdenMetadata {
  subscription?: SubscriptionMetadata;
  paymentAttempts?: Record<
    string,
    {
      status: 'started' | 'succeeded' | 'failed';
      createdAt?: string;
      updatedAt?: string;
      mpPaymentId?: string;
      statusDetail?: string;
      error?: string;
    }
  >;
  subscriptionAttempts?: Record<
    string,
    {
      status: 'started' | 'succeeded' | 'failed';
      createdAt?: string;
      updatedAt?: string;
      mpPreapprovalId?: string;
      error?: string;
    }
  >;
  [key: string]: any;
}

export class SubscriptionMetadataDto {
  @IsString()
  id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  frequency?: number;

  @IsOptional()
  @IsIn(['months', 'days'])
  frequencyType?: FrequencyType;

  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;

  @IsDateString()
  createdAt!: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @IsOptional()
  @IsDateString()
  nextPaymentDate?: string;

  @IsOptional()
  @IsDateString()
  lastPaymentDate?: string;

  @IsOptional()
  @IsDateString()
  cancelledAt?: string;
}

export class OrdenMetadataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriptionMetadataDto)
  subscription?: SubscriptionMetadataDto;
}

/**
 * ✅ Parser genérico para Json de Prisma o string JSON
 * - Útil para order.metadatos y enrollment.progreso
 */
export function parseJson<T extends object = Record<string, any>>(
  value: any,
): T {
  if (!value) return {} as T;
  try {
    if (typeof value === 'string') return JSON.parse(value) as T;
    return value as T;
  } catch {
    return {} as T;
  }
}

export function stringifyJson(value: any): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

// Alias para mantener compatibilidad temporal
export const parseMetadatos = parseJson;
export const stringifyMetadatos = stringifyJson;
