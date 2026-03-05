import { IsEnum, IsOptional, IsString, IsNumber, IsArray, ValidateIf, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderSource {
  CART = 'cart',
  DIRECT = 'direct',
}

export class CreateOrderItemDto {
  @IsString()
  tipo!: string;

  @IsNumber()
  refId!: number;

  @IsNumber()
  cantidad!: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

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

  // ✅ Fix blindado: Si source es undefined o CART, items NO se valida.
  // Si es DIRECT, items debe ser array no vacío.
  @ValidateIf((o) => (o.source ?? OrderSource.CART) !== OrderSource.CART)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}