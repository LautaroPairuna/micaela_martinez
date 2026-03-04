// apps/api/src/orders/services/mp-payment.service.ts

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment, PaymentRefund, PaymentMethod, Preference } from 'mercadopago';

export interface MercadoPagoPaymentData {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments?: number;
  transaction_amount: number;
  description: string;
  payer: {
    email: string;
    identification?: { type: string; number: string };
  };
  external_reference?: string; // orderId string
  statement_descriptor?: string; // max 22 chars
  additional_info?: {
    items?: Array<{
      id: string;
      title: string;
      description?: string;
      picture_url?: string;
      category_id?: string;
      quantity: number;
      unit_price: number;
    }>;
    ip_address?: string;
  };

  // ✅ NUEVO
  notification_url?: string;
}

export interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  description: string;
  external_reference: string;
  date_created: string;
  date_approved?: string;
  payment_method_id: string;
  payment_type_id: string;
  subscription_id?: string;
}

export interface MercadoPagoPaymentOptions {
  idempotencyKey?: string;
  requestId?: string;
}

function safeEmail(email?: string) {
  const e = (email ?? '').trim();
  if (!e.includes('@')) return null;
  return e;
}

function sanitizeIdNumber(v: string) {
  return String(v ?? '').replace(/\D+/g, '');
}

function normalizeUrl(raw?: string | null): string | null {
  const url = (raw ?? '').trim();
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url.replace(/\/+$/, '');
  return `https://${url}`.replace(/\/+$/, '');
}

@Injectable()
export class MpPaymentService {
  private readonly logger = new Logger(MpPaymentService.name);

  private readonly client: MercadoPagoConfig;
  private readonly payment: Payment;
  private readonly paymentRefund: PaymentRefund;
  private readonly paymentMethod: PaymentMethod;
  private readonly preference: Preference;

  constructor(private readonly configService: ConfigService) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');

    if (!accessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');

    if (!accessToken.startsWith('TEST-') && !accessToken.startsWith('APP_USR-')) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN inválido. Debe comenzar con TEST- o APP_USR-');
    }

