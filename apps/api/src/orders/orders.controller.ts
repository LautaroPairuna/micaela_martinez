// src/orders/orders.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Headers,
  Ip,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtUser } from '../auth/types/jwt-user';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  MercadoPagoPaymentDto,
  MercadoPagoSubscriptionDto,
} from './dto/orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser() user: JwtUser,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    try {
      return await this.ordersService.createOrder(user.sub, createOrderDto);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al crear la orden',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserOrders(@CurrentUser() user: JwtUser) {
    try {
      return await this.ordersService.getUserOrders(user.sub);
    } catch {
      throw new HttpException(
        'Error al obtener las órdenes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrderById(@CurrentUser() user: JwtUser, @Param('id') id: number) {
    try {
      return await this.ordersService.getOrderById(id, user.sub);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Error al obtener la orden',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      return await this.ordersService.updateOrderStatus(
        id,
        user.sub,
        updateStatusDto.estado,
        updateStatusDto.referenciaPago,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al actualizar el estado de la orden',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/payment/mercadopago')
  @UseGuards(JwtAuthGuard)
  async processMercadoPagoPayment(
    @CurrentUser() user: JwtUser,
    @Param('id') orderId: number,
    @Body() paymentData: MercadoPagoPaymentDto,
    @Headers('x-attempt-id') attemptId?: string,
    @Ip() ip?: string,
  ) {
    try {
      return await this.ordersService.processMercadoPagoPayment(
        orderId,
        user.sub,
        paymentData,
        { attemptId, ip },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message || 'Error al procesar el pago con MercadoPago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/subscription/mercadopago')
  @UseGuards(JwtAuthGuard)
  async createMercadoPagoSubscription(
    @CurrentUser() user: JwtUser,
    @Param('id') orderId: number,
    @Body() subscriptionData: MercadoPagoSubscriptionDto,
    @Headers('x-attempt-id') attemptId?: string,
  ) {
    try {
      return await this.ordersService.createMercadoPagoSubscription(
        orderId,
        user.sub,
        subscriptionData,
        { attemptId },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        (error as Error).message ||
          'Error al crear la suscripción con MercadoPago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/subscription/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(
    @CurrentUser() user: JwtUser,
    @Param('id') orderId: number,
  ) {
    try {
      return await this.ordersService.cancelSubscription(orderId, user.sub);
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al cancelar la suscripción',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('sync-subscriptions')
  @UseGuards(JwtAuthGuard)
  async syncHistoricalSubscriptions() {
    try {
      return await this.ordersService.syncHistoricalSubscriptions();
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al sincronizar suscripciones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('webhooks/mercadopago')
  async handleMercadoPagoWebhook(
    @Body() webhookData: any,
    @Query('type') eventType: string,
    @Query('data.id') dataIdFromQuery: string,
    @Query('id') idFallback: string,
  ) {
    const safeType = String(eventType || webhookData?.type || webhookData?.action || webhookData?.topic || '').trim();

    const rawId =
      dataIdFromQuery ||
      idFallback ||
      webhookData?.data?.id ||
      webhookData?.id ||
      webhookData?.resource?.id;

    // ✅ SIEMPRE string (pago = numérico; suscripción = alfanumérico)
    const dataIdRaw = String(rawId ?? '').trim().toLowerCase();

    if (!safeType || !dataIdRaw) {
      return { received: true, ignored: true, reason: 'missing_type_or_id' };
    }

    try {
      return await this.ordersService.processMercadoPagoWebhook(
        safeType,
        dataIdRaw, // ✅ string
        webhookData,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al procesar el webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}