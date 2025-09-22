import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoNotificacion } from '@prisma/client';

export interface CreateNotificationDto {
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  url?: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private rateLimitCache = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000;
  private readonly MAX_NOTIFICATIONS_PER_MINUTE = 10;

  constructor(private prisma: PrismaService) {
    setInterval(() => this.cleanupRateLimitCache(), 5 * 60 * 1000);
  }

  private checkRateLimit(usuarioId: string): boolean {
    const now = Date.now();
    const key = `rate_limit_${usuarioId}`;
    const current = this.rateLimitCache.get(key);

    if (!current || now > current.resetTime) {
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }
    if (current.count >= this.MAX_NOTIFICATIONS_PER_MINUTE) return false;
    current.count++;
    return true;
  }

  private cleanupRateLimitCache() {
    const now = Date.now();
    for (const [key, value] of this.rateLimitCache.entries()) {
      if (now > value.resetTime) this.rateLimitCache.delete(key);
    }
  }

  async createNotification(data: CreateNotificationDto) {
    const userPreferences = await this.getUserPreferences(data.usuarioId);
    if (!this.shouldCreateNotification(data.tipo, userPreferences)) return null;

    if (!this.checkRateLimit(data.usuarioId)) return null;

    const recentSimilar = await this.findRecentSimilarNotification({
      usuarioId: data.usuarioId,
      tipo: data.tipo,
      contextId: data.metadata?.contextoId,
    });

    if (recentSimilar) {
      return this.updateGroupedNotification(recentSimilar.id, data);
    }

    return this.prisma.notificacion.create({
      data: {
        usuarioId: data.usuarioId,
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        url: data.url,
        metadata: { ...data.metadata, groupCount: 1 },
        leida: false,
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });
  }

  async getUserNotifications(
    usuarioId: string,
    options: { page: number; limit: number; onlyUnread: boolean },
  ) {
    const { page, limit, onlyUnread } = options;
    const where = { usuarioId, ...(onlyUnread && { leida: false }) };

    const [notificaciones, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      }),
      this.prisma.notificacion.count({ where }),
    ]);

    return {
      data: notificaciones,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(usuarioId: string): Promise<number> {
    return this.prisma.notificacion.count({
      where: { usuarioId, leida: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { id, usuarioId: userId },
      data: { leida: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { usuarioId: userId, leida: false },
      data: { leida: true },
    });
  }

  async deleteNotification(id: string, usuarioId: string) {
    return this.prisma.notificacion.deleteMany({
      where: { id, usuarioId },
    });
  }

  async getUserPreferences(usuarioId: string) {
    try {
      let preferences = await (
        this.prisma as any
      ).preferenciasNotificacion.findUnique({
        where: { usuarioId },
      });
      if (!preferences) {
        preferences = await (
          this.prisma as any
        ).preferenciasNotificacion.create({
          data: { usuarioId },
        });
      }
      return preferences;
    } catch {
      return {
        usuarioId,
        nuevaResena: true,
        respuestaResena: true,
        likeResena: true,
        nuevoCurso: true,
        actualizacionCurso: true,
        recordatorioClase: true,
        resumenDiario: false,
        notificacionesInstantaneas: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };
    }
  }

  private shouldCreateNotification(
    tipo: TipoNotificacion,
    preferences: any,
  ): boolean {
    switch (tipo) {
      case TipoNotificacion.RESPUESTA_RESENA:
        return preferences.respuestaResena;
      case TipoNotificacion.LIKE_RESENA:
        return preferences.nuevaResena;
      case TipoNotificacion.MENCION:
        return preferences.nuevaResena;
      default:
        return true;
    }
  }

  private async findRecentSimilarNotification(groupKey: {
    usuarioId: string;
    tipo: TipoNotificacion;
    contextId?: string;
  }) {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    return this.prisma.notificacion.findFirst({
      where: {
        usuarioId: groupKey.usuarioId,
        tipo: groupKey.tipo,
        creadoEn: { gte: twoHoursAgo },
        leida: false,
        ...(groupKey.contextId && {
          metadata: { path: 'contextoId', equals: groupKey.contextId },
        }),
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  private async updateGroupedNotification(
    notificationId: string,
    newData: CreateNotificationDto,
  ) {
    const existing = await this.prisma.notificacion.findUnique({
      where: { id: notificationId },
    });
    if (!existing) return null;

    const currentCount = (existing.metadata as any)?.groupCount || 1;
    const newCount = currentCount + 1;
    const groupedMessage = this.generateGroupedMessage(
      newData.tipo,
      newCount,
      newData.mensaje,
    );

    return this.prisma.notificacion.update({
      where: { id: notificationId },
      data: {
        titulo: newData.titulo,
        mensaje: groupedMessage,
        url: newData.url,
        metadata: {
          ...((existing.metadata as object) || {}),
          ...((newData.metadata as object) || {}),
          groupCount: newCount,
          lastUpdated: new Date().toISOString(),
        },
        creadoEn: new Date(),
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });
  }

  private generateGroupedMessage(
    tipo: TipoNotificacion,
    count: number,
    originalMessage: string,
  ): string {
    if (count <= 1) return originalMessage;
    switch (tipo) {
      case TipoNotificacion.RESPUESTA_RESENA:
        return count === 2
          ? `Tienes 2 nuevas respuestas a tus reseñas`
          : `Tienes ${count} nuevas respuestas a tus reseñas`;
      case TipoNotificacion.LIKE_RESENA:
        return count === 2
          ? `A 2 personas les gustaron tus reseñas`
          : `A ${count} personas les gustaron tus reseñas`;
      case TipoNotificacion.MENCION:
        return count === 2
          ? `Te mencionaron en 2 comentarios`
          : `Te mencionaron en ${count} comentarios`;
      default:
        return `Tienes ${count} notificaciones nuevas`;
    }
  }
}
