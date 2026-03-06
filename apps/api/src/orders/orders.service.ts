// apps/api/src/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto,
  OrderSource,
  PayOrderDto,
  SubscribeOrderDto,
} from './dto/orders.dto';
import { MpPaymentService } from '../mercadopago/mp-payment.service';
import { MpSubscriptionService } from '../mercadopago/mp-subscription.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, EstadoInscripcion } from '@prisma/client';

function dec(n: number) {
  return new Decimal(n.toFixed(2));
}

function applyDiscount(price: number, discount?: number | null) {
  const safePrice = Number.isFinite(price) ? Math.max(0, price) : 0;
  const rawDiscount = Number(discount ?? 0);
  const safeDiscount = Number.isFinite(rawDiscount)
    ? Math.min(100, Math.max(0, rawDiscount))
    : 0;
  const final = safePrice * (1 - safeDiscount / 100);
  return Math.max(0, final);
}

function normalizeStatus(mpStatus: string) {
  const s = String(mpStatus || '').toLowerCase();
  if (s === 'approved' || s === 'authorized') return 'APPROVED';
  if (s === 'rejected') return 'REJECTED';
  if (s === 'cancelled') return 'CANCELLED';
  if (s === 'refunded') return 'REFUNDED';
  if (!s) return 'UNKNOWN';
  return 'PENDING';
}

/**
 * ✅ Prisma JSON typing: lo que guardes en metadatos debe ser InputJsonValue.
 * Este helper elimina campos sensibles y devuelve InputJsonValue.
 */
function sanitizeMeta(meta: unknown): Prisma.InputJsonValue {
  if (!meta || typeof meta !== 'object') return meta as Prisma.InputJsonValue;

  const clone: Record<string, unknown> = { ...(meta as Record<string, unknown>) };
  delete (clone as any).token;
  delete (clone as any).card_token_id;

  // Prisma acepta objetos plain como InputJsonObject
  return clone as Prisma.InputJsonObject;
}

function safeJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!value) return {} as Prisma.InputJsonObject;

  if (typeof value === 'object') {
    return value as Prisma.InputJsonObject;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed as Prisma.InputJsonObject;
      return {} as Prisma.InputJsonObject;
    } catch {
      return {} as Prisma.InputJsonObject;
    }
  }

  return {} as Prisma.InputJsonObject;
}

/**
 * Merge no destructivo de `subscription` dentro de un JSON (con types Prisma).
 */
