// src/account/dto/add-favorite.dto.ts
import { IsString } from 'class-validator';
export class AddFavoriteDto {
  @IsString()
  productoId!: string;
}
