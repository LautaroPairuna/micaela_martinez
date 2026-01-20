import { IsEnum, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum CartItemType {
  PRODUCTO = 'producto',
  CURSO = 'curso',
}

export class CartItemDto {
  @IsEnum(CartItemType)
  tipo!: CartItemType;

  @IsOptional()
  productoId?: number | string;

  @IsOptional()
  cursoId?: number | string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class SyncCartDto {
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];
}
