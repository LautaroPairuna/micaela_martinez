import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoNotificacion } from '@prisma/client';
import { UpdateNotificationPreferencesDto } from './dto/user-preferences.dto';

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

  async updateUserPreferences(
    usuarioId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ) {
    try {
      const preferences = await (
        this.prisma as any
      ).preferenciasNotificacion.upsert({
        where: { usuarioId: Number(usuarioId) },
        update: {
          ...updateDto,
          actualizadoEn: new Date(),
        },
        create: {
          usuarioId: Number(usuarioId),
          ...updateDto,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        },
      });
      return preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  async getNotificationStats() {
    try {
      const [totalNotifications, unreadNotifications, recentNotifications] =
        await Promise.all([
          this.prisma.notificacion.count(),
          this.prisma.notificacion.count({ where: { leida: false } }),
          this.prisma.notificacion.count({
            where: {
              creadoEn: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
              },
            },
          }),
        ]);

      return {
        totalNotifications,
        unreadNotifications,
        recentNotifications,
        readRate:
          totalNotifications > 0
            ? ((totalNotifications - unreadNotifications) /
                totalNotifications) *
              100
            : 0,
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw new Error('Failed to get notification statistics');
    }
  }

  async notifyProductDiscount(
    productId: string,
    productName: string,
    newPrice: number,
    discount: number,
  ) {
    try {
      const favorites = await this.prisma.favorito.findMany({
        where: { productoId: Number(productId) },
        select: { usuarioId: true },
      });

      for (const fav of favorites) {
        const prefs = await this.getUserPreferences(String(fav.usuarioId));
        if (prefs?.descuentosFavoritos === false) continue;

        await this.createNotification({
          usuarioId: String(fav.usuarioId),
          tipo: TipoNotificacion.PROMOCION,
          titulo: '¡Descuento en tu Favorito!',
          mensaje: `El producto ${productName} está con un ${discount}% de descuento. Precio actual: $${newPrice}`,
          url: `/productos/${productId}`,
          metadata: {
            productoId: productId,
            isFavoriteDiscount: true,
          },
        });
      }
    } catch (error) {
      console.error('Error notifying product discount:', error);
    }
  }

  async notifyReviewLike(
    reviewId: string,
    likedByUserId: string,
    reviewAuthorId: string,
  ) {
    if (likedByUserId === reviewAuthorId) return; // No notificar si el autor se da like a sí mismo

    try {
      const [likedByUser, review] = await Promise.all([
        this.prisma.usuario.findUnique({
          where: { id: Number(likedByUserId) },
        }),
        this.prisma.resena.findUnique({
          where: { id: Number(reviewId) },
          include: { producto: { select: { titulo: true } } },
        }),
      ]);

      if (!likedByUser || !review) return;

      await this.createNotification({
        usuarioId: reviewAuthorId,
        tipo: TipoNotificacion.LIKE_RESENA,
        titulo: 'Le gustó tu reseña',
        mensaje: `A ${likedByUser.nombre} le gustó tu reseña de ${review.producto?.titulo}`,
        url: `/productos/${review.productoId}#resena-${reviewId}`,
        metadata: {
          contextoId: reviewId,
          likedByUserId,
          productoId: review.productoId,
        },
      });
    } catch (error) {
      console.error('Error notifying review like:', error);
    }
  }

  async notifyReviewResponse(
    responseId: string,
    respondedByUserId: string,
    originalReviewAuthorId: string,
  ) {
    if (respondedByUserId === originalReviewAuthorId) return; // No notificar si responde a su propia reseña

    try {
      const [respondedByUser, response] = await Promise.all([
        this.prisma.usuario.findUnique({
          where: { id: Number(respondedByUserId) },
        }),
        this.prisma.resenaRespuesta.findUnique({
          where: { id: Number(responseId) },
          include: {
            resena: {
              include: { producto: { select: { titulo: true } } },
            },
          },
        }),
      ]);

      if (!respondedByUser || !response) return;

      // Notify Original Author
      await this.createNotification({
        usuarioId: originalReviewAuthorId,
        tipo: TipoNotificacion.RESPUESTA_RESENA,
        titulo: 'Nueva respuesta a tu reseña',
        mensaje: `${respondedByUser.nombre} respondió a tu reseña de ${response.resena.producto?.titulo}`,
        url: `/productos/${response.resena.productoId}#respuesta-${responseId}`,
        metadata: {
          contextoId: response.resenaId,
          respondedByUserId,
          responseId,
          productoId: response.resena.productoId,
        },
      });
    } catch (error) {
      console.error('Error notifying review response:', error);
    }
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
      return this.updateGroupedNotification(Number(recentSimilar.id), data);
    }

    return this.prisma.notificacion.create({
      data: {
        usuarioId: Number(data.usuarioId),
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
    const where = {
      usuarioId: Number(usuarioId),
      ...(onlyUnread && { leida: false }),
    };

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
      where: { usuarioId: Number(usuarioId), leida: false },
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notificacion.update({
      where: { id: Number(notificationId) },
      data: { leida: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { usuarioId: Number(userId) },
      data: { leida: true },
    });
  }

  async deleteNotification(notificationId: string) {
    return this.prisma.notificacion.delete({
      where: { id: Number(notificationId) },
    });
  }

  async getUserPreferences(usuarioId: string) {
    try {
      let preferences = await (
        this.prisma as any
      ).preferenciasNotificacion.findUnique({
        where: { usuarioId: Number(usuarioId) },
      });
      if (!preferences) {
        preferences = await (
          this.prisma as any
        ).preferenciasNotificacion.create({
          data: { usuarioId: Number(usuarioId) },
        });
      }
      return preferences;
    } catch {
      return {
        usuarioId,
        respuestaResena: true,
        likesResena: true,
        descuentosFavoritos: true,
        actualizacionesSistema: true,
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
        return preferences.respuestaResena ?? true;
      case TipoNotificacion.LIKE_RESENA:
        return preferences.likesResena ?? true;
      case TipoNotificacion.PROMOCION:
        return preferences.descuentosFavoritos ?? true;
      case TipoNotificacion.SISTEMA:
        return preferences.actualizacionesSistema ?? true;
      default:
        return true;
    }
  }

  async deleteAllNotifications(userId: string) {
    return this.prisma.notificacion.deleteMany({
      where: { usuarioId: Number(userId) },
    });
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
        usuarioId: Number(groupKey.usuarioId),
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
    notificationId: number,
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
