import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { WebhooksController } from './webhooks.controller';
import { OrdersService } from './orders.service';
import { MpPaymentService } from './services/mp-payment.service';
import { MpSubscriptionService } from './services/mp-subscription.service';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationsModule, CartModule],
  controllers: [OrdersController, WebhooksController],
  providers: [OrdersService, MpPaymentService, MpSubscriptionService],
  exports: [OrdersService, MpPaymentService, MpSubscriptionService],
})
export class OrdersModule {}
