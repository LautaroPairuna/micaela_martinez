// apps/api/src/orders/orders.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventTypes } from '../events/event.types';
import { PrismaService } from '../prisma/prisma.service';
import { MpPaymentService } from './services/mp-payment.service';
import { MpSubscriptionService } from './services/mp-subscription.service';
import { NotificationsService } from '../notifications/notifications.service';
import { parseMetadatos } from './interfaces/orden-metadata.interface';

import {
  CreateOrderDto,
  MercadoPagoPaymentDto,
  MercadoPagoSubscriptionDto,
} from './dto/orders.dto';
import {
  Prisma,
  EstadoOrden,
  TipoItemOrden,
  EstadoInscripcion,
  ItemOrden,
  TipoNotificacion,
} from '@prisma/client';

type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | string;

const json = (v: unknown) => v as Prisma.InputJsonValue;

const toInt = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`ID inválido: ${v}`);
  return n;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mpPaymentService: MpPaymentService,
    private readonly mpSubscriptionService: MpSubscriptionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Crea una orden one-off (no suscripción) */
  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const {
      items,
      direccionEnvio,
      direccionFacturacion,
      moneda,
      referenciaPago,
    } = createOrderDto;

    // Validar items y calcular total
    let total = new Prisma.Decimal(0);
    const validatedItems: {
      tipo: TipoItemOrden;
      refId: number;
      titulo: string;
      cantidad: number;
      precioUnitario: number;
    }[] = [];

    for (const item of items) {
      const refIdNum = toInt(item.refId);

      let itemData: { precio: Prisma.Decimal } | null = null;

      if (item.tipo === TipoItemOrden.CURSO) {
        itemData = await this.prisma.curso.findUnique({
          where: { id: refIdNum },
          select: { precio: true },
        });
        if (!itemData) {
          throw new HttpException(
            `Curso con ID ${refIdNum} no encontrado`,
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (item.tipo === TipoItemOrden.PRODUCTO) {
        itemData = await this.prisma.producto.findUnique({
          where: { id: refIdNum },
          select: { precio: true },
        });
        if (!itemData) {
          throw new HttpException(
            `Producto con ID ${refIdNum} no encontrado`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const dbPrice = itemData?.precio;
      if (!dbPrice) {
        throw new HttpException(
          'Item inválido o sin precio',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Normalizar el precio que vino del FE
      const fePrice = new Prisma.Decimal(
        typeof item.precioUnitario === 'string'
          ? String(item.precioUnitario).trim().replace(',', '.')
          : (item.precioUnitario ?? 0),
      );

      // Comparar con el precio de DB
      if (!dbPrice.equals(fePrice)) {
        console.error('PRICE_MISMATCH', {
          tipo: item.tipo,
          refId: refIdNum,
          titulo: item.titulo,
          db: dbPrice.toString(),
          fe: fePrice.toString(),
        });

        throw new HttpException(
          {
            code: 'PRICE_CHANGED',
            message: `El precio del ${item.tipo.toLowerCase()} "${item.titulo}" ha cambiado. Por favor actualiza tu carrito.`,
            currentPrice: dbPrice.toString(),
            receivedPrice: fePrice.toString(),
          },
          HttpStatus.CONFLICT,
        );
      }

      // Usar Decimal para sumar al total
      total = total.add(dbPrice.mul(item.cantidad));

      validatedItems.push({
        tipo: item.tipo,
        refId: refIdNum,
        titulo: item.titulo,
        cantidad: item.cantidad,
        precioUnitario: dbPrice.toNumber(), // Guardamos el precio oficial de DB
      });
    }

    // Crear orden en DB
    return await this.prisma.orden.create({
      data: {
        usuarioId: userId,
        total: total,
        estado: EstadoOrden.PENDIENTE,
        moneda: moneda || 'ARS',
        referenciaPago,
        items: {
          create: validatedItems.map((item) => ({
            tipo: item.tipo,
            refId: item.refId,
            titulo: item.titulo,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async getUserOrders(userId: number) {
    const orders = await this.prisma.orden.findMany({
      where: { usuarioId: Number(userId) },
      include: {
        items: true,
        direccionEnvio: true,
        direccionFacturacion: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
    return this.enrichOrdersWithImages(orders);
  }

  async getOrderItems(orderId: number) {
    const order = await this.prisma.orden.findUnique({
      where: { id: Number(orderId) },
      include: { items: true },
    });
    if (!order) return [];
    const enriched = await this.enrichOrdersWithImages([order]);
    return enriched[0].items;
  }

  async getOrdersByUser(userId: number) {
    const orders = await this.prisma.orden.findMany({
      where: { usuarioId: Number(userId) },
      orderBy: { creadoEn: 'desc' },
      include: { items: true },
    });
    return this.enrichOrdersWithImages(orders);
  }

  async findByUser(userId: number) {
    const orders = await this.prisma.orden.findMany({
      where: { usuarioId: Number(userId) },
      orderBy: { creadoEn: 'desc' },
      include: { items: true },
    });
    return this.enrichOrdersWithImages(orders);
  }

  async getOrderById(orderId: number, userId: number) {
    const order = await this.prisma.orden.findFirst({
      where: {
        id: Number(orderId),
        usuarioId: Number(userId),
      },
      include: {
        items: true,
        direccionEnvio: true,
        direccionFacturacion: true,
      },
    });

    if (!order) {
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    }

    const [enriched] = await this.enrichOrdersWithImages([order]);
    return enriched;
  }

  async getOrderByReference(referencia: string) {
    const order = await this.prisma.orden.findFirst({
      where: { referenciaPago: referencia },
      include: { items: true },
    });
    if (!order) return null;
    const [enriched] = await this.enrichOrdersWithImages([order]);
    return enriched;
  }

  async findById(id: number, userId: number) {
    const order = await this.prisma.orden.findFirst({
      where: {
        id: Number(id),
        usuarioId: Number(userId),
      },
      include: { items: true },
    });
    if (!order) return null;
    const [enriched] = await this.enrichOrdersWithImages([order]);
    return enriched;
  }

  /** Enriquece items con imagen/portada actual */
  private async enrichOrdersWithImages(orders: any[]) {
    if (!orders.length) return orders;

    const productIds = new Set<number>();
    const courseIds = new Set<number>();

    for (const order of orders) {
      if (!order.items) continue;
      for (const item of order.items) {
        if (item.tipo === TipoItemOrden.PRODUCTO) productIds.add(item.refId);
        if (item.tipo === TipoItemOrden.CURSO) courseIds.add(item.refId);
      }
    }

    const [products, courses] = await Promise.all([
      productIds.size > 0
        ? this.prisma.producto.findMany({
            where: { id: { in: Array.from(productIds) } },
            select: { id: true, imagen: true },
          })
        : [],
      courseIds.size > 0
        ? this.prisma.curso.findMany({
            where: { id: { in: Array.from(courseIds) } },
            select: { id: true, portada: true },
          })
        : [],
    ]);

    const productMap = new Map(products.map((p) => [p.id, p.imagen]));
    const courseMap = new Map(courses.map((c) => [c.id, c.portada]));

    return orders.map((order) => {
      if (!order.items) return order;
      const enrichedItems = order.items.map((item: any) => {
        let imagen: string | null | undefined = null;
        if (item.tipo === TipoItemOrden.PRODUCTO) {
          imagen = productMap.get(item.refId);
        } else if (item.tipo === TipoItemOrden.CURSO) {
          imagen = courseMap.get(item.refId);
        }
        return { ...item, imagen };
      });
      return { ...order, items: enrichedItems };
    });
  }

  async updateOrderStatus(
    orderId: number,
    userId: number,
    estado: EstadoOrden,
    referenciaPago?: string,
  ) {
    const order = await this.prisma.orden.findFirst({
      where: {
        id: Number(orderId),
        usuarioId: Number(userId),
      },
    });

    if (!order) {
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    }

    if (order.estado === EstadoOrden.PAGADO && estado === EstadoOrden.PAGADO) {
      return order;
    }

    const updated = await this.prisma.orden.update({
      where: { id: Number(orderId) },
      data: { estado, referenciaPago },
      include: {
        items: true,
        direccionEnvio: true,
        direccionFacturacion: true,
      },
    });

    try {
      this.eventEmitter.emit(EventTypes.RESOURCE_UPDATED, {
        tableName: 'Orden',
        action: 'update',
        recordId: updated.id,
        userId: Number(userId),
        previousData: {
          estado: order.estado,
          referenciaPago: order.referenciaPago,
        },
        data: {
          estado: updated.estado,
          referenciaPago: updated.referenciaPago,
        },
        endpoint: '/orders/update-status',
      });
    } catch {}

    if (estado === EstadoOrden.PAGADO) {
      await this.createCourseEnrollments(Number(orderId), Number(userId));
    }

    return updated;
  }

  /** Pago one-off (no suscripción) */
  async processMercadoPagoPayment(
    orderId: number,
    userId: number,
    paymentData: MercadoPagoPaymentDto,
    options?: { idempotencyKey?: string; requestId?: string },
  ) {
    const order = await this.getOrderById(orderId, userId);
    if (order.estado !== EstadoOrden.PENDIENTE) {
      throw new HttpException(
        'La orden no está en estado pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }

    const idemKey = options?.idempotencyKey || `pay-${order.id}`;

    try {
      const metadatos = parseMetadatos(order.metadatos);
      const prevAttempt = metadatos?.paymentAttempts?.[idemKey];

      if (prevAttempt?.status === 'succeeded') {
        return await this.getOrderById(orderId, userId);
      }
      if (prevAttempt?.status === 'started') {
        const startedAt =
          typeof prevAttempt?.createdAt === 'string'
            ? Date.parse(prevAttempt.createdAt)
            : NaN;

        if (Number.isFinite(startedAt) && Date.now() - startedAt < 10000) {
          throw new HttpException(
            'Pago en progreso, reintentá en unos segundos',
            HttpStatus.CONFLICT,
          );
        }
      }

      await this.prisma.orden.update({
        where: { id: order.id },
        data: {
          metadatos: json({
            ...metadatos,
            paymentAttempts: {
              ...(metadatos?.paymentAttempts || {}),
              [idemKey]: {
                status: 'started',
                createdAt: new Date().toISOString(),
              },
            },
          }),
        },
      });

      // Email
      let payerEmail = paymentData.email;
      if (!payerEmail) {
        const user = await this.prisma.usuario.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        payerEmail = user?.email;
      }
      if (!payerEmail) {
        throw new HttpException(
          'Email requerido para procesar el pago',
          HttpStatus.BAD_REQUEST,
        );
      }

      const paymentResult = await this.mpPaymentService.processPayment(
        {
          token: paymentData.token,
          issuer_id: paymentData.issuerId,
          installments: paymentData.installments,
          payment_method_id: paymentData.paymentMethodId,
          transaction_amount: Number(order.total),
          description: `Pago Orden #${order.id}`,
          external_reference: String(order.id),
          payer: {
            email: payerEmail,
            ...(paymentData.identificationType &&
              paymentData.identificationNumber && {
                identification: {
                  type: paymentData.identificationType,
                  number: paymentData.identificationNumber,
                },
              }),
          },
        },
        options,
      );

      if (paymentResult.status === 'approved') {
        const metaSuccess = parseMetadatos(
          (
            await this.prisma.orden.findUnique({
              where: { id: order.id },
              select: { metadatos: true },
            })
          )?.metadatos,
        );

        await this.prisma.orden.update({
          where: { id: order.id },
          data: {
            metadatos: json({
              ...metaSuccess,
              paymentAttempts: {
                ...(metaSuccess?.paymentAttempts || {}),
                [idemKey]: {
                  status: 'succeeded',
                  mpPaymentId: String(paymentResult.id),
                  statusDetail: paymentResult.status_detail,
                  updatedAt: new Date().toISOString(),
                },
              },
            }),
          },
        });

        return await this.updateOrderStatus(
          orderId,
          userId,
          EstadoOrden.PAGADO,
          String(paymentResult.id),
        );
      }

      // rejected -> failed
      const metaRejected = parseMetadatos(
        (
          await this.prisma.orden.findUnique({
            where: { id: order.id },
            select: { metadatos: true },
          })
        )?.metadatos,
      );

      await this.prisma.orden.update({
        where: { id: order.id },
        data: {
          metadatos: json({
            ...metaRejected,
            paymentAttempts: {
              ...(metaRejected?.paymentAttempts || {}),
              [idemKey]: {
                status: 'failed',
                error: `rejected:${paymentResult.status_detail ?? paymentResult.status}`,
                updatedAt: new Date().toISOString(),
              },
            },
          }),
        },
      });

      throw new HttpException(
        `Pago rechazado: ${paymentResult.status_detail ?? paymentResult.status}`,
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // failed
      try {
        const metaFail = parseMetadatos(
          (
            await this.prisma.orden.findUnique({
              where: { id: orderId },
              select: { metadatos: true },
            })
          )?.metadatos,
        );

        await this.prisma.orden.update({
          where: { id: orderId },
          data: {
            metadatos: json({
              ...metaFail,
              paymentAttempts: {
                ...(metaFail?.paymentAttempts || {}),
                [idemKey]: {
                  status: 'failed',
                  error: error instanceof Error ? error.message : String(error),
                  updatedAt: new Date().toISOString(),
                },
              },
            }),
          },
        });
      } catch {}

      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(
        `Error al procesar el pago: ${msg}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Alta de suscripción MP para orden con cursos */
  async createMercadoPagoSubscription(
    orderId: number,
    userId: number,
    subscriptionData: MercadoPagoSubscriptionDto,
    options?: { idempotencyKey?: string; requestId?: string },
  ) {
    const order = await this.getOrderById(orderId, userId);
    if (order.estado !== EstadoOrden.PENDIENTE) {
      throw new HttpException(
        'La orden no está en estado pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hasCourses = order.items?.some(
      (i: ItemOrden) => i.tipo === TipoItemOrden.CURSO,
    );
    if (!hasCourses) {
      throw new HttpException(
        'No hay cursos en la orden para crear una suscripción',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!subscriptionData.token || typeof subscriptionData.token !== 'string') {
      throw new HttpException(
        'Token de tarjeta faltante',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (subscriptionData.token.length < 20) {
      throw new HttpException(
        'Token de tarjeta inválido o demasiado corto',
        HttpStatus.BAD_REQUEST,
      );
    }

    const idemKey = options?.idempotencyKey || `sub-${order.id}`;

    try {
      const metadatos = parseMetadatos(order.metadatos);
      const prevAttempt = metadatos?.subscriptionAttempts?.[idemKey];

      if (prevAttempt?.status === 'succeeded') {
        return await this.getOrderById(orderId, userId);
      }
      if (prevAttempt?.status === 'started') {
        const startedAt =
          typeof prevAttempt?.createdAt === 'string'
            ? Date.parse(prevAttempt.createdAt)
            : NaN;

        if (Number.isFinite(startedAt) && Date.now() - startedAt < 10000) {
          throw new HttpException(
            'Suscripción en progreso, reintentá en unos segundos',
            HttpStatus.CONFLICT,
          );
        }
      }

      await this.prisma.orden.update({
        where: { id: order.id },
        data: {
          metadatos: json({
            ...metadatos,
            subscriptionAttempts: {
              ...(metadatos?.subscriptionAttempts || {}),
              [idemKey]: {
                status: 'started',
                createdAt: new Date().toISOString(),
              },
            },
          }),
        },
      });

      // Email
      let payerEmail = subscriptionData.email;
      if (!payerEmail) {
        const user = await this.prisma.usuario.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        payerEmail = user?.email;
      }
      if (!payerEmail) {
        throw new HttpException(
          'Email requerido para procesar la suscripción',
          HttpStatus.BAD_REQUEST,
        );
      }

      const subscriptionResult =
        await this.mpSubscriptionService.createSubscription(
          {
            token: subscriptionData.token,
            payment_method_id: subscriptionData.paymentMethodId,
            transaction_amount: Number(order.total),
            description: `Suscripción mensual - Orden #${order.id}`,
            external_reference: String(order.id),
            frequency: subscriptionData.frequency,
            frequency_type: subscriptionData.frequencyType,
            payer: {
              email: payerEmail,
              ...(subscriptionData.identificationType &&
                subscriptionData.identificationNumber && {
                  identification: {
                    type: subscriptionData.identificationType,
                    number: subscriptionData.identificationNumber,
                  },
                }),
            },
          },
          options,
        );

      const subId = String(subscriptionResult.id);

      const updatedOrder = await this.prisma.orden.update({
        where: { id: Number(orderId) },
        data: {
          estado: EstadoOrden.PENDIENTE, // Mantenemos PENDIENTE hasta el primer pago approved
          referenciaPago: String(order.id), // Usamos la orden como referencia externa
          esSuscripcion: true,
          suscripcionActiva: false, // No activa hasta el primer pago
          suscripcionId: subId,
          suscripcionFrecuencia: subscriptionData.frequency,
          suscripcionTipoFrecuencia: subscriptionData.frequencyType,
          metadatos: json({
            ...metadatos,
            subscriptionAttempts: {
              ...(metadatos?.subscriptionAttempts || {}),
              [idemKey]: {
                status: 'succeeded',
                mpPreapprovalId: subId,
                updatedAt: new Date().toISOString(),
              },
            },
            subscription: {
              id: subId,
              frequency: subscriptionData.frequency,
              frequencyType: subscriptionData.frequencyType,
              status: subscriptionResult.status || 'authorized',
              createdAt: new Date().toISOString(),
            },
          }),
        },
        include: {
          items: true,
          direccionEnvio: true,
          direccionFacturacion: true,
        },
      });

      // NO creamos inscripciones aquí. Esperamos al webhook de payment.status === 'approved'

      // Notificar al usuario que la suscripción está siendo procesada
      try {
        await this.notificationsService.createNotification({
          usuarioId: String(userId),
          tipo: TipoNotificacion.SISTEMA,
          titulo: 'Suscripción en proceso',
          mensaje: `Hemos recibido tu solicitud de suscripción para la orden #${orderId}. El proceso de activación puede demorar entre 2 a 5 horas. Te notificaremos en cuanto esté lista.`,
          url: `/perfil/ordenes/${orderId}`,
          metadata: {
            orderId: Number(orderId),
            subscriptionId: subId,
            type: 'subscription_processing',
          },
        });
      } catch (error) {
        console.error(
          `[Subscription ${subId}] Error al enviar notificación de proceso:`,
          error,
        );
      }

      return updatedOrder;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      // failed
      try {
        const metaFail = parseMetadatos(
          (
            await this.prisma.orden.findUnique({
              where: { id: orderId },
              select: { metadatos: true },
            })
          )?.metadatos,
        );

        await this.prisma.orden.update({
          where: { id: orderId },
          data: {
            metadatos: json({
              ...metaFail,
              subscriptionAttempts: {
                ...(metaFail?.subscriptionAttempts || {}),
                [idemKey]: {
                  status: 'failed',
                  error: error instanceof Error ? error.message : String(error),
                  updatedAt: new Date().toISOString(),
                },
              },
            }),
          },
        });
      } catch {}

      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(
        `Error al procesar la suscripción: ${msg}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Cancela una suscripción existente */
  async cancelSubscription(orderId: number, userId: number): Promise<any> {
    const order = await this.prisma.orden.findFirst({
      where: {
        id: Number(orderId),
        usuarioId: Number(userId),
        esSuscripcion: true,
      },
    });

    if (!order) {
      throw new Error('Orden de suscripción no encontrada');
    }

    const metadatos = parseMetadatos(order.metadatos);
    const subscriptionId = order.suscripcionId;

    if (!subscriptionId) {
      throw new Error(
        'No se encontró información de suscripción para esta orden',
      );
    }

    const cancelResult =
      await this.mpSubscriptionService.cancelSubscription(subscriptionId);

    const nextMetaObj = {
      ...metadatos,
      subscription: {
        ...(metadatos?.subscription || {}),
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellation: cancelResult,
      },
    };

    await this.prisma.orden.update({
      where: { id: order.id },
      data: {
        suscripcionActiva: false,
        metadatos: json(nextMetaObj),
      },
    });

    return {
      message: 'Suscripción cancelada exitosamente',
      orderId: order.id,
      subscriptionId,
    };
  }

  /** Webhook MP enruta por tipo de evento */
  async processMercadoPagoWebhook(
    eventType: string,
    dataId: number,
    webhookData: unknown,
  ) {
    if (!eventType || !dataId) {
      throw new HttpException(
        'Datos de webhook incompletos',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      switch (eventType) {
        case 'subscription_preapproval':
        case 'subscription_status_update':
          return await this.handleSubscriptionStatusUpdate(
            String(dataId),
            webhookData as Record<string, unknown>,
          );

        case 'subscription_authorized_payment':
        case 'subscription_payment':
        case 'payment':
          return await this.handlePaymentWebhook(
            Number(dataId),
            webhookData as Record<string, unknown>,
          );

        case 'subscription_plan':
          return { received: true, type: eventType };

        default:
          console.log(`Evento de webhook no manejado: ${eventType}`);
          return { received: true, type: eventType };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(
        `Error al procesar el webhook: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Maneja webhooks de tipo payment (pagos individuales o de suscripciones)
   * Única fuente de verdad para habilitar acceso a cursos.
   */
  private async handlePaymentWebhook(
    paymentId: number,
    _data: Record<string, unknown>,
  ) {
    try {
      // 1. Obtener detalles del pago desde MP (fuente confiable)
      const paymentDetails = await this.mpPaymentService.getPayment(
        String(paymentId),
      );
      if (!paymentDetails) {
        console.warn(`[MP payment ${paymentId}] No se encontraron detalles`);
        return { processed: false, reason: 'payment_not_found' };
      }

      // 2. Resolver la orden por external_reference
      const ref = paymentDetails.external_reference;
      if (!ref) {
        console.warn(`[MP payment ${paymentId}] Sin external_reference`);
        return { processed: true, reason: 'missing_external_reference' };
      }

      const orderId = Number(ref);
      if (isNaN(orderId)) {
        console.warn(
          `[MP payment ${paymentId}] external_reference inválido: ${ref}`,
        );
        return { processed: true, reason: 'invalid_external_reference' };
      }

      const order = await this.prisma.orden.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        console.warn(
          `[MP payment ${paymentId}] Orden no encontrada: ${orderId}`,
        );
        return { processed: true, reason: 'order_not_found' };
      }

      console.log(`[MP payment ${paymentId}] Order ${order.id} esSuscripcion=${order.esSuscripcion}`);

      // 3. Registrar o actualizar el pago (Idempotente)
      const referenciaPago = String(paymentDetails.id);

      await this.prisma.pagoSuscripcion.upsert({
        where: { referenciaPago },
        create: {
          ordenId: order.id,
          usuarioId: order.usuarioId,
          referenciaPago,
          monto: new Prisma.Decimal(paymentDetails.transaction_amount),
          estado: paymentDetails.status,
          metadatos: json({
            paymentId: String(paymentDetails.id),
            status: paymentDetails.status,
            statusDetail: paymentDetails.status_detail,
            dateApproved: paymentDetails.date_approved,
            subscriptionId: paymentDetails.subscription_id,
          }),
        },
        update: {
          estado: paymentDetails.status,
          metadatos: json({
            paymentId: String(paymentDetails.id),
            status: paymentDetails.status,
            statusDetail: paymentDetails.status_detail,
            dateApproved: paymentDetails.date_approved,
            subscriptionId: paymentDetails.subscription_id,
          }),
        },
      });

      // 4. Si el pago NO está aprobado, no habilitamos nada
      if (paymentDetails.status !== 'approved') {
        console.log(
          `[MP payment ${paymentId}] Estado ${paymentDetails.status}, no habilita acceso.`,
        );
        return { processed: true, status: paymentDetails.status };
      }

      // 5. Pago APROBADO: Actualizar orden y habilitar acceso
      // Re-fetch para asegurar que tenemos los datos más recientes (esSuscripcion, etc)
      const freshOrder = await this.prisma.orden.findUnique({
        where: { id: order.id },
      });

      const isSub = freshOrder?.esSuscripcion || order.esSuscripcion;

      await this.prisma.orden.update({
        where: { id: order.id },
        data: {
          estado: EstadoOrden.PAGADO,
          suscripcionActiva: isSub ? true : null,
          referenciaPago: referenciaPago,
        },
      });

      // 6. Activar inscripciones de cursos
      await this.createCourseEnrollments(order.id, order.usuarioId);

      // 7. Si es suscripción, renovar fechas de expiración y notificar
      if (isSub) {
        await this.renewCourseSubscriptions(order.usuarioId);

        // Notificar al usuario que su suscripción fue aprobada
        try {
          await this.notificationsService.createNotification({
            usuarioId: String(order.usuarioId),
            tipo: TipoNotificacion.SISTEMA,
            titulo: 'Suscripción Aprobada',
            mensaje: `¡Tu suscripción para la orden #${order.id} ha sido aprobada! Ya tienes acceso a tus cursos.`,
            url: '/perfil/cursos', // URL sugerida para ver sus cursos
            metadata: {
              orderId: order.id,
              subscriptionId: paymentDetails.subscription_id,
              type: 'subscription_approved',
            },
          });
        } catch (error) {
          console.error(
            `[MP payment ${paymentId}] Error al enviar notificación:`,
            error,
          );
        }
      }

      console.log(
        `[MP payment ${paymentId}] APPROVED -> Acceso habilitado para orden ${order.id}`,
      );
      return { processed: true, orderId: order.id, status: 'approved' };
    } catch (error) {
      console.error(`Error en handlePaymentWebhook:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de la suscripción (preapproval) en la orden.
   * NOTA: No otorga acceso por sí solo. El acceso depende de PagoSuscripcion.estado = approved.
   */
  private async handleSubscriptionStatusUpdate(
    subscriptionId: string,
    data: Record<string, unknown>,
  ) {
    const incomingStatus = (data?.['status'] as SubscriptionStatus) ?? 'active';

    // Solo marcamos como inactiva si explícitamente está pausada o cancelada.
    // Si está 'active' o 'authorized', la suscripción está 'viva' pero el ACCESO
    // real lo determina el último pago aprobado.
    const shouldBeInactive = ['paused', 'cancelled', 'expired'].includes(
      incomingStatus,
    );

    const order = await this.prisma.orden.findFirst({
      where: { suscripcionId: subscriptionId },
    });

    if (!order) {
      console.warn(
        `No se encontró orden para la suscripción ${subscriptionId}`,
      );
      return { processed: false, reason: 'order_not_found' };
    }

    const currentMeta = parseMetadatos(order.metadatos);
    const nextMetaObj = {
      ...currentMeta,
      subscription: {
        ...(currentMeta?.subscription || {}),
        id: subscriptionId,
        status: incomingStatus,
        updatedAt: new Date().toISOString(),
      },
    };

    const updatedOrder = await this.prisma.orden.update({
      where: { id: order.id },
      data: {
        // Si se cancela/pausa, desactivamos. Si se activa/autoriza, NO activamos
        // automáticamente (esperamos al pago), a menos que ya estuviera activa.
        suscripcionActiva: shouldBeInactive ? false : order.suscripcionActiva,
        metadatos: json(nextMetaObj),
      },
    });

    return {
      processed: true,
      orderId: updatedOrder.id,
      status: incomingStatus,
    };
  }

  /** Renueva las suscripciones a cursos para un usuario */
  private async renewCourseSubscriptions(userId: number) {
    const enrollments = await this.prisma.inscripcion.findMany({
      where: { usuarioId: Number(userId) },
    });

    const now = new Date();

    for (const enrollment of enrollments) {
      const progreso = (enrollment.progreso ?? {}) as Record<string, any>;

      if (progreso?.subscription) {
        const subscription = progreso.subscription;

        const endDate = new Date();
        if (
          subscription.durationType === 'mes' ||
          subscription.durationType === 'meses'
        ) {
          endDate.setMonth(
            endDate.getMonth() + parseInt(subscription.duration),
          );
        } else if (
          subscription.durationType === 'día' ||
          subscription.durationType === 'días'
        ) {
          endDate.setDate(endDate.getDate() + parseInt(subscription.duration));
        }

        await this.prisma.inscripcion.update({
          where: { id: enrollment.id },
          data: {
            progreso: json({
              ...progreso,
              subscription: {
                ...subscription,
                startDate: now.toISOString(),
                endDate: endDate.toISOString(),
              },
            }),
          },
        });
      }
    }
  }

  /** Crea inscripciones a cursos en una orden pagada */
  private async createCourseEnrollments(orderId: number, userId: number) {
    const order = await this.prisma.orden.findUnique({
      where: { id: Number(orderId) },
      include: { items: true },
    });

    if (!order) return;

    const courseItems = order.items.filter(
      (i) => i.tipo === TipoItemOrden.CURSO,
    );
    if (!courseItems.length) return;

    const enrollmentResults = await Promise.all(
      courseItems.map(async (i) => {
        // 1. Buscar inscripcion existente para no perder progreso (lecciones completadas)
        const existing = await this.prisma.inscripcion.findUnique({
          where: {
            usuarioId_cursoId: {
              usuarioId: Number(userId),
              cursoId: Number(i.refId),
            },
          },
        });

        const currentProgreso = parseMetadatos(existing?.progreso) || {};

        let nextProgreso = { ...currentProgreso };
        if (order.esSuscripcion) {
          nextProgreso = {
            ...nextProgreso,
            subscription: {
              orderId: order.id,
              isActive: true,
              startDate: new Date().toISOString(),
              duration: order.suscripcionFrecuencia || 1,
              durationType: order.suscripcionTipoFrecuencia || 'mes',
            } as any,
          };
        }

        const enrollment = await this.prisma.inscripcion.upsert({
          where: {
            usuarioId_cursoId: {
              usuarioId: Number(userId),
              cursoId: Number(i.refId),
            },
          },
          update: {
            estado: EstadoInscripcion.ACTIVADA,
            actualizadoEn: new Date(),
            progreso: json(nextProgreso),
          },
          create: {
            usuarioId: Number(userId),
            cursoId: Number(i.refId),
            estado: EstadoInscripcion.ACTIVADA,
            progreso: json(nextProgreso),
          },
        });

        this.eventEmitter.emit(EventTypes.RESOURCE_CREATED, {
          tableName: 'Inscripcion',
          recordId: String(enrollment.id),
          userId: String(userId),
          data: {
            usuarioId: enrollment.usuarioId,
            cursoId: enrollment.cursoId,
            estado: enrollment.estado,
            orderId,
          },
        });

        return enrollment;
      }),
    );

    return enrollmentResults;
  }
}
