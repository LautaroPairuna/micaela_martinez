import { Module } from '@nestjs/common';
import { CacheModule, CacheInterceptor } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogModule } from './catalog/catalog.module';
import { LmsModule } from './lms/lms.module';

@Module({
  imports: [
    PrismaModule,       // Prisma global
    AuthModule,         // tu auth actual
    CatalogModule,      // tienda (productos, marcas, categorías)
    LmsModule,          // cursos (listado + detalle)
    CacheModule.register({
      isGlobal: true,
      ttl: 60, // segundos; ajustá si necesitás
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Cachea respuestas GET automáticamente (se puede desactivar por controlador)
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
