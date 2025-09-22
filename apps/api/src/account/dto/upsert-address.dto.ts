// src/account/dto/upsert-address.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertAddressDto {
  @IsOptional() @IsString() id?: string; // para actualizar
  @IsOptional() @IsString() etiqueta?: string;
  @IsString() @MaxLength(191) nombre!: string;
  @IsOptional() @IsString() telefono?: string;
  @IsString() @MaxLength(191) calle!: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() pisoDepto?: string;
  @IsString() @MaxLength(191) ciudad!: string;
  @IsString() @MaxLength(191) provincia!: string;
  @IsString() @MaxLength(16) cp!: string;
  @IsOptional() @IsString() pais?: string; // por defecto "AR" en DB
  @IsOptional() @IsBoolean() predeterminada?: boolean;
}
