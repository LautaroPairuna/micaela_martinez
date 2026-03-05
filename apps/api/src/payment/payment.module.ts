// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';

@Module({
  imports: [ConfigModule, MercadoPagoModule],
  controllers: [PaymentController],
  providers: [],
  exports: [],
})
export class PaymentModule {}
