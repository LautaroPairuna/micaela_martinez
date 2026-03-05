import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MercadoPagoClient } from './mercadopago.client';
import { MpPaymentService } from './mp-payment.service';
import { MpSubscriptionService } from './mp-subscription.service';

@Module({
  imports: [ConfigModule],
  providers: [MercadoPagoClient, MpPaymentService, MpSubscriptionService],
  exports: [MpPaymentService, MpSubscriptionService],
})
export class MercadoPagoModule {}
