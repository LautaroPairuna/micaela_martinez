import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

export enum OrderSource {
  CART = 'cart',
}

export class CreateOrderDto {
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource = OrderSource.CART;

  // Opcional: para snapshot/utm/etc.
  @IsOptional()
  metadatos?: unknown;

  // En tu caso ya venías prohibiendo órdenes mixtas.
  // Si querés permitirlo más adelante, lo hacemos con un flag.
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