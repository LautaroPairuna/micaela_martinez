//src/orders/orders.controller.ts
import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderFromCartDto } from './dto/create-order-from-cart.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { SubscribeOrderDto } from './dto/subscribe-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // Ajustá esto según tu auth guard (JWT). Asumo req.user.id.
  private userId(req: any) {
    return Number(req.user?.id);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrderFromCartDto) {
    console.log('=== API: create order dto keys ===', Object.keys(dto ?? {}));
    console.log('=== API: dto.source ===', dto?.source);
    // En CreateOrderFromCartDto NO existe 'items', así que esto confirmará que usamos el DTO correcto
    console.log('=== API: dto type ===', dto.constructor.name);
    return this.orders.createFromCart(this.userId(req), dto as any);
  }

  @Get('me')
  async my(@Req() req: any) {
    return this.orders.getMyOrders(this.userId(req));
  }

  @Get(':id')
  async byId(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.orders.getOrderById(this.userId(req), id);
  }

  @Post(':id/pay')
  async pay(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: PayOrderDto) {
    return this.orders.payOneOff(this.userId(req), id, dto);
  }

  @Post(':id/subscribe')
  async subscribe(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SubscribeOrderDto) {
    return this.orders.subscribe(this.userId(req), id, dto);
  }
}