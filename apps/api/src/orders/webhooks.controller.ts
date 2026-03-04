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
import { OrdersService } from './orders.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

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
    // Normalizamos el tipo a minúsculas para consistencia
    const eventType = String(
      queryType || webhookData?.type || webhookData?.action || webhookData?.topic || '',
    )
      .trim()
      .toLowerCase();

    const rawId =
      queryDataId ||
      queryId ||
      webhookData?.data?.id ||
      webhookData?.id ||
      webhookData?.resource?.id;

    // ✅ IMPORTANTE: data.id como string (puede ser numérico o alfanumérico)
    // ⚠️ NO lowercasing global: preserva el case original para lookups/lógica.
    const dataIdRaw = String(rawId ?? '').trim();

    if (!eventType || !dataIdRaw) {
      return { received: true, ignored: true, reason: 'missing_type_or_id' };
    }

    // ✅ Para firma: MP pide minúsculas cuando el id viene por query params (alfanumérico).
    // Usamos una copia SOLO para el manifiesto de firma.
    const dataIdForSignature = dataIdRaw.toLowerCase();

    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET')?.trim();
    const allowUnverifiedTest =
      String(this.configService.get<string>('MP_WEBHOOK_ALLOW_UNVERIFIED_TEST') ?? 'false').toLowerCase() === 'true';

    const liveMode =
      typeof webhookData?.live_mode === 'boolean' ? webhookData.live_mode : undefined;

    const sigHeaderOk = Boolean(String(xSignature ?? '').trim());
    const reqHeaderOk = Boolean(String(xRequestId ?? '').trim());
    const hasSigHeaders = sigHeaderOk && reqHeaderOk;

    // Simulación: live_mode=false o no trae headers
    const isSimulation = liveMode === false || !hasSigHeaders;

    // Validación de firma (prod) con bypass controlado (tests/simulaciones)
    if (secret) {
      if (isSimulation) {
        if (!allowUnverifiedTest) {
          // ✅ Respondemos 200 para que MP no reintente (pero lo marcamos rechazado)
          this.logger.warn('MP webhook rejected: unverified test not allowed', {
            eventType,
            dataIdRaw,
            liveMode,
            hasSigHeaders,
          });
          return { received: true, rejected: true, reason: 'unverified_test_not_allowed' };
        }
        // bypass controlado
        this.logger.warn('MP webhook bypass signature (simulation/test allowed)', {
          eventType,
          dataIdRaw,
          liveMode,
          hasSigHeaders,
        });
      } else {
        this.validateSignatureOrThrow({
          secret,
          xSignature: xSignature ?? '',
          xRequestId: xRequestId ?? '',
          dataIdForSignature,
        });
      }
    } else {
      // sin secret -> no validamos (no recomendado en prod)
      this.logger.warn('MP webhook signature NOT validated: missing MERCADOPAGO_WEBHOOK_SECRET', {
        eventType,
        dataIdRaw,
      });
    }

    // Dispatch a OrdersService. Importante: pasamos el id RAW (preserva case)
    try {
      return await this.ordersService.processMercadoPagoWebhook(
        eventType,
        dataIdRaw,
        webhookData,
      );
    } catch (err) {
      // ⚠️ Para evitar reintentos infinitos, devolvemos 200 pero registramos fuerte.
      // Si preferís reintentos en errores internos, cambiá por throw HttpException 500.
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error('MP webhook processing error', { eventType, dataIdRaw, msg });
      return { received: true, ok: false, error: msg };
    }
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

    // Más robusto ante valores con '='
    const ts = tsPart.split('=').slice(1).join('=');
    const v1 = v1Part.split('=').slice(1).join('=');

    const replayWindowSec = Number(this.configService.get('MP_WEBHOOK_REPLAY_WINDOW_SEC') || 600);
    const nowSec = Math.floor(Date.now() / 1000);
    const tsNum = Number(ts);

    if (!Number.isFinite(tsNum) || Math.abs(nowSec - tsNum) > replayWindowSec) {
      throw new HttpException('Firma expirada', HttpStatus.UNAUTHORIZED);
    }

    // ✅ Template EXACTO de la doc (con id en minúsculas para firma)
    const manifest = `id:${dataIdForSignature};request-id:${xRequestId};ts:${ts};`;

    const sha = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const a = Buffer.from(sha, 'hex');
    const b = Buffer.from(String(v1 || ''), 'hex');

    if (a.length !== b.length) {
      throw new HttpException('Firma no coincide', HttpStatus.UNAUTHORIZED);
    }

    if (!crypto.timingSafeEqual(a, b)) {
      throw new HttpException('Firma no coincide', HttpStatus.UNAUTHORIZED);
    }
  }
}