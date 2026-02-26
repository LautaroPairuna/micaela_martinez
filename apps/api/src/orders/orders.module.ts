import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { WebhooksController } from './webhooks.controller';
import { OrdersService } from './orders.service';
import { MercadoPagoService } from './mercadopago.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [OrdersController, WebhooksController],
  providers: [OrdersService, MercadoPagoService],
  exports: [OrdersService, MercadoPagoService],
})
export class OrdersModule {}
