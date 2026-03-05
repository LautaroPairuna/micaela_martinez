//src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [MercadoPagoModule, SubscriptionModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
