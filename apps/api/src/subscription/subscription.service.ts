// apps/api/src/subscription/subscription.service.ts
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { TipoNotificacion, EstadoOrden } from '@prisma/client';
import { MpSubscriptionService } from '../mercadopago/mp-subscription.service';

type ParsedMeta = {
  subscription?: {
    endDate?: string;
    isActive?: boolean;
    nextPaymentDate?: string;
    frequency?: number;
    frequencyType?: string;
    status?: string;
    orderId?: number;
    subscriptionId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mpSubscriptionService: MpSubscriptionService,
  ) {}

  @Cron('0 8 * * *')
  async checkExpiringSubscriptions() {
    this.logger.log('Verificando suscripciones próximas a vencer...');

    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

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

    // fallback legacy JSON
    const progreso = parseProgreso(enrollment.progreso);

    if (!progreso?.subscription?.endDate) {
      if (progreso?.subscription) {
        return progreso.subscription.isActive === true;
      }
      return true; // legacy/permanente
    }

    const endDate = new Date(progreso.subscription.endDate);
    return endDate > now && progreso.subscription.isActive !== false;
  }

  async getUserInfo(userId: string) {
    const userIdNum = Number(userId);
    if (!Number.isFinite(userIdNum)) {
      this.logger.error(
        `[SubscriptionService] Invalid userId received: ${userId}`,
      );
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
      include: {
        pagos: {
          where: {
            provider: 'MERCADOPAGO',
            kind: {
              in: ['SUBSCRIPTION_PREAPPROVAL', 'SUBSCRIPTION_PAYMENT'],
            },
          },
          orderBy: { creadoEn: 'desc' },
          take: 5,
          select: {
            kind: true,
            metadatos: true,
          },
        },
      },
    });

    if (ordenes.length === 0) {
      return {
        isActive: false,
        subscriptions: [],
        includedCourses: [],
      };
    }

    const cursos = await this.prisma.curso.findMany({
      where: { destacado: true, publicado: true },
      select: { id: true, titulo: true, slug: true, portada: true },
    });

    const now = new Date();

    const subscriptions = await Promise.all(
      ordenes.map(async (orden) => {
        const meta = parseProgreso(orden.metadatos);
        const preapprovalPayment = orden.pagos.find(
          (p) => p.kind === 'SUBSCRIPTION_PREAPPROVAL',
        );
        const preapprovalMeta = parseProgreso(preapprovalPayment?.metadatos);

        let nextPaymentDate = orden.suscripcionProximoPago
          ? orden.suscripcionProximoPago.toISOString()
          : (meta?.subscription?.nextPaymentDate ??
            (typeof preapprovalMeta?.next === 'string'
              ? preapprovalMeta.next
              : null));

        if (orden.suscripcionId) {
          const parsedNext = nextPaymentDate ? new Date(nextPaymentDate) : null;
          const shouldRefreshFromMp =
            !parsedNext ||
            Number.isNaN(parsedNext.getTime()) ||
            parsedNext <= now;

          if (shouldRefreshFromMp) {
            try {
              const pre = await this.mpSubscriptionService.getPreapproval(
                orden.suscripcionId,
              );
              const freshNext =
                typeof pre?.next_payment_date === 'string'
                  ? pre.next_payment_date
                  : null;

              if (freshNext) {
                nextPaymentDate = freshNext;
                await this.prisma.orden.update({
                  where: { id: orden.id },
                  data: {
                    suscripcionProximoPago: new Date(freshNext),
                    metadatos: {
                      ...(meta ?? {}),
                      subscription: {
                        ...((meta?.subscription as Record<string, unknown>) ??
                          {}),
                        nextPaymentDate: freshNext,
                        status:
                          typeof pre?.status === 'string'
                            ? pre.status
                            : meta?.subscription?.status ?? 'processing',
                      },
                    } as any,
                  },
                });
              }
            } catch {
              // seguimos con el mejor dato local disponible
            }
          }
        }

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
          frequency:
            orden.suscripcionFrecuencia ?? meta?.subscription?.frequency ?? 1,
          frequencyType:
            orden.suscripcionTipoFrecuencia ??
            meta?.subscription?.frequencyType ??
            'months',
          daysLeft,
          hoursLeft,
          status:
            meta?.subscription?.status ??
            (orden.suscripcionActiva ? 'active' : 'processing'),
        };
      }),
    );

    return {
      isActive: subscriptions.some((s) => s.isActive),
      subscriptions,
      includedCourses: cursos,
    };
  }

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

    if (enrollment.subscriptionEndDate) {
      const end = enrollment.subscriptionEndDate;
      const daysLeft = Math.ceil(
        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

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

    const progreso = parseProgreso(enrollment.progreso);

    if (!progreso?.subscription?.endDate) {
      if (progreso?.subscription) {
        return {
          hasAccess: progreso.subscription.isActive === true,
          isPermanent: false,
          orderId: progreso.subscription.orderId ?? null,
          subscriptionId: progreso.subscription.subscriptionId ?? null,
          isActive: progreso.subscription.isActive === true,
          courseName: enrollment.curso.titulo,
          courseSlug: enrollment.curso.slug,
        };
      }
      return {
        hasAccess: true,
        isPermanent: true,
        courseName: enrollment.curso.titulo,
        courseSlug: enrollment.curso.slug,
      };
    }

    const endDate = new Date(progreso.subscription.endDate);
    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      hasAccess: endDate > now && progreso.subscription.isActive !== false,
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

  async ensurePendingEnrollmentsForSubscriptionOrder(
    userId: number,
    orderId: number,
  ) {
    if (!Number.isFinite(userId) || !Number.isFinite(orderId)) {
      throw new BadRequestException('Parámetros inválidos');
    }

    const order = await this.prisma.orden.findFirst({
      where: {
        id: Number(orderId),
        usuarioId: Number(userId),
        tipo: 'SUBSCRIPTION',
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de suscripción no encontrada');
    }

    const courseItems = order.items.filter((item) => item.tipo === 'CURSO');
    if (courseItems.length === 0) {
      return { created: 0, updated: 0 };
    }

    const nowIso = new Date().toISOString();
    const frequency = order.suscripcionFrecuencia ?? 1;
    const frequencyType = order.suscripcionTipoFrecuencia ?? 'months';
    let created = 0;
    let updated = 0;

    for (const item of courseItems) {
      const existing = await this.prisma.inscripcion.findUnique({
        where: {
          usuarioId_cursoId: {
            usuarioId: Number(userId),
            cursoId: Number(item.refId),
          },
        },
      });

      const currentProgress = parseProgreso(existing?.progreso) ?? {};
      const nextProgress: ParsedMeta = {
        ...currentProgress,
        subscription: {
          ...(currentProgress.subscription || {}),
          orderId: order.id,
          subscriptionId: order.suscripcionId ?? undefined,
          status: 'authorized',
          isActive: false,
          startDate: nowIso,
          frequency,
          frequencyType,
        },
      };

      if (existing) {
        await this.prisma.inscripcion.update({
          where: { id: existing.id },
          data: {
            estado: 'ACTIVADA',
            progreso: nextProgress as any,
            subscriptionOrderId: order.id,
            subscriptionId: order.suscripcionId,
            subscriptionActive: false,
            subscriptionEndDate: null,
          },
        });
        updated += 1;
      } else {
        await this.prisma.inscripcion.create({
          data: {
            usuarioId: Number(userId),
            cursoId: Number(item.refId),
            estado: 'ACTIVADA',
            progreso: nextProgress as any,
            subscriptionOrderId: order.id,
            subscriptionId: order.suscripcionId,
            subscriptionActive: false,
            subscriptionEndDate: null,
          },
        });
        created += 1;
      }
    }

    return { created, updated };
  }

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
        this.logger.warn(
          `No se encontraron inscripciones para la orden ${orderId}`,
        );
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

      await Promise.all(
        enrollments.map(async (e) => {
          const progreso = parseProgreso(e.progreso);
          if (!progreso?.subscription) return;

          const next: ParsedMeta = {
            ...progreso,
            subscription: {
              ...(progreso.subscription || {}),
              isActive: false,
              cancelledAt: new Date().toISOString(),
              status: 'cancelled',
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

  async cancelOrderSubscription(userId: number, orderId: number) {
    if (!Number.isFinite(userId) || !Number.isFinite(orderId)) {
      throw new BadRequestException('Parámetros inválidos');
    }

    const order = await this.prisma.orden.findFirst({
      where: {
        id: Number(orderId),
        usuarioId: Number(userId),
        tipo: 'SUBSCRIPTION',
      },
      select: {
        id: true,
        suscripcionId: true,
        metadatos: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de suscripción no encontrada');
    }
    if (!order.suscripcionId) {
      throw new BadRequestException(
        'La orden no tiene una suscripción asociada',
      );
    }

    const cancellation = await this.mpSubscriptionService.cancelSubscription(
      order.suscripcionId,
    );

    const currentMeta = parseProgreso(order.metadatos) ?? {};
    const currentSubscription =
      currentMeta.subscription && typeof currentMeta.subscription === 'object'
        ? currentMeta.subscription
        : {};

    await this.prisma.orden.update({
      where: { id: order.id },
      data: {
        suscripcionActiva: false,
        suscripcionProximoPago: null,
        metadatos: {
          ...currentMeta,
          subscription: {
            ...currentSubscription,
            status: 'cancelled',
            isActive: false,
            cancelledAt: new Date().toISOString(),
            cancellation,
          },
        } as any,
      },
    });

    const enrollmentsCancelled = await this.cancelSubscription(
      String(userId),
      String(order.id),
    );

    if (!enrollmentsCancelled) {
      await this.prisma.inscripcion.updateMany({
        where: {
          usuarioId: Number(userId),
          OR: [
            { subscriptionOrderId: order.id },
            { subscriptionId: order.suscripcionId },
          ],
        },
        data: {
          subscriptionActive: false,
        },
      });
    }

    return {
      ok: true,
      orderId: order.id,
      subscriptionId: order.suscripcionId,
      status: 'cancelled',
    };
  }
}

function parseProgreso(value: unknown): ParsedMeta | null {
  if (value == null) return null;
  if (typeof value === 'object') return value as ParsedMeta;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ParsedMeta;
    } catch {
      return null;
    }
  }
  return null;
}
