// apps/api/src/orders/orders.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventTypes } from '../events/event.types';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
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
    private prisma: PrismaService,
    private mercadoPagoService: MercadoPagoService,
    private readonly eventEmitter: EventEmitter2,
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
    let total = 0;
    const validatedItems: {
      tipo: TipoItemOrden;
      refId: number; // ← ahora number
      titulo: string;
      cantidad: number;
      precioUnitario: number;
    }[] = [];

    for (const item of items) {
      // normalizamos refId a number
      const refIdNum = toInt(item.refId);

      let itemData: { precio: number } | null = null;

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

      if (itemData && itemData.precio !== item.precioUnitario) {
        throw new HttpException(
          `El precio del ${item.tipo.toLowerCase()} ${item.titulo} ha cambiado`,
          HttpStatus.BAD_REQUEST,
        );
      }

      total += item.precioUnitario * item.cantidad;
      validatedItems.push({
        tipo: item.tipo,
        refId: refIdNum,
        titulo: item.titulo,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const shippingAddress = await tx.direccion.create({
        data: {
          usuarioId: Number(userId),
          ...direccionEnvio,
          pais: direccionEnvio.pais || 'AR',
        },
      });

      let billingAddressId = shippingAddress.id;
      if (direccionFacturacion) {
        const billingAddress = await tx.direccion.create({
          data: {
            usuarioId: Number(userId),
            ...direccionFacturacion,
            pais: direccionFacturacion.pais || 'AR',
          },
        });
        billingAddressId = billingAddress.id;
      }

      const order = await tx.orden.create({
        data: {
          usuarioId: Number(userId),
          estado: EstadoOrden.PENDIENTE,
          total,
          moneda: moneda || 'ARS',
          referenciaPago,
          direccionEnvioId: shippingAddress.id,
          direccionFacturacionId: billingAddressId,
          esSuscripcion: false,
          suscripcionActiva: null,
          suscripcionId: null,
          suscripcionFrecuencia: null,
          suscripcionTipoFrecuencia: null,
          // metadatos: omitido
        },
        include: {
          direccionEnvio: true,
          direccionFacturacion: true,
          items: true,
        },
      });

      // Emitir evento de recurso creado para auditoría
      try {
        this.eventEmitter.emit(EventTypes.RESOURCE_CREATED, {
          tableName: 'Orden',
          action: 'create',
          recordId: order.id,
          userId: Number(userId),
          data: {
            estado: order.estado,
            total: order.total,
            moneda: order.moneda,
            referenciaPago: order.referenciaPago,
          },
          endpoint: '/orders',
        });
      } catch (e) {
        // No interrumpir el flujo de creación por errores de auditoría
      }

      const orderItems = await Promise.all(
        validatedItems.map((vi) =>
          tx.itemOrden.create({
            data: {
              ordenId: order.id,
              tipo: vi.tipo,
              refId: vi.refId, // number
              titulo: vi.titulo,
              cantidad: vi.cantidad,
              precioUnitario: vi.precioUnitario,
            },
          }),
        ),
      );

      return { ...order, items: orderItems };
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
      include: {
        items: true,
      },
    });
    if (!order) return [];
    const enriched = await this.enrichOrdersWithImages([order]);
    return enriched[0].items;
  }

  async getOrdersByUser(userId: number) {
    const orders = await this.prisma.orden.findMany({
      where: { usuarioId: Number(userId) },
      orderBy: { creadoEn: 'desc' },
      include: {
        items: true,
      },
    });
    return this.enrichOrdersWithImages(orders);
  }

  async findByUser(userId: number) {
    const orders = await this.prisma.orden.findMany({
      where: { usuarioId: Number(userId) },
      orderBy: { creadoEn: 'desc' },
      include: {
        items: true,
      },
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
    if (!order)
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);

    const [enriched] = await this.enrichOrdersWithImages([order]);
    return enriched;
  }

  async getOrderByReference(referencia: string) {
    const order = await this.prisma.orden.findFirst({
      where: { referenciaPago: referencia },
      include: {
        items: true,
      },
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
      include: {
        items: true,
      },
    });
    if (!order) return null;
    const [enriched] = await this.enrichOrdersWithImages([order]);
    return enriched;
  }

  /**
   * Enriquece los items de la orden con la imagen/portada actual del producto/curso.
   */
  private async enrichOrdersWithImages(orders: any[]) {
    if (!orders.length) return orders;

    // Recolectar IDs
    const productIds = new Set<number>();
    const courseIds = new Set<number>();

    for (const order of orders) {
      if (!order.items) continue;
      for (const item of order.items) {
        if (item.tipo === TipoItemOrden.PRODUCTO) productIds.add(item.refId);
        if (item.tipo === TipoItemOrden.CURSO) courseIds.add(item.refId);
      }
    }

    // Consultar DB
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

    // Crear mapas
    const productMap = new Map(products.map((p) => [p.id, p.imagen]));
    const courseMap = new Map(courses.map((c) => [c.id, c.portada]));

    // Asignar imágenes
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
    if (!order)
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);

    const updated = await this.prisma.orden.update({
      where: { id: Number(orderId) },
      data: {
        estado,
        referenciaPago,
      },
      include: {
        items: true,
        direccionEnvio: true,
        direccionFacturacion: true,
      },
    });

    // Emitir evento de recurso actualizado para auditoría
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
    } catch (e) {
      // No interrumpir el flujo por errores de auditoría
    }

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
  ) {
    const order = await this.getOrderById(orderId, userId);
    if (order.estado !== EstadoOrden.PENDIENTE) {
      throw new HttpException(
        'La orden no está en estado pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const paymentResult = await this.mercadoPagoService.processPayment({
        token: paymentData.token,
        payment_method_id: paymentData.paymentMethodId,
        transaction_amount: order.total,
        description: `Orden #${order.id}`,
        external_reference: String(order.id), // ← string
        payer: {
          email: paymentData.email || 'default@example.com',
          ...(paymentData.identificationType &&
            paymentData.identificationNumber && {
              identification: {
                type: paymentData.identificationType,
                number: paymentData.identificationNumber,
              },
            }),
        },
      });

      if (paymentResult.status === 'approved') {
        return await this.updateOrderStatus(
          orderId,
          userId,
          EstadoOrden.PAGADO,
          String(paymentResult.id),
        );
      }

      throw new HttpException(
        `Pago rechazado: ${paymentResult.status_detail ?? paymentResult.status}`,
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
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

    try {
      const subscriptionResult =
        await this.mercadoPagoService.createSubscription({
          token: subscriptionData.token,
          payment_method_id: subscriptionData.paymentMethodId,
          transaction_amount: order.total,
          description: `Suscripción mensual - Orden #${order.id}`,
          external_reference: String(order.id), // ← string
          frequency: subscriptionData.frequency,
          frequency_type: subscriptionData.frequencyType,
          payer: {
            email: subscriptionData.email || 'default@example.com',
            ...(subscriptionData.identificationType &&
              subscriptionData.identificationNumber && {
                identification: {
                  type: subscriptionData.identificationType,
                  number: subscriptionData.identificationNumber,
                },
              }),
          },
        });

      const subId = String(subscriptionResult.id);

      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const currentJson = await tx.orden.findUnique({
          where: { id: Number(orderId) },
          select: { metadatos: true },
        });

        const currentMeta = parseMetadatos(currentJson?.metadatos);
        const nextMetaObj = {
          ...currentMeta,
          subscription: {
            id: subId,
            frequency: subscriptionData.frequency,
            frequencyType: subscriptionData.frequencyType,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
        };

        const updated = await tx.orden.update({
          where: { id: Number(orderId) },
          data: {
            estado: EstadoOrden.PAGADO,
            referenciaPago: subId,
            esSuscripcion: true,
            suscripcionActiva: true,
            suscripcionId: subId,
            suscripcionFrecuencia: subscriptionData.frequency,
            suscripcionTipoFrecuencia: subscriptionData.frequencyType,
            metadatos: json(nextMetaObj),
          },
          include: {
            items: true,
            direccionEnvio: true,
            direccionFacturacion: true,
          },
        });

        await this.createCourseEnrollments(Number(orderId), Number(userId));

        return updated;
      });

      return updatedOrder;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(
        `Error al crear la suscripción: ${msg}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Cancela una suscripción existente
   * @param orderId ID de la orden asociada a la suscripción
   * @param userId ID del usuario que solicita la cancelación
   */
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
      await this.mercadoPagoService.cancelSubscription(subscriptionId);

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
      subscriptionId: subscriptionId,
    };
  }

  /** Webhook MP enruta por tipo de evento de suscripciones */
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
        case 'subscription_payment':
          return await this.handleSubscriptionPayment(String(dataId));
        case 'subscription_status_update':
          return await this.handleSubscriptionStatusUpdate(
            String(dataId),
            webhookData as Record<string, unknown>,
          );
        case 'subscription_plan':
          return { received: true, type: eventType };
        case 'payment':
          // Procesar pagos recurrentes
          return await this.handleRecurringPayment(
            String(dataId),
            webhookData as Record<string, unknown>,
          );
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

  /** Actualiza estado de suscripción y metadatos */
  private async handleSubscriptionStatusUpdate(
    subscriptionId: string,
    data: Record<string, unknown>,
  ) {
    const incomingStatus = (data?.['status'] as SubscriptionStatus) ?? 'active';
    const isActive = incomingStatus === 'active';

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
        suscripcionActiva: isActive,
        metadatos: json(nextMetaObj),
      },
    });

    if (!isActive) {
      console.log(
        `Suscripción ${subscriptionId} cambió a estado: ${incomingStatus}`,
      );
    }

    return {
      processed: true,
      orderId: updatedOrder.id,
      status: incomingStatus,
    };
  }

  /** Confirma pago recurrente y registra en PagoSuscripcion */
  private async handleSubscriptionPayment(paymentId: string) {
    // TODO: Consultar detalles reales a MP si tu servicio los expone
    const paymentDetails = {
      status: 'approved',
      external_reference: 'order-id-unknown',
      subscription_id: 'sub-id-unknown',
    };

    if (paymentDetails.status !== 'approved') {
      console.warn(`Pago de suscripción rechazado: ${paymentId}`);
      return { processed: false, status: paymentDetails.status };
    }

    const order = await this.prisma.orden.findFirst({
      where: { suscripcionId: paymentDetails.subscription_id },
    });

    if (!order) {
      console.warn(
        `No se encontró orden para la suscripción ${paymentDetails.subscription_id}`,
      );
      return { processed: false, reason: 'order_not_found' };
    }

    await this.prisma.pagoSuscripcion.create({
      data: {
        ordenId: order.id, // number
        usuarioId: order.usuarioId,
        referenciaPago: paymentId,
        monto: order.total,
        estado: 'APROBADO',
        metadatos: json({
          subscriptionId: paymentDetails.subscription_id,
          externalReference: paymentDetails.external_reference,
        }),
      },
    });

    return { processed: true, orderId: order.id };
  }

  /** Maneja pagos recurrentes de suscripciones */
  private async handleRecurringPayment(
    paymentId: string,
    _data: Record<string, unknown>,
  ) {
    try {
      const paymentDetails =
        await this.mercadoPagoService.getPayment(paymentId);
      if (!paymentDetails || paymentDetails.status !== 'approved') {
        return {
          processed: false,
          status: paymentDetails?.status || 'unknown',
        };
      }

      // Verificar si es un pago de suscripción
      const subscriptionId = (paymentDetails as any).subscription_id;
      if (!subscriptionId) {
        return { processed: false, reason: 'not_subscription_payment' };
      }

      const order = await this.prisma.orden.findFirst({
        where: { suscripcionId: subscriptionId },
      });

      if (!order) {
        return { processed: false, reason: 'order_not_found' };
      }

      await this.prisma.pagoSuscripcion.create({
        data: {
          ordenId: order.id, // number
          usuarioId: order.usuarioId,
          referenciaPago: paymentId,
          monto: (paymentDetails as any).transaction_amount,
          estado: 'APROBADO',
          metadatos: json({
            subscriptionId,
            paymentId,
          }),
        },
      });

      await this.renewCourseSubscriptions(order.usuarioId);

      return { processed: true, orderId: order.id };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(
        `Error al procesar pago recurrente: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
          },
          create: {
            usuarioId: Number(userId),
            cursoId: Number(i.refId),
            estado: EstadoInscripcion.ACTIVADA,
            progreso: json({}),
          },
        });

        // Emitir evento para auditoría y notificaciones
        this.eventEmitter.emit(EventTypes.RESOURCE_CREATED, {
          tableName: 'Inscripcion',
          recordId: String(enrollment.id),
          userId: String(userId),
          data: {
            usuarioId: enrollment.usuarioId,
            cursoId: enrollment.cursoId,
            estado: enrollment.estado,
            orderId: orderId,
          },
        });

        return enrollment;
      }),
    );

    return enrollmentResults;
  }
}
