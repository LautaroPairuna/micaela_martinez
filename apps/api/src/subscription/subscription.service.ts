import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { TipoNotificacion, EstadoOrden } from '@prisma/client';

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
      // Buscar órdenes de suscripción activas que venzan pronto
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Usamos la tabla Orden donde guardamos la info de suscripción real (mpSubscriptionId, nextPaymentDate, etc.)
      const subscriptions = await this.prisma.orden.findMany({
        where: {
          esSuscripcion: true,
          suscripcionActiva: true,
          // Filtrar las que vencen en el rango [hoy, hoy+3días]
          // Asumimos que `proximoPago` o una fecha similar indica el fin del periodo actual
          actualizadoEn: {
            // Fallback temporal si no hay campo específico de fin
            lte: threeDaysFromNow,
          },
        },
        include: { usuario: true },
      });

      // NOTA: La lógica real depende de dónde guardes la fecha de fin.
      // Si usas MercadoPago, deberías chequear `proximoPago` o consultar la API.
      // Aquí implemento un cálculo basado en la fecha de actualización + frecuencia.

      for (const sub of subscriptions) {
        let diasRestantes = 0;

        // Intentar obtener fecha de vencimiento real de metadatos o calcularla
        const meta = sub.metadatos as any;
        let fechaVencimiento = meta?.subscription?.nextPaymentDate
          ? new Date(meta.subscription.nextPaymentDate)
          : null;

        // Si no hay fecha explicita, estimamos basada en la última actualización + 30 días (mensual por defecto)
        if (!fechaVencimiento) {
          const ultimaActualizacion = new Date(sub.actualizadoEn);
          const frecuenciaMeses = sub.suscripcionFrecuencia || 1; // Default 1 mes
          // Sumar meses
          fechaVencimiento = new Date(ultimaActualizacion);
          fechaVencimiento.setMonth(
            fechaVencimiento.getMonth() + frecuenciaMeses,
          );
        }

        // Calcular días restantes
        if (fechaVencimiento) {
          const diffTime = fechaVencimiento.getTime() - now.getTime();
          diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        if (diasRestantes <= 3 && diasRestantes > 0) {
          await this.notificationsService.createNotification({
            usuarioId: String(sub.usuarioId),
            tipo: TipoNotificacion.SISTEMA, // O crear un tipo SUSCRIPCION_VENCIMIENTO
            titulo: 'Tu suscripción vence pronto',
            mensaje: `Tu acceso al curso vence en ${diasRestantes} días. Renueva para no perder el acceso.`,
            url: `/mi-cuenta/suscripcion`, // URL para gestionar la suscripción
            metadata: {
              subscriptionId: sub.id,
              daysLeft: diasRestantes,
            },
          });
          this.logger.log(
            `Notificación de vencimiento enviada a usuario ${sub.usuarioId} (vence en ${diasRestantes} días)`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error al verificar suscripciones', error);
    }
  }

  /**
   * Verifica si un usuario tiene acceso activo a un curso
   */
  async checkCourseAccess(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.inscripcion.findFirst({
      where: {
        usuarioId: Number(userId),
        cursoId: Number(courseId),
      },
    });

    if (!enrollment) return false;

    const progreso = enrollment.progreso as unknown as {
      subscription?: { endDate: string };
    };

    // Si no tiene información de suscripción, asumimos acceso permanente (legacy)
    if (!progreso?.subscription) return true;

    // Verificar si la suscripción está vigente
    const now = new Date();
    const endDate = new Date(progreso.subscription.endDate);

    return endDate > now;
  }

  /**
   * Obtiene información general de la suscripción del usuario
   */
  async getUserInfo(userId: string) {
    // Buscar todas las órdenes de suscripción activas del usuario
    const ordenes = await this.prisma.orden.findMany({
      where: {
        usuarioId: Number(userId),
        esSuscripcion: true,
        OR: [
          { suscripcionActiva: true },
          { estado: EstadoOrden.PAGADO }
        ],
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });

    console.log(`[SubscriptionService] Found ${ordenes.length} active orders for user ${userId}`);

    if (ordenes.length === 0) {
      // Intento de búsqueda fallback (sin suscripcionActiva: true para ver si existen)
      const allSubs = await this.prisma.orden.findMany({
        where: {
          usuarioId: Number(userId),
          esSuscripcion: true,
        },
      });
      if (allSubs.length > 0) {
        console.log(`[SubscriptionService] User has ${allSubs.length} subscription orders, but NONE are marked as suscripcionActiva: true`);
      }

      return {
        isActive: false,
        subscriptions: [],
        includedCourses: [],
      };
    }

    // Obtener cursos incluidos (globalmente para la academia)
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
      // Extraer información de la suscripción desde los metadatos
      const metadatos = (
        orden.metadatos ? JSON.parse(JSON.stringify(orden.metadatos)) : {}
      ) as {
        subscription?: {
          nextPaymentDate?: string;
          frequency?: number;
          frequencyType?: string;
          duration?: number;
          durationType?: string;
        };
      };
      const subscriptionMeta = metadatos.subscription || {};

      const nextPaymentDate = subscriptionMeta.nextPaymentDate
        ? new Date(subscriptionMeta.nextPaymentDate)
        : null;

      let daysLeft = null;
      let hoursLeft = null;

      if (nextPaymentDate) {
        const diffMs = nextPaymentDate.getTime() - now.getTime();
        daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysLeft < 1) {
          hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
        }
      }

      return {
        isActive: true,
        orderId: orden.id,
        subscriptionId: orden.suscripcionId,
        startDate: orden.creadoEn,
        nextPaymentDate: subscriptionMeta.nextPaymentDate || null,
        frequency: subscriptionMeta.frequency || 1,
        frequencyType: subscriptionMeta.frequencyType || 'month',
        daysLeft,
        hoursLeft,
      };
    });

    return {
      isActive: true,
      subscriptions,
      includedCourses: cursos,
    };
  }

  /**
   * Obtiene información de la suscripción de un usuario a un curso
   */
  async getSubscriptionInfo(userId: string, courseId: string) {
    const enrollment = await this.prisma.inscripcion.findFirst({
      where: {
        usuarioId: Number(userId),
        cursoId: Number(courseId),
      },
      include: {
        curso: {
          select: {
            titulo: true,
            slug: true,
          },
        },
      },
    });

    if (!enrollment) return null;

    const progreso = enrollment.progreso as unknown as {
      subscription?: {
        endDate: string;
        duration?: number;
        durationType?: string;
        orderId?: string;
        subscriptionId?: string;
        isActive?: boolean;
      };
    };

    // Si no tiene información de suscripción, devolvemos acceso permanente
    if (!progreso?.subscription) {
      return {
        hasAccess: true,
        isPermanent: true,
        courseName: 'Curso no disponible',
        courseSlug: 'curso-no-disponible',
      };
    }

    const now = new Date();
    const endDate = new Date(progreso.subscription.endDate);
    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      hasAccess: endDate > now,
      isPermanent: false,
      expirationDate: progreso.subscription.endDate,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      duration: progreso.subscription.duration,
      durationType: progreso.subscription.durationType,
      orderId: progreso.subscription.orderId,
      subscriptionId: progreso.subscription.subscriptionId,
      isActive: progreso.subscription.isActive !== false, // Si no está definido, asumimos que está activa
      courseName: 'Curso no disponible',
      courseSlug: 'curso-no-disponible',
    };
  }

  /**
   * Desactiva la suscripción de un usuario
   */
  async cancelSubscription(userId: string, orderId: string): Promise<boolean> {
    try {
      // Buscar todas las inscripciones relacionadas con esta orden
      const enrollments = await this.prisma.inscripcion.findMany({
        where: {
          progreso: {
            equals: JSON.stringify({ subscription: { orderId } }),
          },
          usuarioId: Number(userId),
        },
      });

      if (enrollments.length === 0) {
        this.logger.warn(
          `No se encontraron inscripciones para la orden ${orderId}`,
        );
        return false;
      }

      // Actualizar cada inscripción para marcar la suscripción como inactiva
      for (const enrollment of enrollments) {
        const progreso = enrollment.progreso as unknown as {
          subscription?: { isActive: boolean; orderId?: number };
        };

        if (progreso?.subscription) {
          progreso.subscription.isActive = false;

          await this.prisma.inscripcion.update({
            where: { id: enrollment.id },
            data: { progreso: progreso as any }, // Cast back to any/json for Prisma
          });
        }
      }

      this.logger.log(`Suscripción cancelada para la orden ${orderId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Error al cancelar suscripción: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }
}
