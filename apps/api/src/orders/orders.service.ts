// apps/api/src/orders/orders.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
import { parseMetadatos } from './interfaces/orden-metadata.interface';

import {
  CreateOrderDto,
  MercadoPagoPaymentDto,
  MercadoPagoSubscriptionDto,
} from './dto/orders.dto';
import { Prisma, EstadoOrden, TipoItemOrden } from '@prisma/client';

type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | string;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private mercadoPagoService: MercadoPagoService,
  ) {}

  /** Crea una orden one-off (no suscripción) */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
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
      refId: string;
      titulo: string;
      cantidad: number;
      precioUnitario: number;
    }[] = [];

    for (const item of items) {
      let itemData: { precio: number } | null = null;

      if (item.tipo === TipoItemOrden.CURSO) {
        itemData = await this.prisma.curso.findUnique({
          where: { id: item.refId },
          select: { precio: true },
        });
        if (!itemData) {
          throw new HttpException(
            `Curso con ID ${item.refId} no encontrado`,
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (item.tipo === TipoItemOrden.PRODUCTO) {
        itemData = await this.prisma.producto.findUnique({
          where: { id: item.refId },
          select: { precio: true },
        });
        if (!itemData) {
          throw new HttpException(
            `Producto con ID ${item.refId} no encontrado`,
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
        refId: item.refId,
        titulo: item.titulo,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const shippingAddress = await tx.direccion.create({
        data: {
          usuarioId: userId,
          ...direccionEnvio,
          pais: direccionEnvio.pais || 'AR',
        },
      });

      let billingAddressId = shippingAddress.id;
      if (direccionFacturacion) {
        const billingAddress = await tx.direccion.create({
          data: {
            usuarioId: userId,
            ...direccionFacturacion,
            pais: direccionFacturacion.pais || 'AR',
          },
        });
        billingAddressId = billingAddress.id;
      }

      // NOTA: no seteamos metadatos: null (Prisma no acepta null “a mano” para Json en este tipo),
      // simplemente lo omitimos en el create.
      const order = await tx.orden.create({
        data: {
          usuarioId: userId,
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
        },
      });

      const orderItems = await Promise.all(
        validatedItems.map((vi) =>
          tx.itemOrden.create({
            data: {
              ordenId: order.id,
              tipo: vi.tipo,
              refId: vi.refId,
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

  async getUserOrders(userId: string) {
    return this.prisma.orden.findMany({
      where: { usuarioId: userId },
      include: {
        items: true,
        direccionEnvio: true,
        direccionFacturacion: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.orden.findFirst({
      where: { id: orderId, usuarioId: userId },
      include: {
        items: true,
        direccionEnvio: true,
        direccionFacturacion: true,
      },
    });
    if (!order)
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    estado: EstadoOrden,
    referenciaPago?: string,
  ) {
    const order = await this.prisma.orden.findFirst({
      where: { id: orderId, usuarioId: userId },
    });
    if (!order)
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);

    const updated = await this.prisma.orden.update({
      where: { id: orderId },
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

    if (estado === EstadoOrden.PAGADO) {
      await this.createCourseEnrollments(orderId, userId);
    }

    return updated;
  }

  /** Pago one-off (no suscripción) */
  async processMercadoPagoPayment(
    orderId: string,
    userId: string,
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
        external_reference: order.id,
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
    orderId: string,
    userId: string,
    subscriptionData: MercadoPagoSubscriptionDto,
  ) {
    const order = await this.getOrderById(orderId, userId);
    if (order.estado !== EstadoOrden.PENDIENTE) {
      throw new HttpException(
        'La orden no está en estado pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hasCourses = order.items.some((i) => i.tipo === TipoItemOrden.CURSO);
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
          external_reference: order.id,
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
        // Cargar y mergear metadatos actuales (puede ser null)
        const currentJson = await tx.orden.findUnique({
          where: { id: orderId },
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
        const nextMeta: Prisma.InputJsonValue =
          nextMetaObj as unknown as Prisma.InputJsonValue;

        const updated = await tx.orden.update({
          where: { id: orderId },
          data: {
            estado: EstadoOrden.PAGADO,
            referenciaPago: subId,
            esSuscripcion: true,
            suscripcionActiva: true,
            suscripcionId: subId,
            suscripcionFrecuencia: subscriptionData.frequency,
            suscripcionTipoFrecuencia: subscriptionData.frequencyType,
            metadatos: nextMeta, // <- JSON plano
          },
          include: {
            items: true,
            direccionEnvio: true,
            direccionFacturacion: true,
          },
        });

        await this.createCourseEnrollments(orderId, userId);

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
   * @returns Información de la suscripción cancelada
   */
  async cancelSubscription(orderId: string, userId: string): Promise<any> {
    // Verificar que la orden existe y pertenece al usuario
    const order = await this.prisma.orden.findFirst({
      where: {
        id: orderId,
        usuarioId: userId,
        esSuscripcion: true,
      },
    });

    if (!order) {
      throw new Error('Orden de suscripción no encontrada');
    }

    // Obtener información de la suscripción desde los metadatos de la orden
    const metadatos = parseMetadatos(order.metadatos);
    const subscriptionId = order.suscripcionId;

    if (!subscriptionId) {
      throw new Error(
        'No se encontró información de suscripción para esta orden',
      );
    }

    // Cancelar la suscripción en MercadoPago
    const cancelResult =
      await this.mercadoPagoService.cancelSubscription(subscriptionId);

    // Actualizar los metadatos y estado de la orden
    const nextMetaObj = {
      ...metadatos,
      subscription: {
        ...(metadatos.subscription || {}),
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellation: cancelResult,
      },
    };
    const nextMeta: Prisma.InputJsonValue =
      nextMetaObj as unknown as Prisma.InputJsonValue;

    // Actualizar la orden para marcarla como no suscripción activa
    await this.prisma.orden.update({
      where: {
        id: order.id,
      },
      data: {
        suscripcionActiva: false,
        metadatos: nextMeta,
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
    dataId: string,
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
          return await this.handleSubscriptionPayment(dataId);
        case 'subscription_status_update':
          return await this.handleSubscriptionStatusUpdate(
            dataId,
            webhookData as Record<string, unknown>,
          );
        case 'subscription_plan':
          return { received: true, type: eventType };
        case 'payment':
          // Procesar pagos recurrentes
          return await this.handleRecurringPayment(
            dataId,
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

  /** Maneja pagos recurrentes de suscripciones */
  private async handleRecurringPayment(
    paymentId: string,
    data: Record<string, unknown>,
  ) {
    try {
      // Obtener detalles del pago desde MercadoPago
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

      // Buscar la orden asociada a la suscripción
      const order = await this.prisma.orden.findFirst({
        where: { suscripcionId: subscriptionId },
      });

      if (!order) {
        return { processed: false, reason: 'order_not_found' };
      }

      // Registrar el pago recurrente
      await this.prisma.pagoSuscripcion.create({
        data: {
          ordenId: order.id,
          usuarioId: order.usuarioId,
          referenciaPago: paymentId,
          monto: paymentDetails.transaction_amount,
          estado: 'APROBADO',
          metadatos: {
            subscriptionId: subscriptionId,
            paymentId: paymentId,
          } as Prisma.InputJsonValue,
        },
      });

      // Renovar las inscripciones a cursos
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
  private async renewCourseSubscriptions(userId: string) {
    // Obtener todas las inscripciones activas del usuario
    const enrollments = await this.prisma.inscripcion.findMany({
      where: { usuarioId: userId },
    });

    const now = new Date();

    for (const enrollment of enrollments) {
      const progreso = enrollment.progreso as Record<string, any>;

      // Verificar si tiene información de suscripción
      if (progreso?.subscription) {
        const subscription = progreso.subscription;

        // Calcular nueva fecha de fin
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

        // Actualizar la suscripción
        await this.prisma.inscripcion.update({
          where: { id: enrollment.id },
          data: {
            progreso: {
              ...progreso,
              subscription: {
                ...subscription,
                startDate: now.toISOString(),
                endDate: endDate.toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });
      }
    }
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
        ordenId: order.id,
        usuarioId: order.usuarioId,
        referenciaPago: paymentId,
        monto: order.total,
        estado: 'APROBADO',
        metadatos: {
          subscriptionId: paymentDetails.subscription_id,
          externalReference: paymentDetails.external_reference,
        } as Prisma.InputJsonValue,
      },
    });

    return { processed: true, orderId: order.id };
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
        ...(currentMeta.subscription || {}),
        id: subscriptionId,
        status: incomingStatus,
        updatedAt: new Date().toISOString(),
      },
    };
    const nextMeta: Prisma.InputJsonValue =
      nextMetaObj as unknown as Prisma.InputJsonValue;

    const updatedOrder = await this.prisma.orden.update({
      where: { id: order.id },
      data: {
        suscripcionActiva: isActive,
        metadatos: nextMeta,
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

  /** Crea inscripciones a cursos en una orden pagada */
  private async createCourseEnrollments(orderId: string, userId: string) {
    const order = await this.prisma.orden.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const courseItems = order.items.filter(
      (i) => i.tipo === TipoItemOrden.CURSO,
    );

    // Determinar la duración de la suscripción
    const duration = order.esSuscripcion ? '1' : '3'; // 1 mes para suscripciones, 3 meses para compras únicas
    const durationType = order.esSuscripcion ? 'mes' : 'meses';

    // Calcular fechas de inicio y fin
    const startDate = new Date();
    const endDate = new Date();
    if (durationType === 'mes' || durationType === 'meses') {
      endDate.setMonth(endDate.getMonth() + parseInt(duration));
    } else if (durationType === 'día' || durationType === 'días') {
      endDate.setDate(endDate.getDate() + parseInt(duration));
    }

    for (const item of courseItems) {
      const exists = await this.prisma.inscripcion.findFirst({
        where: { usuarioId: userId, cursoId: item.refId },
      });

      if (!exists) {
        await this.prisma.inscripcion.create({
          data: {
            usuarioId: userId,
            cursoId: item.refId,
            progreso: {
              completado: [],
              subscription: {
                duration,
                durationType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });
      } else {
        // Si ya existe la inscripción, actualizamos la información de suscripción
        const currentProgreso = exists.progreso as Record<string, any>;
        await this.prisma.inscripcion.update({
          where: { id: exists.id },
          data: {
            progreso: {
              ...currentProgreso,
              subscription: {
                duration,
                durationType,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });
      }
    }
  }
}
