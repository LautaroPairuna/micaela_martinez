import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateReviewDto {
  @IsOptional()
  @IsString({ message: 'cursoId debe ser un string válido' })
  @IsNotEmpty({ message: 'cursoId no puede estar vacío' })
  cursoId?: string;

  @IsOptional()
  @IsString({ message: 'productoId debe ser un string válido' })
  @IsNotEmpty({ message: 'productoId no puede estar vacío' })
  productoId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  puntaje!: number;

  @IsString()
  @IsOptional()
  comentario?: string;
}
