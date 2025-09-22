// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { MercadoPagoService } from '../orders/mercadopago.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class PaymentModule {}
