import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderSource } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { SubscribeOrderDto } from './dto/subscribe-order.dto';
import { MpPaymentService } from '../mercadopago/mp-payment.service';
import { MpSubscriptionService } from '../mercadopago/mp-subscription.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

function dec(n: number) {
  // Prisma Decimal safe
  return new Decimal(n.toFixed(2));
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mpPayment: MpPaymentService,
    private readonly mpSub: MpSubscriptionService,
  ) {}

  async createFromCart(userId: number, dto: CreateOrderDto) {
    if (dto.source && dto.source !== OrderSource.CART) {
       // Lógica futura para órdenes directas (sin carrito)
       // Por ahora, solo soportamos carrito
       throw new BadRequestException('Solo se soportan órdenes desde el carrito por el momento');
    }

    const cart = await this.prisma.carrito.findUnique({
      where: { usuarioId: userId },
      include: { items: true },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Carrito vacío');

    // Resolver items reales y validar “no mixto”
    const hasCourse = cart.items.some((i) => i.tipo === 'CURSO');
    const hasProduct = cart.items.some((i) => i.tipo === 'PRODUCTO');
    if (hasCourse && hasProduct) {
      throw new BadRequestException('No se permiten órdenes mixtas (Cursos + Productos)');
    }

    const orderType = hasCourse ? 'SUBSCRIPTION' : 'ONE_OFF'; // si cursos son por suscripción; si no, ajustamos
    const esSuscripcion = hasCourse;

    // Cargar precios desde DB (fuente de verdad)
    // Usamos filter(Boolean) para asegurar que map no retorne null
    const cursoIds = cart.items
      .filter(i => i.cursoId)
      .map(i => i.cursoId as number);
      
    const productoIds = cart.items
      .filter(i => i.productoId)
      .map(i => i.productoId as number);

    const [cursos, productos] = await Promise.all([
      cursoIds.length > 0 ? this.prisma.curso.findMany({ where: { id: { in: cursoIds }, publicado: true } }) : Promise.resolve([]),
      productoIds.length > 0 ? this.prisma.producto.findMany({ where: { id: { in: productoIds }, publicado: true } }) : Promise.resolve([]),
    ]);

    const cursoMap = new Map(cursos.map(c => [c.id, c]));
    const prodMap = new Map(productos.map(p => [p.id, p]));

    const itemsOrden: any[] = [];
    
    for (const it of cart.items) {
      if (it.tipo === 'CURSO') {
        const c = it.cursoId ? cursoMap.get(it.cursoId) : null;
        if (!c) throw new BadRequestException(`Curso ${it.cursoId} inválido o no publicado`);
        const price = Number(c.precio) - Number(c.descuento || 0);
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
        if (!p) throw new BadRequestException(`Producto ${it.productoId} inválido o no publicado`);
        if (p.stock < it.cantidad) throw new BadRequestException(`Stock insuficiente para ${p.titulo}`);
        const price = Number(p.precio) - Number(p.descuento || 0);
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

    const totalNumber = itemsOrden.reduce((acc, i) => acc + Number(i.precioUnitario) * i.cantidad, 0);

    return this.prisma.$transaction(async (tx) => {
      const orden = await tx.orden.create({
        data: {
          usuarioId: userId,
          estado: 'PENDIENTE',
          total: dec(totalNumber),
          moneda: 'ARS',
          tipo: orderType as any,
          esSuscripcion,
          metadatos: dto.metadatos ?? Prisma.JsonNull,
          direccionEnvioId: dto.direccionEnvioId ? Number(dto.direccionEnvioId) : null,
          direccionFacturacionId: dto.direccionFacturacionId ? Number(dto.direccionFacturacionId) : null,
          items: { create: itemsOrden },
        },
        include: { items: true },
      });

      // Limpiar carrito al crear orden
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
    if (order.estado !== 'PENDIENTE') throw new BadRequestException('La orden no está pendiente');
    if (order.tipo !== 'ONE_OFF') throw new BadRequestException('La orden no es de pago único');

    // idempotencia por intento
    const idemKey = `pay-${orderId}-${dto.attemptId}`;

    // Crear pago en MP
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
      },
      idemKey,
    );

    // Registrar en DB (ledger)
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
        metadatos: sanitizeMeta({ payment_id: mpRes.id, status: mpRes.status, detail: mpRes.status_detail }),
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
        metadatos: sanitizeMeta({ payment_id: mpRes.id, status: mpRes.status, detail: mpRes.status_detail }),
      },
    });

    // Actualizar referenciaPago informativa
    await this.prisma.orden.update({
      where: { id: order.id },
      data: { referenciaPago: String(mpRes.id) },
    });

    return mpRes;
  }

  async subscribe(userId: number, orderId: number, dto: SubscribeOrderDto) {
    const order = await this.getOrderById(userId, orderId);
    if (order.estado !== 'PENDIENTE') throw new BadRequestException('La orden no está pendiente');
    if (order.tipo !== 'SUBSCRIPTION') throw new BadRequestException('La orden no es de suscripción');

    const idemKey = `sub-${orderId}-${dto.attemptId}`;

    const mpRes = await this.mpSub.createPreapproval(
      {
        reason: `Suscripción - Orden #${order.id}`,
        external_reference: String(order.id),
        payer_email: dto.payer_email,
        card_token_id: dto.card_token_id,
        auto_recurring: {
          frequency: dto.frequency,
          frequency_type: dto.frequency_type,
          transaction_amount: Number(order.total),
          currency_id: order.moneda,
        },
      },
      idemKey,
    );

    // Registrar preapproval en ledger
    await this.prisma.pago.upsert({
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
        metadatos: sanitizeMeta({ preapproval_id: mpRes.id, status: mpRes.status, next: mpRes.next_payment_date }),
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
        metadatos: sanitizeMeta({ preapproval_id: mpRes.id, status: mpRes.status, next: mpRes.next_payment_date }),
      },
    });

    // Guardar en Orden: suscripcionId + proximoPago (si viene)
    await this.prisma.orden.update({
      where: { id: order.id },
      data: {
        suscripcionId: mpRes.id,
        suscripcionActiva: mpRes.status === 'authorized' ? true : null,
        suscripcionProximoPago: mpRes.next_payment_date ? new Date(mpRes.next_payment_date) : null,
        referenciaPago: mpRes.id,
      },
    });

    // Crear/actualizar inscripciones “pendientes/activas” según tu lógica
    // Si tus cursos son por suscripción: activar al primer cobro aprobado (webhook).
    // Igual dejamos marcados los campos para no perder la vinculación:
    const courseItems = order.items.filter((i) => i.tipo === 'CURSO');
    if (courseItems.length) {
      await this.prisma.$transaction(
        courseItems.map((it) =>
          this.prisma.inscripcion.upsert({
            where: { usuarioId_cursoId: { usuarioId: userId, cursoId: it.refId } },
            update: {
              subscriptionOrderId: order.id,
              subscriptionId: mpRes.id,
              subscriptionActive: false,
            },
            create: {
              usuarioId: userId,
              cursoId: it.refId,
              estado: 'ACTIVADA',
              progreso: { subscription: { orderId: order.id, subscriptionId: mpRes.id, active: false } },
              subscriptionOrderId: order.id,
              subscriptionId: mpRes.id,
              subscriptionActive: false,
            },
          }),
        ),
      );
    }

    return mpRes;
  }
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

function sanitizeMeta(meta: any) {
  // Nunca guardar token/card_token_id completos. Solo ids/status.
  if (!meta || typeof meta !== 'object') return meta;
  const clone = { ...meta };
  delete (clone as any).token;
  delete (clone as any).card_token_id;
  return clone;
}