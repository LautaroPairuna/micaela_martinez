import { IsEnum, IsNumber, IsOptional, IsString, IsArray, ValidateIf, ValidateNested, ArrayMinSize, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateOrderItemDto {
  @IsString()
  tipo!: string;

  @IsNumber()
  refId!: number;

  @IsNumber()
  cantidad!: number;
}

// ==========================================
// 1. Create Order
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

  // ✅ Fix blindado: Solo validar items si es DIRECT explícitamente.
  // Cualquier otra cosa (undefined, null, CART) se asume como CART.
  @ValidateIf((o) => (o.source ?? OrderSource.CART) === OrderSource.DIRECT)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsOptional()
  items?: CreateOrderItemDto[];
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
