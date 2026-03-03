// src/orders/services/mp-payment.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  PaymentMethod,
  Preference,
} from 'mercadopago';

export interface MercadoPagoPaymentData {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments?: number;
  transaction_amount: number;
  description: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
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

@Injectable()
export class MpPaymentService {
  private readonly client: MercadoPagoConfig;
  private readonly payment: Payment;
  private readonly paymentRefund: PaymentRefund;
  private readonly paymentMethod: PaymentMethod;
  private readonly preference: Preference;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );

    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    }

    if (
      !accessToken.startsWith('TEST-') &&
      !accessToken.startsWith('APP_USR-')
    ) {
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN tiene un formato inválido. Debe comenzar con TEST- o APP_USR-',
      );
    }

    this.client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 15000 },
    });

    this.payment = new Payment(this.client);
    this.paymentRefund = new PaymentRefund(this.client);
    this.paymentMethod = new PaymentMethod(this.client);
    this.preference = new Preference(this.client);
  }

  async processPayment(
    paymentData: MercadoPagoPaymentData,
    options?: MercadoPagoPaymentOptions,
  ): Promise<MercadoPagoPaymentResponse> {
    try {
      // 1. Sanitizar Email
      const payerEmail = paymentData.payer.email?.trim();
      if (!payerEmail || !payerEmail.includes('@')) {
        throw new HttpException(
          'Email inválido para MercadoPago',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Sanitizar Identificación
      let identification: { type: string; number: string } | undefined;
      if (
        paymentData.payer.identification?.type &&
        paymentData.payer.identification?.number
      ) {
        const idType = paymentData.payer.identification.type
          .trim()
          .toUpperCase();
        const cleanNumber = String(
          paymentData.payer.identification.number,
        ).replace(/\D+/g, '');

        // Solo permitir tipos válidos para Argentina en Sandbox para evitar internal_error
        const allowedTypes = new Set(['DNI', 'CUIT', 'CUIL']);
        if (allowedTypes.has(idType) && cleanNumber.length > 0) {
          identification = { type: idType, number: cleanNumber };
        }
      }

      // Configuración de binary_mode desde variables de entorno
      // Por defecto false para maximizar compatibilidad con 3DS y validaciones de fraude
      const binaryMode =
        this.configService.get<string>('MP_BINARY_MODE') === 'true';

      const paymentRequest = {
        token: paymentData.token,
        issuer_id: paymentData.issuer_id
          ? Number(paymentData.issuer_id)
          : undefined,
        transaction_amount: paymentData.transaction_amount,
        description: paymentData.description,
        payment_method_id: paymentData.payment_method_id,
        payer: {
          email: payerEmail,
          ...(identification ? { identification } : {}),
        },
        external_reference: paymentData.external_reference,
        installments: paymentData.installments ?? 1,
        capture: true,
        binary_mode: binaryMode,
      };

      console.log('=== BACKEND: Enviando pago a MercadoPago (Service) ===', {
        amount: paymentRequest.transaction_amount,
        method: paymentRequest.payment_method_id,
        issuer: paymentRequest.issuer_id,
        installments: paymentRequest.installments,
        ref: paymentRequest.external_reference,
        // Sanitizado: no loguear token ni email completo
      });

      // Idempotency Key: Usar la provista por el frontend o generar una estable basada en la referencia
      const idempotencyKey =
        options?.idempotencyKey || `pay-${paymentData.external_reference}`;

      const response = await this.payment.create({
        body: paymentRequest,
        requestOptions: { idempotencyKey },
      });

      console.log('=== BACKEND: Respuesta de MercadoPago ===', {
        id: response.id,
        status: response.status,
        detail: response.status_detail,
      });

      return response as MercadoPagoPaymentResponse;
    } catch (error: any) {
      console.error('=== MP RAW ERROR (Payment) ===');
      console.error(
        JSON.stringify(
          {
            message: error?.message,
            name: error?.name,
            status: error?.status,
            cause: error?.cause,
            response: error?.response,
            error: error?.error,
          },
          null,
          2,
        ),
      );

      if (error?.cause) {
        const cause = Array.isArray(error.cause) ? error.cause[0] : error.cause;
        const errorMsg =
          cause?.description ||
          cause?.message ||
          error.message ||
          'Error desconocido';

        // Si es un error del servidor de MP (5xx), devolver 502 Bad Gateway
        // para distinguirlo de errores de cliente (400 Bad Request)
        const mpStatus = error.status || 500;
        if (mpStatus >= 500) {
          throw new HttpException(
            {
              message: 'MercadoPago upstream error',
              mpStatus: mpStatus,
              mpRequestId: error.response?.headers?.['x-request-id'],
              detail: errorMsg,
            },
            HttpStatus.BAD_GATEWAY,
          );
        }

        throw new HttpException(
          `Error de MercadoPago: ${errorMsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        'Error de conexión con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    try {
      const response = await this.payment.get({ id: paymentId });
      return response as MercadoPagoPaymentResponse;
    } catch (error: any) {
      if (error?.cause) {
        throw new HttpException(
          `Error al obtener el pago: ${error.cause.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Error de conexión con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const refundData: any = {};
      if (amount) refundData.amount = amount;

      const response = await this.paymentRefund.create({
        payment_id: paymentId,
        body: refundData,
      });
      return response;
    } catch (error: any) {
      if (error?.cause) {
        throw new HttpException(
          `Error al reembolsar: ${error.cause.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Error de conexión con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getPaymentMethods(): Promise<any[]> {
    try {
      const response = await this.paymentMethod.get();
      return response;
    } catch (error: any) {
      if (error?.cause) {
        throw new HttpException(
          `Error al obtener métodos de pago: ${error.cause.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Error de conexión con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async createPreference(preferenceData: any): Promise<any> {
    try {
      console.log(
        'Creating MercadoPago preference with data:',
        JSON.stringify(preferenceData, null, 2),
      );

      if (
        !preferenceData.items ||
        !Array.isArray(preferenceData.items) ||
        preferenceData.items.length === 0
      ) {
        throw new HttpException(
          'Los items son requeridos para crear una preferencia',
          HttpStatus.BAD_REQUEST,
        );
      }

      const requestOptions = {
        idempotencyKey: `pref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const response = await this.preference.create({
        body: preferenceData,
        requestOptions,
      });

      console.log('MercadoPago preference created successfully:', {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
      });

      return response;
    } catch (error: any) {
      console.error('MercadoPago error details:', {
        message: error.message,
        cause: error.cause,
        response: error.response?.data,
        status: error.status,
      });

      if (error?.cause) {
        const cause = Array.isArray(error.cause) ? error.cause[0] : error.cause;
        if (
          cause?.code === 17 ||
          error.message?.includes('invalid access token')
        ) {
          throw new HttpException(
            'Token de acceso de MercadoPago inválido o expirado.',
            HttpStatus.UNAUTHORIZED,
          );
        }
        throw new HttpException(
          `Error de MercadoPago: ${cause?.description || cause?.message || error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new HttpException(
          'Error de conexión con MercadoPago. Intenta nuevamente.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Error inesperado: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
