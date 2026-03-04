// apps/api/src/app.module.ts
import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StaticFilesMiddleware } from './common/middleware/static-files.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { AccountModule } from './account/account.module';
import { UsersModule } from './users/users.module';
import { LmsModule } from './lms/lms.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { HeroModule } from './hero/hero.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MediaModule } from './media/media.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { CartModule } from './cart/cart.module';
import { CertificateModule } from './certificate/certificate.module';
import { CommonServicesModule } from './common/services/common-services.module';
import { SubscriptionModule } from './subscription/subscription.module';

// 👇 Módulo agregador de todo el admin
import { AdminModule } from './admin/admin.module';

// Cache interno custom
import { CacheModule as CustomCacheModule } from './common/cache/cache.module';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ── Core / Infra ──────────────────────────────────────────────
    ScheduleModule.forRoot(),
    PrismaModule, // Prisma global
    AuthModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ── Dominios públicos ─────────────────────────────────────────
    CatalogModule, // Tienda (productos, marcas, categorías)
    LmsModule, // Cursos (listado + detalle)
    AccountModule, // Cuenta de usuario (perfil, direcciones, órdenes, favoritos, inscripciones)
    UsersModule, // Gestión de usuarios (para auth)
    SubscriptionModule, // Gestión de suscripciones
    OrdersModule, // Gestión de órdenes
    PaymentModule, // Pagos / MercadoPago
    HeroModule, // Imágenes hero / home
    ReviewsModule, // Reseñas y calificaciones
    NotificationsModule,
    MediaModule, // Sistema de medios
    WebsocketsModule, // WebSockets para tiempo real
    CartModule, // Carrito de compras (DB persistente)
    CertificateModule, // Generación de certificados
    CommonServicesModule, // Servicios comunes (Revalidación, utilidades)

    // ── Admin centralizado ────────────────────────────────────────
    AdminModule, // Meta + CRUD genérico + Uploads + Dashboard + Resources

    // ── Cache y optimización ──────────────────────────────────────
    CustomCacheModule, // Cache avanzado propio
    CacheModule.register({
      isGlobal: true,
      ttl: 10, // Reducido a 10s para evitar stale data en updates rápidos
      max: 100,
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Cachea respuestas GET automáticamente (se puede desactivar por controlador)
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
