import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MpFrequencyType = 'months' | 'days';

export interface MercadoPagoSubscriptionData {
  token: string; // card_token_id
  payment_method_id?: string;
  transaction_amount: number;
  description: string;
  external_reference: string; // orderId string
  frequency: number;
  frequency_type: string; // normalizamos a months|days
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
}

export interface MercadoPagoSubscriptionOptions {
  idempotencyKey?: string;
  requestId?: string;
}

function normalizeBackUrl(raw: string): string {
  let url = raw?.trim() || 'http://localhost:3000';
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

function normalizeFrequencyType(v: string): MpFrequencyType {
  const s = (v ?? '').toLowerCase().trim();
  if (
    s === 'day' ||
    s === 'days' ||
    s.includes('day') ||
    s === 'dia' ||
    s === 'días' ||
    s === 'dias'
  ) {
    return 'days';
  }
  return 'months';
}

function buildAutoRecurringStartDate(
  frequency: number,
  frequencyType: MpFrequencyType,
): string {
  const next = new Date();
  if (frequencyType === 'months') {
    next.setMonth(next.getMonth() + frequency);
  } else {
    next.setDate(next.getDate() + frequency);
  }
  return next.toISOString();
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeMpErrorDetail(data: any, rawText: string): string {
  const candidate =
    data?.message || data?.error || rawText || 'Error desconocido';
  if (typeof candidate === 'string') return candidate;
  if (Array.isArray(candidate)) return candidate.map(String).join(' | ');
  try {
    return JSON.stringify(candidate);
  } catch {
    return String(candidate);
  }
}

@Injectable()
export class MpSubscriptionService {
  private readonly logger = new Logger(MpSubscriptionService.name);

  constructor(private readonly configService: ConfigService) {}

  private get accessToken(): string {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (!accessToken)
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    return accessToken;
  }

  private get currencyId(): string {
    return this.configService.get<string>('MERCADOPAGO_CURRENCY_ID') || 'ARS';
  }

  private get frontendUrl(): string {
    return normalizeBackUrl(
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    );
  }

  // ✅ Unificada: ambos servicios deberían usar la MISMA URL
  private get notificationUrl(): string | null {
    const raw =
      this.configService.get<string>('MERCADOPAGO_WEBHOOK_URL') || // ✅ prioridad
      this.configService.get<string>('MERCADOPAGO_SUBSCRIPTION_WEBHOOK_URL') || // fallback legacy
      null;

    if (!raw) return null;
    return normalizeBackUrl(raw);
  }

  async createSubscription(
    subscriptionData: MercadoPagoSubscriptionData,
    options?: MercadoPagoSubscriptionOptions,
  ): Promise<any> {
    if (!subscriptionData?.token || subscriptionData.token.length < 20) {
      throw new HttpException(
        'Token de tarjeta inválido',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!subscriptionData?.payer?.email) {
      throw new HttpException(
        'Email requerido para suscripción',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      !Number.isFinite(subscriptionData.transaction_amount) ||
      subscriptionData.transaction_amount <= 0
    ) {
      throw new HttpException('Monto inválido', HttpStatus.BAD_REQUEST);
    }
    if (
      !Number.isFinite(subscriptionData.frequency) ||
      subscriptionData.frequency <= 0
    ) {
      throw new HttpException('Frecuencia inválida', HttpStatus.BAD_REQUEST);
    }

    const backUrl = this.frontendUrl;
    const frequencyType = normalizeFrequencyType(
      subscriptionData.frequency_type,
    );
    const startDate = buildAutoRecurringStartDate(
      subscriptionData.frequency,
      frequencyType,
    );

    const preapprovalPayload: Record<string, any> = {
      reason: subscriptionData.description,
      external_reference: subscriptionData.external_reference,
      payer_email: subscriptionData.payer.email,
      card_token_id: subscriptionData.token,
      ...(subscriptionData.payment_method_id
        ? { payment_method_id: subscriptionData.payment_method_id }
        : {}),
      auto_recurring: {
        frequency: subscriptionData.frequency,
        frequency_type: frequencyType,
        transaction_amount: subscriptionData.transaction_amount,
        currency_id: this.currencyId,
        start_date: startDate,
      },
      back_url: backUrl,
      status: 'authorized',
      metadata: {
        orderId: subscriptionData.external_reference,
        kind: 'subscription_preapproval',
      },
    };

    // ✅ Webhook unificado
    const notif = this.notificationUrl;
    if (notif) preapprovalPayload.notification_url = notif;

    const idemKey =
      options?.idempotencyKey ||
      `sub-${String(subscriptionData.external_reference).trim()}`;

    this.logger.log(
      `Creating MP preapproval: ref=${preapprovalPayload.external_reference} amount=${preapprovalPayload.auto_recurring.transaction_amount} freq=${preapprovalPayload.auto_recurring.frequency}/${preapprovalPayload.auto_recurring.frequency_type} start=${preapprovalPayload.auto_recurring.start_date} notif=${notif ? 'yes' : 'no'}`,
    );

    try {
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idemKey,
          ...(options?.requestId ? { 'X-Request-Id': options.requestId } : {}),
        },
        body: JSON.stringify(preapprovalPayload),
      });

      const text = await response.text();
      const data = safeJsonParse(text);

      if (!response.ok) {
        const mpRequestId =
          response.headers.get('x-request-id') ||
          response.headers.get('X-Request-Id') ||
          null;
        const detail = normalizeMpErrorDetail(data, text);
        const detailUpper = detail.toUpperCase();

        this.logger.error(
          `MP preapproval error: status=${response.status} reqId=${mpRequestId} detail=${detail}`,
        );

        if (response.status >= 500) {
          throw new HttpException(
            {
              message: 'MercadoPago upstream error',
              mpStatus: response.status,
              mpRequestId,
              detail,
            },
            HttpStatus.BAD_GATEWAY,
          );
        }

        if (
          response.status === 401 &&
          (detailUpper.includes('CC_VAL_433') ||
            detailUpper.includes('CREDIT CARD VALIDATION HAS FAILED'))
        ) {
          throw new HttpException(
            {
              message: 'La tarjeta fue rechazada por validación',
              code: 'CARD_VALIDATION_FAILED',
              mpStatus: response.status,
              mpRequestId,
              detail,
            },
            HttpStatus.PAYMENT_REQUIRED,
          );
        }

        throw new HttpException(
          {
            message: 'Error al crear suscripción',
            mpStatus: response.status,
            mpRequestId,
            detail,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `MP preapproval created: id=${data?.id} status=${data?.status} ref=${data?.external_reference}`,
      );

      return data;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `createSubscription unexpected error: ${error?.message || error}`,
      );
      throw new HttpException(
        'Error al crear suscripción con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    if (!subscriptionId) {
      throw new HttpException(
        'subscriptionId requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const idemKey = `cancel-sub-${subscriptionId}-${Date.now()}`;

      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${subscriptionId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idemKey,
          },
          body: JSON.stringify({ status: 'cancelled' }),
        },
      );

      const text = await response.text();
      const data = safeJsonParse(text);

      if (!response.ok) {
        this.logger.error(
          `MP cancel error: status=${response.status} detail=${data?.message || data?.error || text}`,
        );
        throw new HttpException(
          {
            message: 'Error al cancelar suscripción',
            mpStatus: response.status,
            detail: data?.message || data?.error || data,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return data;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `cancelSubscription unexpected error: ${error?.message || error}`,
      );
      throw new HttpException(
        'Error al cancelar suscripción con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ✅ Nueva funcionalidad para actualizar monto (Partial Cancellation)
  async updateSubscriptionAmount(
    subscriptionId: string,
    newAmount: number,
  ): Promise<any> {
    if (!subscriptionId) {
      throw new HttpException(
        'subscriptionId requerido',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      throw new HttpException(
        'Monto inválido para actualización',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const idemKey = `update-sub-${subscriptionId}-${Date.now()}`;

      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${subscriptionId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idemKey,
          },
          body: JSON.stringify({
            auto_recurring: {
              transaction_amount: newAmount,
            },
          }),
        },
      );

      const text = await response.text();
      const data = safeJsonParse(text);

      if (!response.ok) {
        this.logger.error(
          `MP update amount error: status=${response.status} detail=${data?.message || data?.error || text}`,
        );
        throw new HttpException(
          {
            message: 'Error al actualizar monto de suscripción',
            mpStatus: response.status,
            detail: data?.message || data?.error || data,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `MP subscription amount updated: id=${subscriptionId} newAmount=${newAmount}`,
      );
      return data;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `updateSubscriptionAmount unexpected error: ${error?.message || error}`,
      );
      throw new HttpException(
        'Error al actualizar suscripción con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getSubscription(preapprovalId: string): Promise<any> {
    if (!preapprovalId) {
      throw new HttpException(
        'preapprovalId requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const text = await response.text();
      const data = safeJsonParse(text);

      if (!response.ok) {
        this.logger.error(
          `MP getSubscription error: status=${response.status} detail=${data?.message || data?.error || text}`,
        );
        throw new HttpException(
          {
            message: 'Error al obtener suscripción',
            mpStatus: response.status,
            detail: data?.message || data?.error || data,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      return data;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `getSubscription unexpected error: ${error?.message || error}`,
      );
      throw new HttpException(
        'Error de conexión con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Compatibilidad
  async createPreapproval(input: any, idemKey?: string) {
    // Adaptador
    return this.createSubscription(
      {
        token: input.card_token_id,
        payment_method_id: input.payment_method_id,
        transaction_amount: input.auto_recurring.transaction_amount,
        description: input.reason,
        external_reference: input.external_reference,
        frequency: input.auto_recurring.frequency,
        frequency_type: input.auto_recurring.frequency_type,
        payer: {
          email: input.payer_email,
        },
      },
      { idempotencyKey: idemKey },
    );
  }

  async getPreapproval(id: string) {
    return this.getSubscription(id);
  }

  async getAuthorizedPayment(id: string) {
    // Implementación simplificada
    try {
      const response = await fetch(
        `https://api.mercadopago.com/authorized_payments/${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return await response.json();
    } catch {
      return null;
    }
  }
}
