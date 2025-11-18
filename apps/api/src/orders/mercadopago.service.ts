// src/orders/mercadopago.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  PaymentMethod,
  Preference,
} from 'mercadopago';

interface MercadoPagoPaymentData {
  token: string;
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
}

interface MercadoPagoSubscriptionData extends MercadoPagoPaymentData {
  frequency: number;
  frequency_type: string;
}

interface MercadoPagoPaymentResponse {
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
}

@Injectable()
export class MercadoPagoService {
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

    // Validar formato del token
    if (
      !accessToken.startsWith('TEST-') &&
      !accessToken.startsWith('APP_USR-')
    ) {
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN tiene un formato inválido. Debe comenzar con TEST- o APP_USR-',
      );
    }

    // Configurar el cliente de MercadoPago con mejores prácticas
    this.client = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 15000, // Aumentar timeout
      },
    });

    // Inicializar los servicios
    this.payment = new Payment(this.client);
    this.paymentRefund = new PaymentRefund(this.client);
    this.paymentMethod = new PaymentMethod(this.client);
    this.preference = new Preference(this.client);
  }

  async createSubscription(
    subscriptionData: MercadoPagoSubscriptionData,
  ): Promise<any> {
    try {
      // Suscripción SIN plan asociado, con pago autorizado
      // Docs: POST /preapproval con card_token_id y status="authorized"
      const preapprovalPayload = {
        reason: subscriptionData.description,
        external_reference: subscriptionData.external_reference,
        payer_email: subscriptionData.payer.email,
        card_token_id: subscriptionData.token,
        auto_recurring: {
          frequency: subscriptionData.frequency,
          frequency_type: subscriptionData.frequency_type,
          transaction_amount: subscriptionData.transaction_amount,
          currency_id: 'ARS',
        },
        back_url:
          this.configService.get<string>('FRONTEND_URL') ||
          'http://localhost:3000',
        status: 'authorized',
      };

      // Configurar idempotency key único por request
      const idemKey = `subscription-${preapprovalPayload.external_reference}-${Date.now()}`;
      if (this.client.options) {
        this.client.options.idempotencyKey = idemKey;
      }

      // Usar la API de suscripciones de MercadoPago
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idemKey,
        },
        body: JSON.stringify(preapprovalPayload),
      });

      if (!response.ok) {
        let errorMsg = 'Error desconocido';
        try {
          const errorData = await response.json();
          errorMsg =
            errorData?.message || errorData?.error || JSON.stringify(errorData);
        } catch {}
        throw new HttpException(
          `Error al crear suscripción: ${errorMsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await response.json();
      // Log mínimo para trazabilidad (no loguear datos sensibles)
      try {
        console.log('MP preapproval created:', {
          id: result?.id,
          status: result?.status,
          external_reference: result?.external_reference,
        });
      } catch {}
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al crear suscripción con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Cancela una suscripción en MercadoPago
   * @param subscriptionId ID de la suscripción en MercadoPago
   * @returns Resultado de la cancelación
   */
  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      // Configurar idempotency key único
      const idemKey = `cancel-subscription-${subscriptionId}-${Date.now()}`;
      if (this.client.options) {
        this.client.options.idempotencyKey = idemKey;
      }

      // Usar la API de suscripciones de MercadoPago para cancelar
      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${subscriptionId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idemKey,
          },
          body: JSON.stringify({
            status: 'cancelled',
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          `Error al cancelar suscripción: ${errorData.message || 'Error desconocido'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al cancelar suscripción con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async processPayment(
    paymentData: MercadoPagoPaymentData,
  ): Promise<MercadoPagoPaymentResponse> {
    try {
      const paymentRequest = {
        token: paymentData.token,
        transaction_amount: paymentData.transaction_amount,
        description: paymentData.description,
        payment_method_id: paymentData.payment_method_id,
        payer: paymentData.payer,
        external_reference: paymentData.external_reference,
        installments: 1,
        capture: true,
      };

      // Configurar idempotency key único
      if (this.client.options) {
        this.client.options.idempotencyKey = `${paymentData.external_reference}-${Date.now()}`;
      }

      const response = await this.payment.create({ body: paymentRequest });
      return response as MercadoPagoPaymentResponse;
    } catch (error: any) {
      if (error?.cause) {
        const errorData = error.cause;
        throw new HttpException(
          `Error de MercadoPago: ${errorData.message || errorData.description || 'Error desconocido'}`,
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

      if (amount) {
        refundData.amount = amount;
      }

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

      // Validar datos mínimos requeridos
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

      // Configurar idempotency key único para esta request
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
        stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limitar stack trace
      });

      // Manejo específico de errores de MercadoPago
      if (error?.cause) {
        const cause = Array.isArray(error.cause) ? error.cause[0] : error.cause;

        // Errores específicos de credenciales
        if (
          cause?.code === 17 ||
          error.message?.includes('invalid access token')
        ) {
          throw new HttpException(
            'Token de acceso de MercadoPago inválido o expirado. Verifica tus credenciales.',
            HttpStatus.UNAUTHORIZED,
          );
        }

        // Otros errores de la API
        throw new HttpException(
          `Error de MercadoPago: ${cause?.description || cause?.message || error.message}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Error de conexión o timeout
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

  // Webhook para notificaciones de MercadoPago
  async handleWebhook(notificationData: any): Promise<void> {
    try {
      if (notificationData.type === 'payment') {
        const paymentId = notificationData.data.id;
        const payment = await this.getPayment(paymentId);

        // Aquí puedes agregar lógica para actualizar el estado de la orden
        // basado en el estado del pago
        console.log('Payment notification received:', payment);
      }
    } catch (error) {
      console.error('Error processing MercadoPago webhook:', error);
      throw error;
    }
  }
}
