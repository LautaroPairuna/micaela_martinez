import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module'; // Importar NotificationsModule
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';

@Module({
  imports: [PrismaModule, NotificationsModule, MercadoPagoModule], // Añadir NotificationsModule
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
