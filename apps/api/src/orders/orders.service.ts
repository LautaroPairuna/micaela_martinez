// apps/api/src/orders/orders.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
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
import { parseJson } from './interfaces/orden-metadata.interface';

type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | string;

type FrequencyType = 'months' | 'days';

function normalizeFrequencyType(v?: string | null): FrequencyType {
  const s = (v ?? '').toLowerCase();
  if (s.includes('day') || s === 'dia' || s === 'días' || s === 'dias') return 'days';
  return 'months';
}

type AttemptOptions = { attemptId?: string };

function normalizeAttemptId(attemptId?: string) {
  const a = (attemptId ?? '').trim();
  return a !== '' ? a : randomUUID();
}

function buildMpIdemKey(prefix: 'pay' | 'sub', orderId: number, attemptId: string) {
  return `${prefix}-${orderId}-${attemptId}`;
}

function addFrequency(base: Date, freq: number, type: FrequencyType): Date {
  const d = new Date(base);
  if (type === 'months') d.setMonth(d.getMonth() + freq);
  else d.setDate(d.getDate() + freq);
  return d;
}

function mergeSubscriptionMeta(current: any, patch: any) {
  return {
    ...(current || {}),
    subscription: {
      ...((current?.subscription) || {}),
      ...(patch || {}),
    },
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

const toInt = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`ID inválido: ${v}`);
  return n;
};

// ✅ Helper para validar IP pública
function isPublicIp(ip?: string) {
  if (!ip) return false;
  const v = ip.trim();
  if (!v) return false;
  if (v === '::1' || v.startsWith('127.')) return false;
  if (v.startsWith('10.')) return false;
  if (v.startsWith('192.168.')) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return false;
  return true;
}

