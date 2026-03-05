import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

// ==========================================
// Enums
// ==========================================

export enum OrderSource {
  CART = 'cart',
  DIRECT = 'direct',
}

// ==========================================
// DTOs Auxiliares
// ==========================================

export class CreateOrderDto {
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @IsOptional()
  metadatos?: unknown;

  @IsOptional()
  @IsString()
  mode?: 'COURSES_ONLY' | 'PRODUCTS_ONLY';

  @IsOptional()
  @IsNumber()
  direccionEnvioId?: number;

  @IsOptional()
  @IsNumber()
  direccionFacturacionId?: number;
}

// ==========================================
// 2. Pay Order (One-off)
// ==========================================

export class PayOrderDto {
  @IsString()
  token!: string;

  @IsString()
  payment_method_id!: string;

  @IsInt()
  @Min(1)
  issuer_id!: number;

  @IsInt()
  @Min(1)
  installments!: number;

  @IsString()
  payer_email!: string;

  @IsOptional()
  payer_identification?: { type: string; number: string };

  @IsOptional()
  device_session_id?: string;

  @IsString()
  attemptId!: string;
}

// ==========================================
// 3. Subscribe Order (Recurrent)
// ==========================================

export class SubscribeOrderDto {
  @IsString()
  card_token_id!: string;

  @IsString()
  payer_email!: string;

  @IsOptional()
  payer_identification?: { type: string; number: string };

  @IsOptional()
  device_session_id?: string;

  @IsInt()
  @Min(1)
  frequency!: number;

  @IsString()
  frequency_type!: 'days' | 'months';

  @IsString()
  attemptId!: string;
}
