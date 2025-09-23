// src/payment/payment.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MercadoPagoService } from '../orders/mercadopago.service';
import type { JwtUser } from '../auth/types/jwt-user';

interface CreatePreferenceDto {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  payer?: {
    email?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

@Controller('payment')
export class PaymentController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Get('methods')
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    // Retorna los métodos de pago disponibles
    return [
      {
        id: 'mercadopago_checkout',
        name: 'MercadoPago Checkout',
        type: 'mercadopago',
        enabled: true,
      },
      {
        id: 'mercadopago_custom',
        name: 'Tarjeta de Crédito/Débito',
        type: 'mercadopago',
        enabled: true,
      },
      {
        id: 'bank_transfer',
        name: 'Transferencia Bancaria',
        type: 'transfer',
        enabled: true,
      },
    ];
  }

  @Post('mercadopago/preference')
  @UseGuards(JwtAuthGuard)
  async createMercadoPagoPreference(
    @CurrentUser() user: JwtUser,
    @Body() preferenceData: CreatePreferenceDto,
  ) {
    try {
      console.log(
        '=== CONTROLLER: Iniciando creación de preferencia MercadoPago ===',
      );
      console.log('Usuario autenticado:', {
        id: user.sub,
        email: user.email,
        name: user.name,
      });
      console.log(
        'Datos recibidos del frontend:',
        JSON.stringify(preferenceData, null, 2),
      );

      const userId = user.sub;
      const userEmail = user.email;

      // Preparar los datos para MercadoPago
      const mpPreferenceData = {
        items: preferenceData.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: 'ARS',
        })),
        payer: {
          email: preferenceData.payer?.email || userEmail,
        },
        back_urls: preferenceData.back_urls,
        auto_return: 'approved',
        external_reference: `user_${userId}_${Date.now()}`,
        notification_url: `${process.env.API_BASE_URL || process.env.PUBLIC_URL || 'http://localhost:3001'}/api/payment/mercadopago/webhook`,
      };

      console.log('=== CONTROLLER: Datos preparados para MercadoPago ===');
      console.log(
        'mpPreferenceData:',
        JSON.stringify(mpPreferenceData, null, 2),
      );

      console.log('=== CONTROLLER: Llamando al servicio MercadoPago ===');
      const preference =
        await this.mercadoPagoService.createPreference(mpPreferenceData);

      console.log('=== CONTROLLER: Preferencia creada exitosamente ===');
      console.log('Respuesta de MercadoPago:', {
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      });

      const response = {
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
      };

      console.log('=== CONTROLLER: Enviando respuesta al frontend ===');

      return response;
    } catch (error: any) {
      console.error('=== CONTROLLER: Error al crear preferencia ===');
      console.error('Error completo:', {
        message: error.message,
        stack: error.stack,
        status: error.status,
        response: error.response,
      });
      throw new HttpException(
        error.message || 'Error al crear la preferencia de pago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('mercadopago/webhook')
  async handleMercadoPagoWebhook(@Body() notificationData: any) {
    try {
      // Aquí puedes procesar las notificaciones de MercadoPago
      console.log('MercadoPago webhook received:', notificationData);

      // TODO: Implementar lógica de webhook según tus necesidades
      // Por ejemplo, actualizar el estado de la orden

      return { status: 'ok' };
    } catch (error: any) {
      console.error('Error processing MercadoPago webhook:', error);
      throw new HttpException(
        'Error al procesar webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
