// apps/api/src/orders/webhooks.controller.ts
import {
  Controller,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  HttpException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPagoWebhook(
    @Body() webhookData: any,
    @Query('type') queryType: string,
    @Query('data.id') queryDataId: string,
    @Query('id') queryId: string,
    @Headers('x-signature') xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ) {
    const eventType =
      queryType ||
      webhookData?.type ||
      webhookData?.action ||
      webhookData?.topic;

    const rawId =
      queryDataId ||
      queryId ||
      webhookData?.data?.id ||
      webhookData?.id ||
      webhookData?.resource?.id;

    const dataId = Number(rawId);

    if (!eventType || !Number.isFinite(dataId)) {
      console.warn('[Webhook MP] Ignorado: faltan type/id', { eventType, rawId });
      return { status: 'ignored', reason: 'missing_type_or_id' };
    }

    // ✅ 1) Bypass controlado para simulación del panel (live_mode:false)
    const isTestEvent = webhookData?.live_mode === false;

    // ✅ 2) Firma: obligatoria SOLO en eventos reales (live_mode:true)
    // Si estás en modo test, MP puede no enviar headers de firma válidos.
    if (!isTestEvent) {
      this.validateSignatureOrThrow(xSignature, xRequestId, dataId);
    } else {
      // Log breve para saber que fue bypass por prueba
      console.warn('[Webhook MP] Firma omitida por evento de prueba (live_mode:false)', {
        eventType,
        dataId,
      });
    }

    try {
      // ✅ Procesar (idempotente del lado OrdersService)
      return await this.ordersService.processMercadoPagoWebhook(
        String(eventType),
        dataId,
        webhookData,
      );
    } catch (error) {
      // ✅ Para MP conviene responder 200 para evitar reintentos infinitos
      console.error('[Webhook MP] Error procesando:', (error as Error).message);
      return { status: 'error', message: (error as Error).message };
    }
  }

  private validateSignatureOrThrow(
    xSignature: string,
    xRequestId: string,
    dataId: number,
  ) {
    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');

    // Si no hay secret, no validamos (pero logueamos).
    // En producción real, lo ideal es SIEMPRE tenerlo configurado.
    if (!secret) {
      console.warn(
        '[Webhook MP] MERCADOPAGO_WEBHOOK_SECRET no configurado. Firma no validada.',
      );
      return;
    }

    if (!xSignature || !xRequestId) {
      throw new HttpException('Firma ausente', HttpStatus.UNAUTHORIZED);
    }

    // x-signature: ts=123,v1=abc
    const parts = xSignature.split(',').map((p) => p.trim());
    const tsPart = parts.find((p) => p.startsWith('ts='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tsPart || !v1Part) {
      throw new HttpException('Firma inválida', HttpStatus.UNAUTHORIZED);
    }

    const ts = tsPart.split('=')[1];
    const v1 = v1Part.split('=')[1];

    // Anti-replay: ventana configurable (default 10 min)
    const replayWindowSec = Number(
      this.configService.get<string>('MP_WEBHOOK_REPLAY_WINDOW_SEC') || 600,
    );
    const nowSec = Math.floor(Date.now() / 1000);
    const tsNum = Number(ts);

    if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > replayWindowSec) {
      throw new HttpException('Firma expirada', HttpStatus.UNAUTHORIZED);
    }

    // Manifest: mantenelo estable
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const sha = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    // timing-safe compare
    const a = Buffer.from(sha, 'hex');
    const b = Buffer.from(v1, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new HttpException('Firma no coincide', HttpStatus.UNAUTHORIZED);
    }
  }
}