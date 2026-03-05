//src/orders/dto/pay-order.dto.ts

import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PayOrderDto {
  // token de tarjeta (Bricks)
  @IsString()
  token!: string;

  @IsString()
  payment_method_id!: string;

  // issuer_id debe ser number (MercadoPago types)
  @IsInt()
  @Min(1)
  issuer_id!: number;

  @IsInt()
  @Min(1)
  installments!: number;

  // payer minimal (no PII en logs)
  @IsString()
  payer_email!: string;

  @IsOptional()
  payer_identification?: { type: string; number: string };

  @IsOptional()
  device_session_id?: string; // MP_DEVICE_SESSION_ID (recomendado)

  // attempt id (anti doble click + idempotencia)
  @IsString()
  attemptId!: string;
}