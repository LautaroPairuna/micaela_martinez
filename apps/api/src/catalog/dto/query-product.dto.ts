import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string; // búsqueda (titulo)

  @IsOptional()
  @IsString()
  marca?: string; // slug o id

  @IsOptional()
  @IsString()
  categoria?: string; // slug o id

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['relevancia', 'novedades', 'precio_asc', 'precio_desc', 'rating_desc'])
  sort?:
    | 'relevancia'
    | 'novedades'
    | 'precio_asc'
    | 'precio_desc'
    | 'rating_desc' = 'relevancia';
}
