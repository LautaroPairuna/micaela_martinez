export class UpdateNotificationPreferencesDto {
  // Notificaciones de reseñas
  nuevaResena?: boolean;
  respuestaResena?: boolean;

  // Notificaciones del sistema
  actualizacionesSistema?: boolean;
  mantenimiento?: boolean;

  // Notificaciones de moderación (solo para moderadores)
  reporteContenido?: boolean;
  contenidoPendiente?: boolean;

  // Configuración de frecuencia
  resumenDiario?: boolean; // Agrupar notificaciones en resumen diario
  notificacionesInstantaneas?: boolean; // Recibir notificaciones inmediatas
}

export class NotificationPreferencesResponseDto {
  id?: string;
  usuarioId?: string;

  // Tipos de notificaciones
  nuevaResena?: boolean;
  respuestaResena?: boolean;
  actualizacionesSistema?: boolean;
  mantenimiento?: boolean;
  reporteContenido?: boolean;
  contenidoPendiente?: boolean;

  // Configuración de frecuencia
  resumenDiario?: boolean;
  notificacionesInstantaneas?: boolean;

  // Metadatos
  creadoEn?: Date;
  actualizadoEn?: Date;
}
