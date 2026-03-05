import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [MercadoPagoModule, OrdersModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}