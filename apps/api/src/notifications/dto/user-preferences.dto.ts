import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  respuestaResena?: boolean;

  @IsOptional()
  @IsBoolean()
  likesResena?: boolean;

  @IsOptional()
  @IsBoolean()
  descuentosFavoritos?: boolean;

  @IsOptional()
  @IsBoolean()
  actualizacionesSistema?: boolean;
}

export class NotificationPreferencesResponseDto {
  id?: string;
  usuarioId?: string;

  respuestaResena?: boolean;
  likesResena?: boolean;
  descuentosFavoritos?: boolean;
  actualizacionesSistema?: boolean;

  creadoEn?: Date;
  actualizadoEn?: Date;
}
