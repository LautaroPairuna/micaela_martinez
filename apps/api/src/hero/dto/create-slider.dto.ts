import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsHref } from './slider.validators';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateSliderDto {
  @IsString()
  @trim()
  @MaxLength(255)
  titulo!: string;

  @IsString()
  @trim()
  @MaxLength(255)
  alt!: string;

  /**
   * Nombre de archivo dentro de public/images/hero
   * Ej: "slide1.webp"
   */
  @IsString()
  @trim()
  @MaxLength(255)
  archivo!: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(255)
  subtitulo?: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(600)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(80)
  etiqueta?: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(80)
  ctaPrimarioTexto?: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(255)
  @IsHref()
  ctaPrimarioHref?: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(80)
  ctaSecundarioTexto?: string;

  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(255)
  @IsHref()
  ctaSecundarioHref?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
