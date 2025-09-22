// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MercadoPagoService } from './mercadopago.service';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, MercadoPagoService],
  exports: [OrdersService, MercadoPagoService],
})
export class OrdersModule {}
