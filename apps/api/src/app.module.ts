import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StaticFilesMiddleware } from './common/middleware/static-files.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { AccountModule } from './account/account.module';
import { UsersModule } from './users/users.module';
import { LmsModule } from './lms/lms.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { HeroModule } from './hero/hero.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './admin/uploads/uploads.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    PrismaModule, // Prisma global
    AuthModule, // tu auth actual
    EventEmitterModule.forRoot({
      // Habilitar wildcard listeners para eventos jerárquicos
      wildcard: true,
      // Permitir que los eventos se propaguen a través de namespaces
      delimiter: '.',
      // Máximo de listeners por evento
      maxListeners: 20,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CatalogModule, // tienda (productos, marcas, categorías)
    LmsModule, // cursos (listado + detalle)
    AccountModule, // cuenta de usuario (perfil, direcciones, órdenes, favoritos, inscripciones)
    UsersModule, // gestión de usuarios (para auth)
    OrdersModule, // gestión de órdenes y pagos
    PaymentModule, // gestión de pagos y MercadoPago
    HeroModule, // gestión de imágenes del hero
    ReviewsModule, // gestión de reseñas y calificaciones
    NotificationsModule, // sistema de notificaciones
    AdminModule, // panel de administración
    UploadsModule, // sistema de subida de archivos
    MediaModule, // sistema de gestión de medios
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 1 minuto por defecto
      max: 100, // máximo 100 items en caché
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Cachea respuestas GET automáticamente (se puede desactivar por controlador)
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(StaticFilesMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.GET });
  }
}
