// src/orders/services/mp-subscription.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig } from 'mercadopago';

export interface MercadoPagoSubscriptionData {
  token: string;
  payment_method_id: string; // Se mantiene por compatibilidad, aunque Preapproval usa card_token_id
  transaction_amount: number;
  description: string;
  external_reference: string;
  frequency: number;
  frequency_type: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

@Injectable()
export class MpSubscriptionService {
  private readonly client: MercadoPagoConfig;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );

    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    }

    this.client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 15000 },
    });
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
        card_token_id: subscriptionData.token, // Token de la tarjeta generado por Bricks (Card Payment Brick)
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

      console.log('=== BACKEND: Creando suscripción en MercadoPago (Service) ===', {
        reason: preapprovalPayload.reason,
        email: preapprovalPayload.payer_email,
        tokenPrefix: preapprovalPayload.card_token_id?.substring(0, 10),
        amount: preapprovalPayload.auto_recurring.transaction_amount,
        ref: preapprovalPayload.external_reference,
      });

      const idemKey = `subscription-${preapprovalPayload.external_reference}-${Date.now()}`;

      // Usar fetch directo ya que el SDK a veces tiene tipos incompletos para Preapproval complejo
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
        let errorData: any = {};
        try {
          errorData = await response.json();
          errorMsg =
            errorData?.message || errorData?.error || JSON.stringify(errorData);
          console.error('=== MP RAW ERROR (Subscription) ===', errorData);
        } catch {}

        if (response.status >= 500) {
          throw new HttpException(
            {
              message: 'MercadoPago upstream error',
              mpStatus: response.status,
              mpRequestId: response.headers.get('x-request-id'),
              detail: errorMsg,
            },
            HttpStatus.BAD_GATEWAY,
          );
        }

        throw new HttpException(
          `Error al crear suscripción: ${errorMsg}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await response.json();
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

  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const idemKey = `cancel-subscription-${subscriptionId}-${Date.now()}`;
      
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

  async getSubscription(preapprovalId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          `Error al obtener suscripción: ${errorData.message || 'Error desconocido'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error de conexión con MercadoPago',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}