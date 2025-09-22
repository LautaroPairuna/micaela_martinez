import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateReviewResponseDto {
  @IsString()
  @IsNotEmpty()
  contenido!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string; // Para respuestas anidadas
}