    this.client = new MercadoPagoConfig({ accessToken, options: { timeout: 15000 } });
    this.payment = new Payment(this.client);
    this.paymentRefund = new PaymentRefund(this.client);
    this.paymentMethod = new PaymentMethod(this.client);
    this.preference = new Preference(this.client);
  }

  // ✅ Unificada: misma url para pagos y suscripciones
  private get notificationUrl(): string | null {
    return (
      normalizeUrl(this.configService.get<string>('MERCADOPAGO_WEBHOOK_URL')) || // ✅ prioridad
      normalizeUrl(this.configService.get<string>('MERCADOPAGO_SUBSCRIPTION_WEBHOOK_URL')) || // fallback legacy
      null
    );
  }

  async processPayment(
    paymentData: MercadoPagoPaymentData,
    options?: MercadoPagoPaymentOptions,
  ): Promise<MercadoPagoPaymentResponse> {
    try {
      // 1) Email
      const payerEmail = safeEmail(paymentData.payer.email);
      if (!payerEmail) {
        throw new HttpException('Email inválido para MercadoPago', HttpStatus.BAD_REQUEST);
      }

      // 2) Identification
      let identification: { type: string; number: string } | undefined;
      if (paymentData.payer.identification?.type && paymentData.payer.identification?.number) {
        const idType = paymentData.payer.identification.type.trim().toUpperCase();
        const cleanNumber = sanitizeIdNumber(paymentData.payer.identification.number);

        const allowedTypes = new Set(['DNI', 'CUIT', 'CUIL']);
        if (allowedTypes.has(idType) && cleanNumber.length > 0) {
          identification = { type: idType, number: cleanNumber };
        }
      }

      // 3) binary_mode
      const binaryMode = this.configService.get<string>('MP_BINARY_MODE') === 'true';

      // 4) external_reference
      const externalRef = paymentData.external_reference?.trim();
      if (!externalRef) {
        this.logger.warn('processPayment without external_reference (orderId). Consider enforcing it.');
      }

      // ✅ notification_url (si no viene, usamos env)
      const notif = paymentData.notification_url
        ? normalizeUrl(paymentData.notification_url)
        : this.notificationUrl;

      // ✅ body (cast a any para no pelear con typings del SDK)
      const paymentRequest: any = {
        token: paymentData.token,
        issuer_id: paymentData.issuer_id ? Number(paymentData.issuer_id) : undefined, // ✅ number
        transaction_amount: paymentData.transaction_amount,
        description: paymentData.description,
        payment_method_id: paymentData.payment_method_id,
        payer: {
          email: payerEmail,
          ...(identification ? { identification } : {}),
        },
        external_reference: externalRef,
        installments: paymentData.installments ?? 1,
        capture: true,
        binary_mode: binaryMode,
        statement_descriptor: paymentData.statement_descriptor,
        additional_info: paymentData.additional_info,
        ...(notif ? { notification_url: notif } : {}),
      };

      const idempotencyKey =
        options?.idempotencyKey || `pay-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      this.logger.log(
        `MP payment.create -> amount=${paymentRequest.transaction_amount} method=${paymentRequest.payment_method_id} issuer=${paymentRequest.issuer_id} inst=${paymentRequest.installments} ref=${externalRef ?? 'none'} idem=${idempotencyKey} notif=${notif ? 'yes' : 'no'}`,
      );

      const response = await this.payment.create({
        body: paymentRequest,
        requestOptions: {
          idempotencyKey,
          ...(options?.requestId ? { headers: { 'X-Request-Id': options.requestId } } : {}),
        } as any,
      });

      this.logger.log(
        `MP payment result -> id=${response.id} status=${response.status} detail=${response.status_detail}`,
      );

      return response as MercadoPagoPaymentResponse;
    } catch (error: any) {
      const mpStatus = error?.status ?? error?.response?.status ?? 500;
      const mpRequestId =
        error?.response?.headers?.['x-request-id'] ||
        error?.response?.headers?.['X-Request-Id'] ||
        undefined;

      const detail =
        error?.cause?.[0]?.description ||
        error?.cause?.[0]?.message ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Error desconocido';

      this.logger.error(
        `MP payment error -> status=${mpStatus} reqId=${mpRequestId ?? 'n/a'} detail=${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
      );

      if (mpStatus >= 500) {
        throw new HttpException(
          {
            message: 'MercadoPago upstream error',
            mpStatus,
            mpRequestId,
            detail,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(`Error de MercadoPago: ${detail}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    try {
      const response = await this.payment.get({ id: paymentId });
      return response as MercadoPagoPaymentResponse;
    } catch (error: any) {
      const msg =
        error?.cause?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error desconocido';
      throw new HttpException(`Error al obtener el pago: ${msg}`, HttpStatus.BAD_REQUEST);
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const body: any = {};
      if (amount) body.amount = amount;

      return await this.paymentRefund.create({
        payment_id: paymentId,
        body,
      });
    } catch (error: any) {
      const msg =
        error?.cause?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error desconocido';
      throw new HttpException(`Error al reembolsar: ${msg}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getPaymentMethods(): Promise<any[]> {
    try {
      return await this.paymentMethod.get();
    } catch (error: any) {
      const msg =
        error?.cause?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Error desconocido';
      throw new HttpException(`Error al obtener métodos: ${msg}`, HttpStatus.BAD_REQUEST);
    }
  }

  async createPreference(preferenceData: any): Promise<any> {
    try {
      if (!preferenceData.items || !Array.isArray(preferenceData.items) || preferenceData.items.length === 0) {
        throw new HttpException('Los items son requeridos para crear una preferencia', HttpStatus.BAD_REQUEST);
      }

      // ✅ también podés setear notification_url acá (Checkout Pro)
      const notif = this.notificationUrl;
      const body = notif ? { ...preferenceData, notification_url: notif } : preferenceData;

      const requestOptions = {
        idempotencyKey: `pref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      const response = await this.preference.create({
        body,
        requestOptions,
      });

      return response;
    } catch (error: any) {
      const mpStatus = error?.status ?? 500;
      const msg =
        error?.cause?.[0]?.description ||
        error?.response?.data?.message ||
        error?.message ||
        'Error desconocido';

      if (mpStatus >= 500) {
        throw new HttpException(
          { message: 'MercadoPago upstream error', mpStatus, detail: msg },
          HttpStatus.BAD_GATEWAY,
        );
      }

      throw new HttpException(`Error de MercadoPago: ${msg}`, HttpStatus.BAD_REQUEST);
    }
  }
}