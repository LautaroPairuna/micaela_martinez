// src/account/dto/update-profile.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;
}
