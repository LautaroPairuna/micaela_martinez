// apps/api/src/subscription/subscription.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { TipoNotificacion, EstadoOrden } from '@prisma/client';
import { parseJson } from '../orders/interfaces/orden-metadata.interface';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Verifica suscripciones próximas a vencer y envía notificaciones
   * Se ejecuta diariamente a las 8:00 AM
   */
  @Cron('0 8 * * *')
  async checkExpiringSubscriptions() {
    this.logger.log('Verificando suscripciones próximas a vencer...');

    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // ✅ FUENTE DE VERDAD: Orden.suscripcionProximoPago
      const subscriptions = await this.prisma.orden.findMany({
        where: {
          esSuscripcion: true,
          suscripcionActiva: true,
          suscripcionProximoPago: {
            gte: now,
            lte: threeDaysFromNow,
          },
        },
        include: { usuario: true },
      });

      for (const sub of subscriptions) {
        const nextDate = sub.suscripcionProximoPago;
        if (!nextDate) continue;

        const diffTime = nextDate.getTime() - now.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diasRestantes <= 3 && diasRestantes > 0) {
          await this.notificationsService.createNotification({
            usuarioId: String(sub.usuarioId),
            tipo: TipoNotificacion.SISTEMA,
            titulo: 'Tu suscripción vence pronto',
            mensaje: `Tu acceso vence en ${diasRestantes} días. Si el próximo pago falla podrías perder acceso.`,
            url: `/perfil/ordenes/${sub.id}`,
            metadata: {
              orderId: sub.id,
              subscriptionId: sub.suscripcionId,
              daysLeft: diasRestantes,
              type: 'subscription_expiring',
            },
          });

          this.logger.log(
            `Notificación enviada a usuario ${sub.usuarioId} (order ${sub.id}, vence en ${diasRestantes} días)`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error al verificar suscripciones', error as any);
    }
  }

  /**
   * Verifica si un usuario tiene acceso activo a un curso
   */
  async checkCourseAccess(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.inscripcion.findUnique({
      where: {
        usuarioId_cursoId: {
          usuarioId: Number(userId),
          cursoId: Number(courseId),
        },
      },
    });

    if (!enrollment) return false;

    const now = new Date();

    // ✅ PRIORIDAD: columnas denormalizadas
    if (enrollment.subscriptionEndDate) {
      const isActive = enrollment.subscriptionActive !== false;
      return isActive && enrollment.subscriptionEndDate > now;
    }

    // Fallback legacy: mirar JSON
    const progreso = parseJson<any>(enrollment.progreso);

    if (!progreso?.subscription?.endDate) {
      // Si no hay info de sub => acceso permanente (legacy)
      return true;
    }

    const endDate = new Date(progreso.subscription.endDate);
    return endDate > now;
  }

  /**
   * Obtiene información general de la suscripción del usuario
   */
  async getUserInfo(userId: string) {
    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum)) {
      this.logger.error(`[SubscriptionService] Invalid userId received: ${userId}`);
      return { isActive: false, subscriptions: [], includedCourses: [] };
    }

    const ordenes = await this.prisma.orden.findMany({
      where: {
        usuarioId: userIdNum,
        esSuscripcion: true,
        OR: [
          { suscripcionActiva: true },
          { estado: EstadoOrden.PAGADO },
          { suscripcionId: { not: null } },
        ],
      },
      orderBy: { creadoEn: 'desc' },
    });

    if (ordenes.length === 0) {
      return {
        isActive: false,
        subscriptions: [],
        includedCourses: [],
      };
    }

    // Cursos incluidos (según tu lógica actual)
    const cursos = await this.prisma.curso.findMany({
      where: {
        destacado: true,
        publicado: true,
      },
      select: {
        id: true,
        titulo: true,
        slug: true,
        portada: true,
      },
    });

    const now = new Date();

    const subscriptions = ordenes.map((orden) => {
      const meta = parseJson<any>(orden.metadatos);

      const nextPaymentDate = orden.suscripcionProximoPago
        ? orden.suscripcionProximoPago.toISOString()
        : meta?.subscription?.nextPaymentDate ?? null;

      const next = nextPaymentDate ? new Date(nextPaymentDate) : null;

      let daysLeft: number | null = null;
      let hoursLeft: number | null = null;

      if (next) {
        const diffMs = next.getTime() - now.getTime();
        daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysLeft < 1) hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
      }

      return {
        isActive: orden.suscripcionActiva !== false,
        orderId: orden.id,
        subscriptionId: orden.suscripcionId,
        startDate: orden.creadoEn,
        nextPaymentDate,
        frequency: orden.suscripcionFrecuencia ?? meta?.subscription?.frequency ?? 1,
        frequencyType: orden.suscripcionTipoFrecuencia ?? meta?.subscription?.frequencyType ?? 'months',
        daysLeft,
        hoursLeft,
        status: meta?.subscription?.status ?? (orden.suscripcionActiva ? 'active' : 'processing'),
      };
    });

    return {
      isActive: subscriptions.some((s) => s.isActive),
      subscriptions,
      includedCourses: cursos,
    };
  }

  /**
   * Obtiene información de la suscripción de un usuario a un curso
   */
  async getSubscriptionInfo(userId: string, courseId: string) {
    const enrollment = await this.prisma.inscripcion.findUnique({
      where: {
        usuarioId_cursoId: {
          usuarioId: Number(userId),
          cursoId: Number(courseId),
        },
      },
      include: {
        curso: {
          select: { titulo: true, slug: true },
        },
      },
    });

    if (!enrollment) return null;

    const now = new Date();

    // ✅ PRIORIDAD: columnas
    if (enrollment.subscriptionEndDate) {
      const end = enrollment.subscriptionEndDate;
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        hasAccess: enrollment.subscriptionActive !== false && end > now,
        isPermanent: false,
        expirationDate: end.toISOString(),
        daysLeft: Math.max(daysLeft, 0),
        orderId: enrollment.subscriptionOrderId ?? null,
        subscriptionId: enrollment.subscriptionId ?? null,
        isActive: enrollment.subscriptionActive !== false,
        courseName: enrollment.curso.titulo,
        courseSlug: enrollment.curso.slug,
      };
    }

    // Fallback: JSON legacy
    const progreso = parseJson<any>(enrollment.progreso);

    if (!progreso?.subscription?.endDate) {
      return {
        hasAccess: true,
        isPermanent: true,
        courseName: enrollment.curso.titulo,
        courseSlug: enrollment.curso.slug,
      };
    }

    const endDate = new Date(progreso.subscription.endDate);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasAccess: endDate > now,
      isPermanent: false,
      expirationDate: progreso.subscription.endDate,
      daysLeft: Math.max(daysLeft, 0),
      orderId: progreso.subscription.orderId ?? null,
      subscriptionId: progreso.subscription.subscriptionId ?? null,
      isActive: progreso.subscription.isActive !== false,
      courseName: enrollment.curso.titulo,
      courseSlug: enrollment.curso.slug,
    };
  }

  /**
   * Desactiva la suscripción de un usuario (por orderId)
   * ✅ Robusto: usa columnas (subscriptionOrderId)
   */
  async cancelSubscription(userId: string, orderId: string): Promise<boolean> {
    try {
      const orderIdNum = Number(orderId);
      if (!Number.isFinite(orderIdNum)) return false;

      const enrollments = await this.prisma.inscripcion.findMany({
        where: {
          usuarioId: Number(userId),
          subscriptionOrderId: orderIdNum,
        },
      });

      if (enrollments.length === 0) {
        this.logger.warn(`No se encontraron inscripciones para la orden ${orderId}`);
        return false;
      }

      await this.prisma.inscripcion.updateMany({
        where: {
          usuarioId: Number(userId),
          subscriptionOrderId: orderIdNum,
        },
        data: {
          subscriptionActive: false,
        },
      });

      // Mantener JSON consistente (opcional pero recomendado)
      await Promise.all(
        enrollments.map(async (e) => {
          const progreso = parseJson<any>(e.progreso);
          if (!progreso?.subscription) return;

          const next = {
            ...progreso,
            subscription: {
              ...(progreso.subscription || {}),
              isActive: false,
              cancelledAt: new Date().toISOString(),
            },
          };

          await this.prisma.inscripcion.update({
            where: { id: e.id },
            data: { progreso: next as any },
          });
        }),
      );

      this.logger.log(`Suscripción cancelada para orden ${orderId}`);
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al cancelar suscripción: ${msg}`, error as any);
      return false;
    }
  }
}