function mergeSubscriptionMeta(
  base: unknown,
  patch: Prisma.InputJsonObject,
): Prisma.InputJsonObject {
  const obj = safeJsonObject(base);

  const sub =
    (obj as any).subscription && typeof (obj as any).subscription === 'object'
      ? ((obj as any).subscription as Prisma.InputJsonObject)
      : ({} as Prisma.InputJsonObject);

  return {
    ...(obj as any),
    subscription: {
      ...(sub as any),
      ...(patch as any),
    },
  } as Prisma.InputJsonObject;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mpPayment: MpPaymentService,
    private readonly mpSub: MpSubscriptionService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createFromCart(userId: number, dto: CreateOrderDto) {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Usuario inválido');
    }

    if (dto.source && dto.source !== OrderSource.CART) {
      throw new BadRequestException(
        'Solo se soportan órdenes desde el carrito por el momento',
      );
    }

    const cart = await this.prisma.carrito.findUnique({
      where: { usuarioId: userId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0)
      throw new BadRequestException('Carrito vacío');

    const hasCourse = cart.items.some((i) => i.tipo === 'CURSO');
    const hasProduct = cart.items.some((i) => i.tipo === 'PRODUCTO');
    if (hasCourse && hasProduct) {
      throw new BadRequestException(
        'No se permiten órdenes mixtas (Cursos + Productos)',
      );
    }

    const orderType = hasCourse ? 'SUBSCRIPTION' : 'ONE_OFF';
    const esSuscripcion = hasCourse;

    const cursoIds = cart.items
      .filter((i) => i.cursoId)
      .map((i) => i.cursoId as number);

    const productoIds = cart.items
      .filter((i) => i.productoId)
      .map((i) => i.productoId as number);

    const [cursos, productos] = await Promise.all([
      cursoIds.length > 0
        ? this.prisma.curso.findMany({
            where: { id: { in: cursoIds }, publicado: true },
          })
        : Promise.resolve([]),
      productoIds.length > 0
        ? this.prisma.producto.findMany({
            where: { id: { in: productoIds }, publicado: true },
          })
        : Promise.resolve([]),
    ]);

    const cursoMap = new Map(cursos.map((c) => [c.id, c]));
    const prodMap = new Map(productos.map((p) => [p.id, p]));

    const itemsOrden: any[] = [];

    for (const it of cart.items) {
      if (it.tipo === 'CURSO') {
        const c = it.cursoId ? cursoMap.get(it.cursoId) : null;
        if (!c)
          throw new BadRequestException(
            `Curso ${it.cursoId} inválido o no publicado`,
          );

        const price = applyDiscount(Number(c.precio), Number(c.descuento ?? 0));

        itemsOrden.push({
          tipo: 'CURSO',
          refId: c.id,
          titulo: c.titulo,
          cantidad: 1,
          precioUnitario: dec(price),
          cursoId: c.id,
          productoId: null,
        });
      } else {
        const p = it.productoId ? prodMap.get(it.productoId) : null;
        if (!p)
          throw new BadRequestException(
            `Producto ${it.productoId} inválido o no publicado`,
          );
        if (p.stock < it.cantidad)
          throw new BadRequestException(`Stock insuficiente para ${p.titulo}`);

        const price = applyDiscount(Number(p.precio), Number(p.descuento ?? 0));

        itemsOrden.push({
          tipo: 'PRODUCTO',
          refId: p.id,
          titulo: p.titulo,
          cantidad: it.cantidad,
          precioUnitario: dec(price),
          cursoId: null,
          productoId: p.id,
        });
      }
    }

    const totalNumber = itemsOrden.reduce(
      (acc, i) => acc + Number(i.precioUnitario) * i.cantidad,
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          usuarioId: userId,
          estado: 'PENDIENTE',
          total: dec(totalNumber),
          moneda: 'ARS',
          tipo: orderType as any,
          esSuscripcion,
          metadatos: (dto.metadatos ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          direccionEnvioId: dto.direccionEnvioId
            ? Number(dto.direccionEnvioId)
            : null,
          direccionFacturacionId: dto.direccionFacturacionId
            ? Number(dto.direccionFacturacionId)
            : null,
          items: { create: itemsOrden },
        },
        include: { items: true },
      });

      await tx.itemCarrito.deleteMany({ where: { carritoId: cart.id } });

      return orden;
    });
  }

  async getMyOrders(userId: number) {
    return this.prisma.orden.findMany({
      where: { usuarioId: userId },
      orderBy: { creadoEn: 'desc' },
      include: {
        items: {
          include: {
            curso: { select: { id: true, portada: true, slug: true } },
            producto: { select: { id: true, imagen: true, slug: true } },
          },
        },
        direccionEnvio: true,
        direccionFacturacion: true,
        pagos: { orderBy: { creadoEn: 'desc' }, take: 10 },
      },
    });
  }

  async getOrderById(userId: number, orderId: number) {
    const order = await this.prisma.orden.findFirst({
      where: { id: orderId, usuarioId: userId },
      include: {
        items: {
          include: {
            curso: { select: { id: true, portada: true, slug: true } },
            producto: { select: { id: true, imagen: true, slug: true } },
          },
        },
        direccionEnvio: true,
        direccionFacturacion: true,
        pagos: { orderBy: { creadoEn: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }

  async payOneOff(userId: number, orderId: number, dto: PayOrderDto) {
    const order = await this.getOrderById(userId, orderId);
    if (order.estado !== 'PENDIENTE')
      throw new BadRequestException('La orden no está pendiente');
    if (order.tipo !== 'ONE_OFF')
      throw new BadRequestException('La orden no es de pago único');

    const idemKey = `pay-${orderId}-${dto.attemptId}`;

    const mpItems = order.items.map((item) => {
      const isCourse = item.tipo === 'CURSO';
      const image = isCourse ? item.curso?.portada : item.producto?.imagen;
      const title = item.titulo?.trim() || (isCourse ? 'Curso' : 'Producto');

      return {
        id: `${isCourse ? 'COURSE' : 'PRODUCT'}-${item.refId}`,
        title,
        description: isCourse
          ? `Acceso al curso ${title}`
          : `Compra de producto ${title}`,
        ...(image ? { picture_url: image } : {}),
        category_id: isCourse ? 'education' : 'others',
        quantity: Number(item.cantidad ?? 1),
        unit_price: Number(item.precioUnitario ?? 0),
      };
    });

    const mpRes = await this.mpPayment.createPayment(
      {
        transaction_amount: Number(order.total),
        token: dto.token,
        description: `Orden #${order.id}`,
        installments: dto.installments,
        payment_method_id: dto.payment_method_id,
        issuer_id: dto.issuer_id,
        payer: {
          email: dto.payer_email,
          identification: dto.payer_identification,
        },
        external_reference: String(order.id),
        additional_info: {
          items: mpItems,
        },
      },
      idemKey,
    );

    await this.prisma.pago.upsert({
      where: {
        provider_kind_mpId: {
          provider: 'MERCADOPAGO',
          kind: 'ONE_OFF',
          mpId: String(mpRes.id),
        },
      },
      update: {
        status: normalizeStatus(mpRes.status),
        statusDetail: mpRes.status_detail ?? null,
        monto: dec(Number(order.total)),
        moneda: order.moneda,
        attemptId: dto.attemptId,
        idempotencyKey: idemKey,
        metadatos: sanitizeMeta({
          payment_id: mpRes.id,
          status: mpRes.status,
          detail: mpRes.status_detail,
        }),
      },
      create: {
        provider: 'MERCADOPAGO',
        kind: 'ONE_OFF',
        mpId: String(mpRes.id),
        status: normalizeStatus(mpRes.status),
        statusDetail: mpRes.status_detail ?? null,
        ordenId: order.id,
        usuarioId: userId,
        monto: dec(Number(order.total)),
        moneda: order.moneda,
        attemptId: dto.attemptId,
        idempotencyKey: idemKey,
        metadatos: sanitizeMeta({
          payment_id: mpRes.id,
          status: mpRes.status,
          detail: mpRes.status_detail,
        }),
      },
    });

    await this.prisma.orden.update({
      where: { id: order.id },
      data: { referenciaPago: String(mpRes.id) },
    });

    return mpRes;
  }

  async subscribe(userId: number, orderId: number, dto: SubscribeOrderDto) {
    const order = await this.getOrderById(userId, orderId);
    if (order.estado !== 'PENDIENTE')
      throw new BadRequestException('La orden no está pendiente');
    if (order.tipo !== 'SUBSCRIPTION')
      throw new BadRequestException('La orden no es de suscripción');

    const courseItems = order.items.filter((i) => i.tipo === 'CURSO' && i.cursoId);
    if (courseItems.length === 0) {
      throw new BadRequestException('La orden de suscripción no contiene cursos');
    }

    const idemKey = `sub-${orderId}-${dto.attemptId}`;

    const mpRes = await this.mpSub.createPreapproval(
      {
        reason: `Suscripción - Orden #${order.id}`,
        external_reference: String(order.id),
        payer_email: dto.payer_email,
        card_token_id: dto.card_token_id,
        payment_method_id: dto.payment_method_id,
        auto_recurring: {
          frequency: dto.frequency,
          frequency_type: dto.frequency_type,
          transaction_amount: Number(order.total),
          currency_id: order.moneda,
        },
      },
      idemKey,
    );

    const now = new Date();
    const blockEndDate = new Date(now.getTime() - 1000);

    return this.prisma.$transaction(async (tx) => {
      await tx.pago.upsert({
        where: {
          provider_kind_mpId: {
            provider: 'MERCADOPAGO',
            kind: 'SUBSCRIPTION_PREAPPROVAL',
            mpId: mpRes.id,
          },
        },
        update: {
          status: normalizeStatus(mpRes.status),
          statusDetail: null,
          monto: dec(Number(order.total)),
          moneda: order.moneda,
          attemptId: dto.attemptId,
          idempotencyKey: idemKey,
          metadatos: sanitizeMeta({
            preapproval_id: mpRes.id,
            status: mpRes.status,
            next: mpRes.next_payment_date,
          }),
        },
        create: {
          provider: 'MERCADOPAGO',
          kind: 'SUBSCRIPTION_PREAPPROVAL',
          mpId: mpRes.id,
          status: normalizeStatus(mpRes.status),
          ordenId: order.id,
          usuarioId: userId,
          monto: dec(Number(order.total)),
          moneda: order.moneda,
          attemptId: dto.attemptId,
          idempotencyKey: idemKey,
          metadatos: sanitizeMeta({
            preapproval_id: mpRes.id,
            status: mpRes.status,
            next: mpRes.next_payment_date,
          }),
        },
      });

      const patchedMeta = mergeSubscriptionMeta(
        order.metadatos,
        {
          status: (mpRes.status ?? 'processing') as any,
          createdAt: now.toISOString(),
          frequency: dto.frequency as any,
          frequencyType: dto.frequency_type as any,
          nextPaymentDate: (mpRes.next_payment_date ?? null) as any,
          orderId: order.id as any,
          subscriptionId: mpRes.id as any,
        } as Prisma.InputJsonObject,
      );

      await tx.orden.update({
        where: { id: order.id },
        data: {
          suscripcionId: mpRes.id,
          suscripcionActiva: false,
          suscripcionProximoPago: mpRes.next_payment_date
            ? new Date(mpRes.next_payment_date)
            : null,
          referenciaPago: mpRes.id,

          suscripcionFrecuencia: dto.frequency,
          suscripcionTipoFrecuencia: dto.frequency_type,

          metadatos: patchedMeta,
        },
      });

      for (const item of courseItems) {
        const cursoId = Number(item.cursoId);

        const existing = await tx.inscripcion.findUnique({
          where: { usuarioId_cursoId: { usuarioId: userId, cursoId } },
          select: { id: true, progreso: true },
        });

        const prevProg = safeJsonObject(existing?.progreso);

        const nextProg = mergeSubscriptionMeta(
          prevProg,
          {
            orderId: order.id as any,
            subscriptionId: mpRes.id as any,
            isActive: false as any,
            endDate: blockEndDate.toISOString() as any,
            frequency: dto.frequency as any,
            frequencyType: dto.frequency_type as any,
            status: (mpRes.status ?? 'processing') as any,
            createdAt: now.toISOString() as any,
            nextPaymentDate: (mpRes.next_payment_date ?? null) as any,
          } as Prisma.InputJsonObject,
        );

        await tx.inscripcion.upsert({
          where: { usuarioId_cursoId: { usuarioId: userId, cursoId } },
          update: {
            estado: EstadoInscripcion.PAUSADA,
            progreso: nextProg,
            subscriptionOrderId: order.id,
            subscriptionId: mpRes.id,
            subscriptionActive: false,
            subscriptionEndDate: blockEndDate,
          },
          create: {
            usuarioId: userId,
            cursoId,
            estado: EstadoInscripcion.PAUSADA,
            progreso: nextProg,
            subscriptionOrderId: order.id,
            subscriptionId: mpRes.id,
            subscriptionActive: false,
            subscriptionEndDate: blockEndDate,
          },
        });
      }

      return mpRes;
    });
  }

  async getPaymentStatusByMpId(userId: number, paymentId: string) {
    const cleanPaymentId = String(paymentId ?? '').trim();
    if (!cleanPaymentId) {
      throw new BadRequestException('paymentId inválido');
    }

    const payment = await this.prisma.pago.findFirst({
      where: { mpId: cleanPaymentId, usuarioId: userId },
      select: {
        mpId: true,
        status: true,
        statusDetail: true,
        kind: true,
        ordenId: true,
        orden: {
          select: {
            id: true,
            estado: true,
            referenciaPago: true,
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    if (!payment) {
      return {
        paymentId: cleanPaymentId,
        status: null,
        statusDetail: null,
        orderId: null,
        orderStatus: null,
        reference: null,
        kind: null,
      };
    }

    return {
      paymentId: payment.mpId,
      status: payment.status,
      statusDetail: payment.statusDetail,
      orderId: payment.ordenId,
      orderStatus: payment.orden?.estado ?? null,
      reference: payment.orden?.referenciaPago ?? null,
      kind: payment.kind,
    };
  }

  async cancelSubscription(userId: number, orderId: number) {
    return this.subscriptionService.cancelOrderSubscription(userId, orderId);
  }
}