import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum OrderSource {
  CART = 'cart',
  DIRECT = 'direct',
}

export class CreateOrderFromCartDto {
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource; // siempre cart (o undefined)

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
