import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
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
    @Query('type') queryType?: string,
    @Query('data.id') queryDataId?: string,
    @Query('id') queryId?: string,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    const eventType =
      String(queryType || webhookData?.type || webhookData?.action || webhookData?.topic || '').trim();

    const rawId =
      queryDataId ||
      queryId ||
      webhookData?.data?.id ||
      webhookData?.id ||
      webhookData?.resource?.id;

    // ✅ IMPORTANTE: data.id como string (puede ser numérico o alfanumérico)
    let dataIdRaw = String(rawId ?? '').trim();
    if (!eventType || !dataIdRaw) {
      return { received: true, ignored: true, reason: 'missing_type_or_id' };
    }

    // ✅ Si es alfanumérico (suscripciones), MP pide minúsculas para la firma
    // (no pasa nada si era numérico: "123" queda igual)
    dataIdRaw = dataIdRaw.toLowerCase();

    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET')?.trim();
    const allowUnverifiedTest =
      this.configService.get<string>('MP_WEBHOOK_ALLOW_UNVERIFIED_TEST') === 'true';

    const liveMode =
      typeof webhookData?.live_mode === 'boolean' ? webhookData.live_mode : undefined;

    const hasSigHeaders = Boolean(String(xSignature ?? '').trim() && String(xRequestId ?? '').trim());

    // Simulación: live_mode=false o no trae headers
    const isSimulation = liveMode === false || !hasSigHeaders;

    if (secret) {
      if (isSimulation) {
        if (!allowUnverifiedTest) {
          // respondemos 200 para que no reintente, pero lo marcamos rechazado
          return { received: true, rejected: true, reason: 'unverified_test_not_allowed' };
        }
        // bypass controlado
      } else {
        this.validateSignatureOrThrow({
          secret,
          xSignature: xSignature ?? '',
          xRequestId: xRequestId ?? '',
          dataIdRaw,
        });
      }
    } else {
      // sin secret -> no validamos (no recomendado en prod)
    }

    // ✅ Dispatch según evento:
    // - payment => id numérico
    // - subscription_preapproval => id alfanumérico
    try {
      return await this.ordersService.processMercadoPagoWebhook(
        eventType,
        dataIdRaw,
        webhookData,
      );
    } catch (err) {
      // recomendado: 200 OK para evitar reintentos infinitos de MP
      return { received: true, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private validateSignatureOrThrow(args: {
    secret: string;
    xSignature: string;
    xRequestId: string;
    dataIdRaw: string;
  }) {
    const { secret, xSignature, xRequestId, dataIdRaw } = args;

    const parts = xSignature.split(',').map((p) => p.trim());
    const tsPart = parts.find((p) => p.startsWith('ts='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tsPart || !v1Part) {
      throw new HttpException('Firma inválida', HttpStatus.UNAUTHORIZED);
    }

    const ts = tsPart.split('=')[1];
    const v1 = v1Part.split('=')[1];

    const replayWindowSec = Number(this.configService.get('MP_WEBHOOK_REPLAY_WINDOW_SEC') || 600);
    const nowSec = Math.floor(Date.now() / 1000);
    const tsNum = Number(ts);

    if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > replayWindowSec) {
      throw new HttpException('Firma expirada', HttpStatus.UNAUTHORIZED);
    }

    // ✅ Template EXACTO de la doc:
    const manifest = `id:${dataIdRaw};request-id:${xRequestId};ts:${ts};`;

    const sha = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const a = Buffer.from(sha, 'hex');
    const b = Buffer.from(v1, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new HttpException('Firma no coincide', HttpStatus.UNAUTHORIZED);
    }
  }
}