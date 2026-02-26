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
    @Query('type') eventType: string,
    @Query('data.id') dataId: number,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    // 1. Validar firma del webhook (Seguridad)
    this.validateSignature(signature, requestId, dataId);

    console.log(
      `[Webhook MP] Recibido evento: ${eventType}, ID: ${dataId}, RequestID: ${requestId}`,
    );

    try {
      return await this.ordersService.processMercadoPagoWebhook(
        eventType || webhookData.type,
        dataId || webhookData.data?.id,
        webhookData,
      );
    } catch (error) {
      console.error('[Webhook MP] Error procesando:', (error as Error).message);
      return { status: 'error', message: (error as Error).message };
    }
  }

  private validateSignature(
    xSignature: string,
    xRequestId: string,
    dataId: number,
  ) {
    const secret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) {
      // Si no hay secret configurado, permitimos pasar pero logueamos advertencia
      console.warn(
        '[Webhook MP] Advertencia: MERCADOPAGO_WEBHOOK_SECRET no configurado. Validación de firma omitida.',
      );
      return;
    }

    if (!xSignature || !xRequestId) {
      throw new HttpException('Firma ausente', HttpStatus.UNAUTHORIZED);
    }

    // Extraer timestamp y v1 de la firma
    // x-signature: ts=123,v1=abc
    const parts = xSignature.split(',');
    const tsPart = parts.find((p) => p.startsWith('ts='));
    const v1Part = parts.find((p) => p.startsWith('v1='));

    if (!tsPart || !v1Part) {
      throw new HttpException('Firma inválida', HttpStatus.UNAUTHORIZED);
    }

    const ts = tsPart.split('=')[1];
    const v1 = v1Part.split('=')[1];

    // Construir el template para validar
    // manifest: id:dataId;request-id:xRequestId;ts:ts;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Generar HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const sha = hmac.digest('hex');

    if (sha !== v1) {
      console.error('[Webhook MP] Error de validación de firma');
      throw new HttpException('Firma no coincide', HttpStatus.UNAUTHORIZED);
    }
  }
}
