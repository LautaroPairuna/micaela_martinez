// src/orders/dto/orders.dto.ts
import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoOrden, TipoItemOrden } from '../../generated/prisma/client';

export class CreateOrderItemDto {
  @IsEnum(TipoItemOrden)
  tipo!: TipoItemOrden;

  @IsString()
  refId!: string;

  @IsString()
  titulo!: string;

  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @IsNumber()
  @IsPositive()
  precioUnitario!: number;
}

export class CreateAddressDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  etiqueta?: string;

  @IsString()
  calle!: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  pisoDepto?: string;

  @IsString()
  ciudad!: string;

  @IsString()
  provincia!: string;

  @IsString()
  cp!: string;

  @IsOptional()
  @IsString()
  pais?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ValidateNested()
  @Type(() => CreateAddressDto)
  direccionEnvio!: CreateAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  direccionFacturacion?: CreateAddressDto;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  referenciaPago?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(EstadoOrden)
  estado!: EstadoOrden;

  @IsOptional()
  @IsString()
  referenciaPago?: string;
}

export class MercadoPagoPaymentDto {
  @IsString()
  token!: string;

  @IsString()
  paymentMethodId!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  identificationType?: string;

  @IsOptional()
  @IsString()
  identificationNumber?: string;
}

export class MercadoPagoSubscriptionDto extends MercadoPagoPaymentDto {
  @IsNumber()
  @IsPositive()
  frequency!: number;

  @IsString()
  frequencyType!: string;
}
