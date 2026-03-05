import { IsEnum, IsOptional, IsString, IsNumber, IsArray, ValidateIf, ValidateNested } from 'class-validator';
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

  // ✅ Validación condicional: Si no es CART, items es obligatorio.
  @ValidateIf((o) => o.source !== OrderSource.CART)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @IsOptional() // Permite que sea undefined si source=CART, pero si source!=CART el ValidateIf lo fuerza
  items?: CreateOrderItemDto[];
}