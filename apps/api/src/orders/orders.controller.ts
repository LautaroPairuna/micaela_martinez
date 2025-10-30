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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  MercadoPagoPaymentDto,
  MercadoPagoSubscriptionDto,
} from './dto/orders.dto';
import { EstadoOrden } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
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
  async getUserOrders(@CurrentUser() user: JwtUser) {
    try {
      return await this.ordersService.getUserOrders(user.sub);
    } catch (error) {
      throw new HttpException(
        'Error al obtener las órdenes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getOrderById(
    @CurrentUser() user: JwtUser,
    @Param('id') id: number,
  ) {
    try {
      const order = await this.ordersService.getOrderById(id, user.sub);

      if (!order) {
        throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
      }

      return order;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error al obtener la orden',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/status')
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
  async processMercadoPagoPayment(
    @CurrentUser() user: JwtUser,
    @Param('id') orderId: number,
    @Body() paymentData: MercadoPagoPaymentDto,
  ) {
    try {
      return await this.ordersService.processMercadoPagoPayment(
        orderId,
        user.sub,
        paymentData,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al procesar el pago con MercadoPago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/subscription/mercadopago')
  async createMercadoPagoSubscription(
    @CurrentUser() user: JwtUser,
    @Param('id') orderId: number,
    @Body() subscriptionData: MercadoPagoSubscriptionDto,
  ) {
    try {
      return await this.ordersService.createMercadoPagoSubscription(
        orderId,
        user.sub,
        subscriptionData,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message ||
          'Error al crear la suscripción con MercadoPago',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/subscription/cancel')
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

  @Post('webhooks/mercadopago')
  async handleMercadoPagoWebhook(
    @Body() webhookData: any,
    @Query('type') eventType: string,
    @Query('data.id') dataId: number,
  ) {
    try {
      return await this.ordersService.processMercadoPagoWebhook(
        eventType,
        dataId,
        webhookData,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al procesar el webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('mercadopago/webhook')
  async handleMercadoPagoDirectWebhook(
    @Query('type') type: string,
    @Query('id') id: number,
    @Body() data: any
  ) {
    try {
      return await this.ordersService.processMercadoPagoWebhook(
        type,
        id,
        data,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al procesar el webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('mercadopago/subscription-webhook')
  async handleMercadoPagoSubscriptionWebhook(
    @Query('type') type: string,
    @Query('id') id: number,
    @Body() data: any
  ) {
    try {
      return await this.ordersService.processMercadoPagoWebhook(
        type,
        id,
        data,
      );
    } catch (error) {
      throw new HttpException(
        (error as Error).message || 'Error al procesar el webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
