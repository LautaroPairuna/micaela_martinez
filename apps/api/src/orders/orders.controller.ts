//src/orders/orders.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-user';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  PayOrderDto,
  SubscribeOrderDto,
} from './dto/orders.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  private userId(user: JwtUser) {
    return Number(user.sub);
  }

  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    return this.orders.createFromCart(this.userId(user), dto);
  }

  @Get('me')
  async my(@CurrentUser() user: JwtUser) {
    return this.orders.getMyOrders(this.userId(user));
  }

  @Get(':id')
  async byId(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orders.getOrderById(this.userId(user), id);
  }

  @Post(':id/pay')
  async pay(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayOrderDto,
  ) {
    return this.orders.payOneOff(this.userId(user), id, dto);
  }

  @Post(':id/subscribe')
  async subscribe(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubscribeOrderDto,
  ) {
    return this.orders.subscribe(this.userId(user), id, dto);
  }

  @Post(':id/subscription/cancel')
  async cancelSubscription(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orders.cancelSubscription(this.userId(user), id);
  }
}
