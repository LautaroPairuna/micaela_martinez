import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums para estados de suscripción
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

// Interfaces para tipado estático
export interface SubscriptionMetadata {
  id: string;
  frequency?: number;
  frequencyType?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrdenMetadata {
  subscription?: SubscriptionMetadata;
  [key: string]: any;
}

// Clases para validación en tiempo de ejecución
export class SubscriptionMetadataDto {
  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  frequency?: number;

  @IsOptional()
  @IsString()
  frequencyType?: string;

  @IsEnum(SubscriptionStatus)
  status!: string;

  @IsDateString()
  createdAt!: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;
}

export class OrdenMetadataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriptionMetadataDto)
  subscription?: SubscriptionMetadataDto;
}

// Funciones de utilidad para manejo seguro de metadatos
export function parseMetadatos(metadatos: any): OrdenMetadata {
  if (!metadatos) return {};

  try {
    if (typeof metadatos === 'string') {
      return JSON.parse(metadatos);
    }
    return metadatos;
  } catch (error) {
    console.error('Error al parsear metadatos:', error);
    return {};
  }
}

export function stringifyMetadatos(metadatos: OrdenMetadata): string {
  try {
    return JSON.stringify(metadatos);
  } catch (error) {
    console.error('Error al convertir metadatos a string:', error);
    return '{}';
  }
}
