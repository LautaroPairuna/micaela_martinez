import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class ListResourceDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