import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mpPaymentService: MpPaymentService,
    private readonly mpSubscriptionService: MpSubscriptionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    private readonly cartService: CartService,
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
    
    // ✅ Validar mezcla prohibida de cursos y productos
    const hasCourses = items.some(i => i.tipo === TipoItemOrden.CURSO);
    const hasProducts = items.some(i => i.tipo === TipoItemOrden.PRODUCTO);
    
    if (hasCourses && hasProducts) {
      throw new HttpException(
        'No es posible procesar una orden mixta (Cursos + Productos). Por favor, comprálos por separado.',
        HttpStatus.BAD_REQUEST,
      );
    }

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
    const order = await this.prisma.orden.create({
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

    // 🧹 Limpiar el carrito del usuario tras crear la orden exitosamente
    try {
      await this.cartService.clearCart(userId);
    } catch (error) {
      console.error('Error clearing cart after order creation:', error);
      // No bloqueamos la creación de la orden si falla limpiar el carrito, pero logueamos
    }

    return order;
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

  /**
   * Sincroniza suscripciones históricas que puedan tener metadatos incompletos.
   * Útil para órdenes pagadas antes de las actualizaciones de lógica de fechas.
   */
  async syncHistoricalSubscriptions() {
    const historicalOrders = await this.prisma.orden.findMany({
      where: {
        esSuscripcion: true,
        estado: EstadoOrden.PAGADO,
      },
      include: {
        items: true,
      },
    });

    const results = {
      total: historicalOrders.length,
      updated: 0,
      errors: 0,
    };

    for (const order of historicalOrders) {
      try {
        const metadatos = parseMetadatos(order.metadatos);
        let nextPaymentDate = metadatos?.subscription?.nextPaymentDate;

        // 1. Si falta la fecha de próximo pago, calcularla
        if (!nextPaymentDate) {
          const frequency = order.suscripcionFrecuencia || 1;
          const frequencyType = order.suscripcionTipoFrecuencia || 'months';
          const date = new Date(order.actualizadoEn || order.creadoEn);

          if (frequencyType.includes('month')) {
            date.setMonth(date.getMonth() + frequency);
          } else if (frequencyType.includes('day')) {
            date.setDate(date.getDate() + frequency);
          }
          nextPaymentDate = date.toISOString();
        }

        // 2. Actualizar metadatos de la orden
        const updatedMeta = {
          ...metadatos,
          subscription: {
            ...(metadatos?.subscription || {}),
            nextPaymentDate,
            isActive: order.suscripcionActiva !== false,
            orderId: order.id,
            subscriptionId: order.suscripcionId,
          },
        };

        await this.prisma.orden.update({
          where: { id: order.id },
          data: {
            suscripcionActiva: true,
            metadatos: json(updatedMeta),
          },
        });

        // 3. Asegurar inscripciones y sus metadatos
        const courseItems = order.items.filter(
          (i) => i.tipo === TipoItemOrden.CURSO,
        );
        for (const item of courseItems) {
          const enrollment = await this.prisma.inscripcion.findUnique({
            where: {
              usuarioId_cursoId: {
                usuarioId: order.usuarioId,
                cursoId: item.refId,
              },
            },
          });

          const subMeta = {
            orderId: order.id,
            subscriptionId: order.suscripcionId,
            endDate: nextPaymentDate,
            isActive: true,
          };

          if (!enrollment) {
            await this.prisma.inscripcion.create({
              data: {
                usuarioId: order.usuarioId,
                cursoId: item.refId,
                estado: EstadoInscripcion.ACTIVADA,
                progreso: json({ subscription: subMeta }),
              },
            });
          } else {
            const currentProgreso = (enrollment.progreso as any) || {};
            await this.prisma.inscripcion.update({
              where: { id: enrollment.id },
              data: {
                estado: EstadoInscripcion.ACTIVADA,
                progreso: json({
                  ...currentProgreso,
                  subscription: subMeta,
                }),
              },
            });
          }
        }

        results.updated++;
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error);
        results.errors++;
      }
    }

    return results;
  }

  /** Pago one-off (no suscripción) */
  async processMercadoPagoPayment(
    orderId: number,
    userId: number,
    paymentData: MercadoPagoPaymentDto,
    options?: AttemptOptions & { ip?: string },
  ) {
    const order = await this.getOrderById(orderId, userId);

    if (order.estado !== EstadoOrden.PENDIENTE) {
      throw new HttpException(
        'La orden no está en estado pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }

    const lockKey = `pay-${order.id}`;

    // ✅ attemptId compartido FE/BE (trazabilidad)
    const attempt = normalizeAttemptId(options?.attemptId);
    const mpIdemKey = buildMpIdemKey('pay', order.id, attempt);

    try {
      const metadatos = parseMetadatos(order.metadatos) as any;
      const lock = metadatos?.paymentLocks?.[lockKey];

      // ✅ si ya se cobró, devolvemos orden
      if (lock?.status === 'succeeded') {
        return await this.getOrderById(orderId, userId);
      }

      // ✅ anti doble click 10s (lock estable)
      if (lock?.status === 'started') {
        const startedAt =
          typeof lock?.createdAt === 'string' ? Date.parse(lock.createdAt) : NaN;
        if (Number.isFinite(startedAt) && Date.now() - startedAt < 10000) {
          throw new HttpException(
            'Pago en progreso, reintentá en unos segundos',
            HttpStatus.CONFLICT,
          );
        }
      }

      // ✅ si este attempt ya fue ejecutado, devolvé idempotente
      const prevAttempt = metadatos?.paymentAttempts?.[mpIdemKey];
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

      // set lock + attempt started
      await this.prisma.orden.update({
        where: { id: order.id },
        data: {
          metadatos: json({
            ...metadatos,
            paymentLocks: {
              ...(metadatos?.paymentLocks || {}),
              [lockKey]: {
                status: 'started',
                createdAt: new Date().toISOString(),
                mpIdemKey,
              },
            },
            paymentAttempts: {
              ...(metadatos?.paymentAttempts || {}),
              [mpIdemKey]: {
                status: 'started',
                createdAt: new Date().toISOString(),
              },
            },
          }),
        },
      });

      // email
      let payerEmail = paymentData.email;
      if (!payerEmail) {
        const user = await this.prisma.usuario.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        payerEmail = user?.email ?? undefined;
      }
      if (!payerEmail) {
        throw new HttpException(
          'Email requerido para procesar el pago',
          HttpStatus.BAD_REQUEST,
        );
      }

      // MP items
      const mpItems = (order.items ?? []).map((it: ItemOrden) => {
        const isCourse = it.tipo === TipoItemOrden.CURSO;
        const itemId = `${isCourse ? 'COURSE' : 'PRODUCT'}-${it.refId}`;
        const title = String(it.titulo ?? (isCourse ? 'Curso' : 'Producto'));
        const categoryId = isCourse ? 'education' : 'others';
        const quantity = Number(it.cantidad ?? 1);
        const unitPrice = Number(it.precioUnitario ?? 0);
        const pictureUrl = (it as any).imagen as string | undefined;

        return {
          id: itemId,
          title,
          description: isCourse
            ? `Acceso al curso: ${title}`
            : `Compra de producto: ${title}`,
          ...(pictureUrl ? { picture_url: pictureUrl } : {}),
          category_id: categoryId,
          quantity,
          unit_price: unitPrice,
        };
      });

      const statementDescriptor = 'DOMINIOPRUEBA';

      console.log('[PAY] order', {
        orderId: order.id,
        total: String(order.total),
        mpIdemKey,
        items: order.items?.map((i: ItemOrden) => ({
          tipo: i.tipo,
          refId: i.refId,
          titulo: i.titulo,
          qty: i.cantidad,
          pu: i.precioUnitario,
        })),
      });

      const paymentResult = await this.mpPaymentService.processPayment(
        {
          token: paymentData.token,
          issuer_id: paymentData.issuerId,
          installments: paymentData.installments,
          payment_method_id: paymentData.paymentMethodId,
          transaction_amount: Number(order.total),
          description: `Pago Orden #${order.id}`,
          external_reference: String(order.id),
          statement_descriptor: statementDescriptor,
          additional_info: { 
            items: mpItems,
            ...(isPublicIp(options?.ip) ? { ip_address: options!.ip!.trim() } : {}), // ✅ Solo IP pública
          },
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
        { idempotencyKey: mpIdemKey }, // ✅ tipo correcto
      );

      if (paymentResult.status === 'approved') {
        const metaSuccess = parseMetadatos(
          (
            await this.prisma.orden.findUnique({
              where: { id: order.id },
              select: { metadatos: true },
            })
          )?.metadatos,
        ) as any;

        await this.prisma.orden.update({
          where: { id: order.id },
          data: {
            metadatos: json({
              ...metaSuccess,
              paymentLocks: {
                ...(metaSuccess?.paymentLocks || {}),
                [lockKey]: {
                  status: 'succeeded',
                  mpPaymentId: String(paymentResult.id),
                  statusDetail: paymentResult.status_detail,
                  updatedAt: new Date().toISOString(),
                  mpIdemKey,
                },
              },
              paymentAttempts: {
                ...(metaSuccess?.paymentAttempts || {}),
                [mpIdemKey]: {
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

      // rejected
      const metaRejected = parseMetadatos(
        (
          await this.prisma.orden.findUnique({
            where: { id: order.id },
            select: { metadatos: true },
          })
        )?.metadatos,
      ) as any;

      await this.prisma.orden.update({
        where: { id: order.id },
        data: {
          metadatos: json({
            ...metaRejected,
            paymentLocks: {
              ...(metaRejected?.paymentLocks || {}),
              [lockKey]: {
                status: 'failed',
                error: `rejected:${paymentResult.status_detail ?? paymentResult.status}`,
                updatedAt: new Date().toISOString(),
                mpIdemKey,
              },
            },
            paymentAttempts: {
              ...(metaRejected?.paymentAttempts || {}),
              [mpIdemKey]: {
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

      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(`Error al procesar el pago: ${msg}`, HttpStatus.BAD_REQUEST);
    }
  }

  /** Alta de suscripción MP para orden con cursos */
  async createMercadoPagoSubscription(
    orderId: number,
    userId: number,
    subscriptionData: MercadoPagoSubscriptionDto,
    options?: AttemptOptions,
  ) {
    const order = await this.getOrderById(orderId, userId);

    if (order.estado !== EstadoOrden.PENDIENTE) {
      throw new HttpException(
        'La orden no está en estado pendiente',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hasCourses = order.items?.some((i: ItemOrden) => i.tipo === TipoItemOrden.CURSO);
    if (!hasCourses) {
      throw new HttpException(
        'No hay cursos en la orden para crear una suscripción',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ✅ blindaje: NO permitir productos en una suscripción
    const hasProducts = order.items?.some((i: ItemOrden) => i.tipo === TipoItemOrden.PRODUCTO);
    if (hasProducts) {
      throw new HttpException(
        'La suscripción solo puede contener cursos. Eliminá productos del carrito.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!subscriptionData.token || typeof subscriptionData.token !== 'string') {
      throw new HttpException('Token de tarjeta faltante', HttpStatus.BAD_REQUEST);
    }
    if (subscriptionData.token.length < 20) {
      throw new HttpException('Token de tarjeta inválido o demasiado corto', HttpStatus.BAD_REQUEST);
    }

    const attempt = normalizeAttemptId(options?.attemptId);
    const mpIdemKey = buildMpIdemKey('sub', order.id, attempt);

    try {
      const metadatos = parseMetadatos(order.metadatos) as any;
      const prevAttempt = metadatos?.subscriptionAttempts?.[mpIdemKey];

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
              [mpIdemKey]: {
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
        payerEmail = user?.email ?? undefined;
      }
      if (!payerEmail) {
        throw new HttpException(
          'Email requerido para procesar la suscripción',
          HttpStatus.BAD_REQUEST,
        );
      }

      const subscriptionResult = await this.mpSubscriptionService.createSubscription(
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
        { idempotencyKey: mpIdemKey }, // ✅ FORZADO
      );

      const subId = String(subscriptionResult.id);

      const updatedOrder = await this.prisma.orden.update({
        where: { id: Number(orderId) },
        data: {
          estado: EstadoOrden.PENDIENTE,
          referenciaPago: String(order.id),
          esSuscripcion: true,
          suscripcionActiva: false,
          suscripcionId: subId,
          suscripcionFrecuencia: subscriptionData.frequency,
          suscripcionTipoFrecuencia: subscriptionData.frequencyType,
          metadatos: json({
            ...metadatos,
            subscriptionAttempts: {
              ...(metadatos?.subscriptionAttempts || {}),
              [mpIdemKey]: {
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

      await this.createCourseEnrollmentsAsPending(updatedOrder.id, updatedOrder.usuarioId);

      try {
        await this.notificationsService.createNotification({
          usuarioId: String(userId),
          tipo: TipoNotificacion.SISTEMA,
          titulo: 'Suscripción en proceso',
          mensaje: `Hemos recibido tu solicitud de suscripción para la orden #${orderId}. Te notificaremos en cuanto esté lista.`,
          url: `/perfil/ordenes/${orderId}`,
          metadata: {
            orderId: Number(orderId),
            subscriptionId: subId,
            type: 'subscription_processing',
          },
        });
      } catch {}

      return updatedOrder;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(`Error al procesar la suscripción: ${msg}`, HttpStatus.BAD_REQUEST);
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
  async processMercadoPagoWebhook(eventType: string, dataIdRaw: string, webhookData: unknown) {
    const type = String(eventType || '').trim().toLowerCase();
    const idRaw = String(dataIdRaw || '').trim(); // 👈 NO lowercase acá

    if (!type || !idRaw) {
      throw new HttpException('Datos de webhook incompletos', HttpStatus.BAD_REQUEST);
    }

    // Normalizamos el "tipo" (type/action/topic) a un set pequeño
    const normalizedType =
      type.startsWith('payment') ? 'payment'
      : type.startsWith('subscription_preapproval') ? 'subscription_preapproval'
      : type.startsWith('subscription_authorized_payment') ? 'subscription_authorized_payment'
      : type.startsWith('subscription_payment') ? 'subscription_payment'
      : type.startsWith('subscription_status_update') ? 'subscription_status_update'
      : type;

    try {
      switch (normalizedType) {
        case 'subscription_preapproval':
        case 'subscription_status_update': {
          // ✅ Para preapproval el id puede ser alfanumérico
          // Si querés estandarizar para DB lookups, podés usar lowercase SOLO acá:
          const subId = /[a-z]/i.test(idRaw) ? idRaw.toLowerCase() : idRaw;
          return await this.handleSubscriptionStatusUpdate(
            subId,
            webhookData as Record<string, unknown>,
          );
        }

        case 'subscription_authorized_payment':
        case 'subscription_payment':
        case 'payment': {
          // ✅ Acá el ID debe ser numérico (payment id)
          const paymentId = Number(idRaw);
          if (!Number.isFinite(paymentId)) {
            return { processed: true, ignored: true, reason: 'invalid_payment_id', idRaw };
          }

          return await this.handlePaymentWebhook(
            paymentId,
            webhookData as Record<string, unknown>,
          );
        }

        case 'subscription_plan':
          return { received: true, type: normalizedType };

        default:
          console.log(`Evento de webhook no manejado: ${normalizedType}`, { type, idRaw });
          return { received: true, type: normalizedType };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      throw new HttpException(`Error al procesar el webhook: ${msg}`, HttpStatus.INTERNAL_SERVER_ERROR);
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
    // 1) Obtener pago desde MP
    const paymentDetails = await this.mpPaymentService.getPayment(String(paymentId));
    if (!paymentDetails) return { processed: false, reason: 'payment_not_found' };

    const ref = paymentDetails.external_reference;
    if (!ref) return { processed: true, reason: 'missing_external_reference' };

    const orderId = Number(ref);
    if (!Number.isFinite(orderId)) return { processed: true, reason: 'invalid_external_reference' };

    const order = await this.prisma.orden.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return { processed: true, reason: 'order_not_found' };

    // 2) Upsert pago
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

    // 3) Si no aprobado, listo (no habilita acceso)
    if (paymentDetails.status !== 'approved') {
      return { processed: true, status: paymentDetails.status };
    }

    // 4) Pago aprobado -> actualizar Orden / metadatos
    const freshOrder = await this.prisma.orden.findUnique({ where: { id: order.id } });

    const isSub = Boolean(freshOrder?.esSuscripcion ?? order.esSuscripcion);

    const freq = freshOrder?.suscripcionFrecuencia ?? order.suscripcionFrecuencia ?? 1;
    const freqType = normalizeFrequencyType(
      freshOrder?.suscripcionTipoFrecuencia ?? order.suscripcionTipoFrecuencia ?? 'months',
    );

    const now = new Date();
    const nextPaymentDate = isSub ? addFrequency(now, freq, freqType) : null;

    const currentMeta = parseJson<any>(freshOrder?.metadatos ?? order.metadatos);
    const nextMeta = isSub
      ? mergeSubscriptionMeta(currentMeta, {
          id: freshOrder?.suscripcionId ?? order.suscripcionId ?? paymentDetails.subscription_id ?? undefined,
          frequency: freq,
          frequencyType: freqType,
          status: currentMeta?.subscription?.status ?? 'active',
          lastPaymentDate: now.toISOString(),
          nextPaymentDate: nextPaymentDate?.toISOString(),
          updatedAt: now.toISOString(),
        })
      : currentMeta;

    await this.prisma.orden.update({
      where: { id: order.id },
      data: {
        estado: EstadoOrden.PAGADO,
        referenciaPago,
        suscripcionActiva: isSub ? true : null,
        suscripcionProximoPago: isSub ? nextPaymentDate : null,
        metadatos: json(nextMeta),
      },
    });

    // 5) Activar inscripciones
    await this.createCourseEnrollments(order.id, order.usuarioId, nextPaymentDate);

    // 6) Si es sub, renovar otras inscripciones del usuario (opcional)
    if (isSub) {
      await this.renewCourseSubscriptions(order.usuarioId, nextPaymentDate);

      try {
        await this.notificationsService.createNotification({
          usuarioId: String(order.usuarioId),
          tipo: TipoNotificacion.SISTEMA,
          titulo: 'Suscripción aprobada',
          mensaje: `¡Tu suscripción para la orden #${order.id} fue aprobada! Ya tienes acceso a tus cursos.`,
          url: '/perfil/cursos',
          metadata: {
            orderId: order.id,
            subscriptionId: paymentDetails.subscription_id,
            type: 'subscription_approved',
          },
        });
      } catch {}
    }

    return { processed: true, orderId: order.id, status: 'approved' };
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

  /**
   * Renueva las suscripciones de los cursos de un usuario.
   * Ahora renueva columnas y también mantiene el JSON en sync (sin pisar).
   */
  private async renewCourseSubscriptions(userId: number, nextPaymentDate?: Date | null) {
    if (!nextPaymentDate) return;

    const enrollments = await this.prisma.inscripcion.findMany({
      where: { usuarioId: Number(userId) },
    });

    const now = new Date();
    const end = new Date(nextPaymentDate);

    for (const enrollment of enrollments) {
      // Solo renovar si está bajo una suscripción activa (por columnas o por JSON)
      const currentProgreso = parseJson<Record<string, any>>(enrollment.progreso);

      const hasSub =
        enrollment.subscriptionActive === true ||
        Boolean(currentProgreso?.subscription);

      if (!hasSub) continue;

      const nextProgreso = {
        ...currentProgreso,
        subscription: {
          ...(currentProgreso.subscription || {}),
          startDate: now.toISOString(),
          endDate: end.toISOString(),
          isActive: true,
        },
      };

      await this.prisma.inscripcion.update({
        where: { id: enrollment.id },
        data: {
          subscriptionEndDate: end,
          subscriptionActive: true,
          progreso: json(nextProgreso),
        },
      });
    }
  }

  /**
   * Crea inscripciones para los cursos de una orden (pago aprobado).
   * Clave: merge profundo de subscription y además setea columnas.
   */
  private async createCourseEnrollments(
    orderId: number,
    userId: number,
    nextPaymentDate?: Date | null,
  ) {
    const order = await this.prisma.orden.findUnique({
      where: { id: Number(orderId) },
      include: { items: true },
    });
    if (!order) return;

    const courseItems = order.items.filter((i) => i.tipo === TipoItemOrden.CURSO);
    if (!courseItems.length) return;

    const now = new Date();
    const isSub = Boolean(order.esSuscripcion);

    await Promise.all(
      courseItems.map(async (i) => {
        const existing = await this.prisma.inscripcion.findUnique({
          where: {
            usuarioId_cursoId: {
              usuarioId: Number(userId),
              cursoId: Number(i.refId),
            },
          },
        });

        const currentProgreso = parseJson<Record<string, any>>(existing?.progreso);
        let nextProgreso = { ...currentProgreso };

        const endDateColumn = isSub && nextPaymentDate ? new Date(nextPaymentDate) : null;

        if (isSub) {
          const freq = order.suscripcionFrecuencia ?? 1;
          const freqType = normalizeFrequencyType(order.suscripcionTipoFrecuencia ?? 'months');

          nextProgreso = {
            ...nextProgreso,
            subscription: {
              ...(nextProgreso.subscription || {}),
              orderId: order.id,
              subscriptionId: order.suscripcionId ?? undefined,
              isActive: true,
              startDate: now.toISOString(),
              endDate: endDateColumn ? endDateColumn.toISOString() : undefined,
              frequency: freq,
              frequencyType: freqType,
            },
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
            ...(isSub
              ? {
                  progreso: json(nextProgreso),
                  subscriptionOrderId: order.id,
                  subscriptionId: order.suscripcionId,
                  subscriptionEndDate: endDateColumn,
                  subscriptionActive: true,
                }
              : {}),
          },
          create: {
            usuarioId: Number(userId),
            cursoId: Number(i.refId),
            estado: EstadoInscripcion.ACTIVADA,
            progreso: isSub ? json(nextProgreso) : json(nextProgreso ?? {}),

            subscriptionOrderId: isSub ? order.id : null,
            subscriptionId: isSub ? order.suscripcionId : null,
            subscriptionEndDate: isSub ? endDateColumn : null,
            subscriptionActive: isSub ? true : null,
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
  }

  /**
   * Crea inscripciones PENDIENTES (isActive: false) apenas se crea la suscripción.
   * Esto es exactamente donde te faltaba orderId en algunos casos: ahora lo aseguramos por merge y además en columnas.
   */
  private async createCourseEnrollmentsAsPending(orderId: number, userId: number) {
    const order = await this.prisma.orden.findUnique({
      where: { id: Number(orderId) },
      include: { items: true },
    });
    if (!order) return;

    const courseItems = order.items.filter((i) => i.tipo === TipoItemOrden.CURSO);
    if (!courseItems.length) return;

    const now = new Date();
    const freq = order.suscripcionFrecuencia ?? 1;
    const freqType = normalizeFrequencyType(order.suscripcionTipoFrecuencia ?? 'months');

    await Promise.all(
      courseItems.map(async (i) => {
        const existing = await this.prisma.inscripcion.findUnique({
          where: {
            usuarioId_cursoId: {
              usuarioId: Number(userId),
              cursoId: Number(i.refId),
            },
          },
        });

        const currentProgreso = parseJson<Record<string, any>>(existing?.progreso);

        const nextProgreso = {
          ...currentProgreso,
          subscription: {
            ...(currentProgreso.subscription || {}),
            orderId: order.id,                // ✅ siempre presente
            subscriptionId: order.suscripcionId ?? undefined,
            isActive: false,                  // ✅ en proceso
            startDate: now.toISOString(),
            frequency: freq,
            frequencyType: freqType,
          },
        };

        return this.prisma.inscripcion.upsert({
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

            // ✅ columnas
            subscriptionOrderId: order.id,
            subscriptionId: order.suscripcionId,
            subscriptionActive: false,
            // endDate todavía no existe (hasta el primer approved)
            subscriptionEndDate: null,
          },
          create: {
            usuarioId: Number(userId),
            cursoId: Number(i.refId),
            estado: EstadoInscripcion.ACTIVADA,
            progreso: json(nextProgreso),

            // ✅ columnas
            subscriptionOrderId: order.id,
            subscriptionId: order.suscripcionId,
            subscriptionActive: false,
            subscriptionEndDate: null,
          },
        });
      }),
    );
  }
}
