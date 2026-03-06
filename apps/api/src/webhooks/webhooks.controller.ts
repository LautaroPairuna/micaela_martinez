import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MpPaymentService } from '../mercadopago/mp-payment.service';
import { MpSubscriptionService } from '../mercadopago/mp-subscription.service';
import { verifyMpWebhookSignature } from './mp-signature';
import { normalizeDataId, normalizeEventType } from './mp-normalize';
import { Prisma, EstadoInscripcion } from '@prisma/client';
import * as crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mpPayment: MpPaymentService,
    private readonly mpSub: MpSubscriptionService,
  ) {}

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async mercadopago(
    @Body() webhookData: any,
    @Query('type') queryType?: string,
    @Query('data.id') queryDataId?: string,
    @Query('id') queryId?: string,
    @Query('topic') queryTopic?: string,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const rawType = String(
      queryType ||
        webhookData?.type ||
        webhookData?.action ||
        queryTopic ||
        webhookData?.topic ||
        '',
    ).trim();

    const eventType = normalizeEventType(rawType);

    const rawId =
      queryDataId || queryId || webhookData?.data?.id || webhookData?.id;
    const dataId = normalizeDataId(rawId);

    if (!dataId || eventType === 'unknown') {
      this.logger.warn(`Webhook ignorado: tipo=${rawType} id=${rawId}`);
      return { ok: true };
    }

    const dataIdUrl = String(webhookData?.data?.id_url || dataId);

    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET') || '';
    const allowBypass =
      String(this.config.get('MP_WEBHOOK_ALLOW_UNVERIFIED_TEST') || 'false') ===
      'true';

    let signatureOk = false;

    if (secret) {
      try {
        this.validateSignatureOrThrow({
          secret,
          xSignature: xSignature || '',
          xRequestId: xRequestId || '',
          dataIdForSignature: dataIdUrl,
        });
        signatureOk = true;
      } catch {
        signatureOk = false;
      }

      if (!signatureOk) {
        const result = verifyMpWebhookSignature({
          secret,
          xSignature,
          xRequestId,
          dataIdUrl,
        });
        signatureOk = result.ok;
      }

      if (!signatureOk && !allowBypass) {
        this.logger.warn(`Invalid signature for event ${eventType}:${dataId}`);
        return { ok: true };
      }
    }

    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_eventType_dataId: {
          provider: 'MERCADOPAGO',
          eventType,
          dataId,
        },
      },
    });
    if (existing?.processedAt) return { ok: true };

    await this.prisma.webhookEvent.upsert({
      where: {
        provider_eventType_dataId: {
          provider: 'MERCADOPAGO',
          eventType,
          dataId,
        },
      },
      update: {
        requestId: xRequestId ?? null,
        signature: xSignature ?? null,
        status: 'RECEIVED',
        payload: sanitizeWebhook(webhookData),
        receivedAt: new Date(),
      },
      create: {
        provider: 'MERCADOPAGO',
        eventType,
        dataId,
        requestId: xRequestId ?? null,
        signature: xSignature ?? null,
        ts: null,
        status: 'RECEIVED',
        payload: sanitizeWebhook(webhookData),
      },
    });

    try {
      await this.processEvent(eventType, dataId, webhookData);

      await this.prisma.webhookEvent.update({
        where: {
          provider_eventType_dataId: {
            provider: 'MERCADOPAGO',
            eventType,
            dataId,
          },
        },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });
    } catch (e) {
      this.logger.error(`Error processing event ${eventType}:${dataId}`, e as any);
    }

    return { ok: true };
  }

  private validateSignatureOrThrow(args: {
    secret: string;
    xSignature: string;
    xRequestId: string;
    dataIdForSignature: string;
  }) {
    const { secret, xSignature, xRequestId, dataIdForSignature } = args;

    const parts = String(xSignature || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const tsPart = parts.find((p) => p.startsWith('ts='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tsPart || !v1Part) {
      throw new HttpException('Firma inválida', HttpStatus.UNAUTHORIZED);
    }

    const ts = tsPart.split('=').slice(1).join('=');
    const v1 = v1Part.split('=').slice(1).join('=');

    if (!ts || !v1) {
      throw new HttpException('Firma inválida', HttpStatus.UNAUTHORIZED);
    }

    const windowSec = Number(
      this.config.get('MP_WEBHOOK_REPLAY_WINDOW_SEC') ?? 300,
    );
    const tsNum = Number(ts);
    if (Number.isFinite(tsNum) && Number.isFinite(windowSec)) {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.abs(now - tsNum);
      if (diff > windowSec) {
        throw new HttpException('Firma expirada', HttpStatus.UNAUTHORIZED);
      }
    }

    const manifest = `id:${String(dataIdForSignature)};request-id:${String(
      xRequestId || '',
    )};ts:${String(ts)};`;

    const computed = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    if (!timingSafeEqualHex(computed, v1)) {
      throw new HttpException('Firma inválida', HttpStatus.UNAUTHORIZED);
    }
  }

  private async processEvent(
    eventType: string,
    dataId: string,
    webhookData: any,
  ) {
    switch (eventType) {
      case 'payment': {
        const payment = await this.mpPayment.getPayment(dataId);
        const orderId = Number(payment?.external_reference || 0);
        if (!orderId) return;

        const userId =
          Number(payment?.metadata?.user_id || 0) ||
          (await this.userIdFromOrder(orderId));

        const montoNumber = Number(payment?.transaction_amount || 0);

        await this.prisma.pago.upsert({
          where: {
            provider_kind_mpId: {
              provider: 'MERCADOPAGO',
              kind: 'ONE_OFF',
              mpId: String(payment.id),
            },
          },
          update: {
            status: normalizeStatus(payment.status || ''),
            statusDetail: payment.status_detail ?? null,
            metadatos: sanitizeMeta({
              payment_id: payment.id,
              status: payment.status,
              detail: payment.status_detail,
            }),
          },
          create: {
            provider: 'MERCADOPAGO',
            kind: 'ONE_OFF',
            mpId: String(payment.id),
            status: normalizeStatus(payment.status || ''),
            statusDetail: payment.status_detail ?? null,
            ordenId: orderId,
            usuarioId: userId,
            monto: dec(montoNumber),
            moneda: payment.currency_id || 'ARS',
            metadatos: sanitizeMeta({
              payment_id: payment.id,
              status: payment.status,
              detail: payment.status_detail,
            }),
          },
        });

        if (String(payment.status).toLowerCase() === 'approved') {
          await this.prisma.orden.update({
            where: { id: orderId },
            data: { estado: 'PAGADO', referenciaPago: String(payment.id) },
          });
        }
        return;
      }

      case 'subscription_preapproval': {
        const pre = await this.mpSub.getPreapproval(dataId);
        const orderId = Number(pre?.external_reference || 0);
        if (!orderId) return;

        const total = await this.totalFromOrderNumber(orderId);

        await this.prisma.pago.upsert({
          where: {
            provider_kind_mpId: {
              provider: 'MERCADOPAGO',
              kind: 'SUBSCRIPTION_PREAPPROVAL',
              mpId: String(pre.id),
            },
          },
          update: {
            status: normalizeStatus(pre.status),
            metadatos: sanitizeMeta({
              preapproval_id: pre.id,
              status: pre.status,
              next: pre.next_payment_date,
            }),
          },
          create: {
            provider: 'MERCADOPAGO',
            kind: 'SUBSCRIPTION_PREAPPROVAL',
            mpId: String(pre.id),
            status: normalizeStatus(pre.status),
            ordenId: orderId,
            usuarioId: await this.userIdFromOrder(orderId),
            monto: dec(total),
            moneda: 'ARS',
            metadatos: sanitizeMeta({
              preapproval_id: pre.id,
              status: pre.status,
              next: pre.next_payment_date,
            }),
          },
        });

        const ord = await this.prisma.orden.findUnique({
          where: { id: orderId },
          select: { metadatos: true },
        });

        const metaPatched = mergeSubscriptionMeta(ord?.metadatos, {
          status: String(pre.status || 'processing'),
          subscriptionId: String(pre.id),
          nextPaymentDate: pre.next_payment_date ?? null,
        });

        await this.prisma.orden.update({
          where: { id: orderId },
          data: {
            suscripcionId: String(pre.id),
            suscripcionActiva:
              String(pre.status).toLowerCase() === 'authorized' ? true : null,
            suscripcionProximoPago: pre.next_payment_date
              ? new Date(pre.next_payment_date)
              : null,
            referenciaPago: String(pre.id),
            metadatos: metaPatched,
          },
        });

        return;
      }

      case 'subscription_authorized_payment':
      case 'subscription_payment': {
        let ap: any = null;
        try {
          ap = await this.mpSub.getAuthorizedPayment(dataId);
        } catch {
          ap = null;
        }

        const mpId = String(ap?.id || dataId);

        let pre: any = null;
        const preapprovalId =
          ap?.preapproval_id ||
          ap?.preapproval?.id ||
          webhookData?.data?.preapproval_id ||
          webhookData?.preapproval_id ||
          null;

        if (preapprovalId) {
          try {
            pre = await this.mpSub.getPreapproval(String(preapprovalId));
          } catch {
            pre = null;
          }
        }

        const orderId =
          Number(pre?.external_reference || 0) ||
          Number(ap?.external_reference || ap?.metadata?.order_id || 0) ||
          Number(webhookData?.data?.external_reference || 0);

        if (!orderId) return;

        const total = await this.totalFromOrderNumber(orderId);

        await this.prisma.pago.upsert({
          where: {
            provider_kind_mpId: {
              provider: 'MERCADOPAGO',
              kind: 'SUBSCRIPTION_PAYMENT',
              mpId,
            },
          },
          update: {
            status: normalizeStatus(ap?.status || webhookData?.status || ''),
            statusDetail: ap?.status_detail ?? null,
            metadatos: sanitizeMeta({
              authorized_payment_id: mpId,
              status: ap?.status ?? webhookData?.status,
              detail: ap?.status_detail,
              preapproval_id: pre?.id ?? preapprovalId ?? null,
            }),
          },
          create: {
            provider: 'MERCADOPAGO',
            kind: 'SUBSCRIPTION_PAYMENT',
            mpId,
            status: normalizeStatus(ap?.status || webhookData?.status || ''),
            statusDetail: ap?.status_detail ?? null,
            ordenId: orderId,
            usuarioId: await this.userIdFromOrder(orderId),
            monto: dec(Number(ap?.transaction_amount ?? total)),
            moneda: ap?.currency_id ?? 'ARS',
            metadatos: sanitizeMeta({
              authorized_payment_id: mpId,
              status: ap?.status ?? webhookData?.status,
              detail: ap?.status_detail,
              preapproval_id: pre?.id ?? preapprovalId ?? null,
            }),
          },
        });

        const ok =
          String(ap?.status || '').toLowerCase() === 'approved' ||
          String(ap?.status || '').toLowerCase() === 'authorized';

        if (!ok) return;

        const nextPaymentDateStr =
          ap?.next_payment_date || pre?.next_payment_date || null;

        const nextPaymentDate = nextPaymentDateStr
          ? new Date(nextPaymentDateStr)
          : null;

        const ord = await this.prisma.orden.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (!ord) return;

        const endDate =
          nextPaymentDate ??
          ord.suscripcionProximoPago ??
          computeEndDate(
            new Date(),
            ord.suscripcionFrecuencia,
            ord.suscripcionTipoFrecuencia,
          ) ??
          null;

        const ordMetaPatched = mergeSubscriptionMeta(ord.metadatos, {
          status: 'active',
          subscriptionId: ord.suscripcionId ?? (pre?.id ? String(pre.id) : null),
          nextPaymentDate: endDate ? endDate.toISOString() : null,
          lastPaymentId: mpId,
          lastPaymentStatus: String(ap?.status || 'approved'),
          updatedAt: new Date().toISOString(),
        });

        await this.prisma.orden.update({
          where: { id: orderId },
          data: {
            estado: 'PAGADO',
            suscripcionActiva: true,
            suscripcionProximoPago: endDate,
            referenciaPago: mpId,
            suscripcionId:
              ord.suscripcionId ??
              (pre?.id ? String(pre.id) : ord.suscripcionId),
            metadatos: ordMetaPatched,
          },
        });

        const courseItems = ord.items.filter((i) => i.tipo === 'CURSO');
        if (!courseItems.length) return;

        // ✅ FIX: transacción interactiva (permite await adentro)
        await this.prisma.$transaction(async (tx) => {
          for (const it of courseItems) {
            const cursoId = Number(it.cursoId ?? it.refId);
            if (!Number.isFinite(cursoId) || cursoId <= 0) continue;

            const existing = await tx.inscripcion.findUnique({
              where: {
                usuarioId_cursoId: {
                  usuarioId: ord.usuarioId,
                  cursoId,
                },
              },
              select: { id: true, progreso: true },
            });

            const nextProg = mergeSubscriptionMeta(existing?.progreso, {
              orderId: ord.id,
              subscriptionId:
                ord.suscripcionId ?? (pre?.id ? String(pre.id) : null),
              isActive: true,
              endDate: endDate ? endDate.toISOString() : null,
              nextPaymentDate: endDate ? endDate.toISOString() : null,
              status: 'active',
              lastPaymentId: mpId,
              lastPaymentStatus: String(ap?.status || 'approved'),
              updatedAt: new Date().toISOString(),
            });

            await tx.inscripcion.upsert({
              where: {
                usuarioId_cursoId: {
                  usuarioId: ord.usuarioId,
                  cursoId,
                },
              },
              update: {
                estado: EstadoInscripcion.ACTIVADA,
                progreso: nextProg,
                subscriptionOrderId: ord.id,
                subscriptionId:
                  ord.suscripcionId ?? (pre?.id ? String(pre.id) : null),
                subscriptionActive: true,
                subscriptionEndDate: endDate,
              },
              create: {
                usuarioId: ord.usuarioId,
                cursoId,
                estado: EstadoInscripcion.ACTIVADA,
                progreso: nextProg,
                subscriptionOrderId: ord.id,
                subscriptionId:
                  ord.suscripcionId ?? (pre?.id ? String(pre.id) : null),
                subscriptionActive: true,
                subscriptionEndDate: endDate,
              },
            });
          }
        });

        return;
      }

      default:
        return;
    }
  }

  private async userIdFromOrder(orderId: number) {
    const ord = await this.prisma.orden.findUnique({
      where: { id: orderId },
      select: { usuarioId: true },
    });
    return ord?.usuarioId || 0;
  }

  private async totalFromOrderNumber(orderId: number): Promise<number> {
    const ord = await this.prisma.orden.findUnique({
      where: { id: orderId },
      select: { total: true },
    });

    const t = ord?.total as unknown;

    if (t == null) return 0;
    if (typeof t === 'number') return t;
    if (t instanceof Decimal) return Number(t);
    const n = Number(t as any);
    return Number.isFinite(n) ? n : 0;
  }
}

/** ===== Helpers JSON (Prisma) ===== */

function sanitizeWebhook(payload: unknown): Prisma.InputJsonValue {
  if (!payload || typeof payload !== 'object')
    return payload as Prisma.InputJsonValue;
  const clone: Record<string, unknown> = {
    ...(payload as Record<string, unknown>),
  };
  delete (clone as any).token;
  delete (clone as any).card_token_id;
  return clone as Prisma.InputJsonObject;
}

function sanitizeMeta(meta: unknown): Prisma.InputJsonValue {
  if (!meta || typeof meta !== 'object') return meta as Prisma.InputJsonValue;
  const clone: Record<string, unknown> = { ...(meta as Record<string, unknown>) };
  delete (clone as any).token;
  delete (clone as any).card_token_id;
  return clone as Prisma.InputJsonObject;
}

function safeJsonObject(value: unknown): Prisma.InputJsonObject {
  if (!value) return {} as Prisma.InputJsonObject;
  if (typeof value === 'object') return value as Prisma.InputJsonObject;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object')
        return parsed as Prisma.InputJsonObject;
      return {} as Prisma.InputJsonObject;
    } catch {
      return {} as Prisma.InputJsonObject;
    }
  }

  return {} as Prisma.InputJsonObject;
}

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

function normalizeStatus(mpStatus: string) {
  const s = String(mpStatus || '').toLowerCase();
  if (s === 'approved' || s === 'authorized') return 'APPROVED';
  if (s === 'rejected') return 'REJECTED';
  if (s === 'cancelled') return 'CANCELLED';
  if (s === 'refunded') return 'REFUNDED';
  if (!s) return 'UNKNOWN';
  return 'PENDING';
}

function computeEndDate(
  now: Date,
  freq?: number | null,
  freqType?: string | null,
) {
  if (!freq || !freqType) return null;
  const d = new Date(now);

  if (freqType === 'days') d.setDate(d.getDate() + freq);
  else if (freqType === 'weeks') d.setDate(d.getDate() + freq * 7);
  else if (freqType === 'months') d.setMonth(d.getMonth() + freq);
  else if (freqType === 'years') d.setFullYear(d.getFullYear() + freq);

  return d;
}

function dec(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return new Decimal(safe.toFixed(2));
}

function timingSafeEqualHex(a: string, b: string) {
  const aa = Buffer.from(String(a || ''), 'hex');
  const bb = Buffer.from(String(b || ''), 'hex');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}