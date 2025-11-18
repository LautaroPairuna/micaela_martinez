// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded, raw } from 'express';
const cookieParser = require('cookie-parser');
import * as express from 'express';

// 👇 importa tus rutas y dirs públicos del módulo de uploads
import {
  IMAGE_PUBLIC_DIR,
  MEDIA_UPLOAD_DIR,
  DOC_UPLOAD_DIR,
  IMAGE_PUBLIC_URL,
  MEDIA_PUBLIC_URL,
  DOC_PUBLIC_URL,
} from './admin/uploads/constants';

const compression = require('compression');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // webhook raw ANTES de json/urlencoded
  app.use('/api/payments/webhook', raw({ type: '*/*' }));
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.use(cookieParser());
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // ✅ Servir archivos estáticos fuera del prefijo /api
  //    (ponelo ANTES o DESPUÉS del setGlobalPrefix, da igual, el path es absoluto)
  app.use(
    IMAGE_PUBLIC_URL, // '/images'
    express.static(IMAGE_PUBLIC_DIR, {
      index: false,
      maxAge: '365d',
      etag: true,
    }),
  );
  app.use(
    MEDIA_PUBLIC_URL, // '/uploads/media'
    express.static(MEDIA_UPLOAD_DIR, {
      index: false,
      maxAge: '30d',
      etag: true,
    }),
  );
  app.use(
    DOC_PUBLIC_URL, // '/uploads/docs'
    express.static(DOC_UPLOAD_DIR, { index: false, maxAge: '30d', etag: true }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // CORS - Configuración robusta
  const whitelist = (process.env.CORS_ORIGIN || '').split(',').filter(Boolean);
  console.log(
    `Orígenes CORS permitidos: ${whitelist.join(', ') || 'Cualquiera (fallback)'}`,
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origen (como Postman, apps móviles o curl)
      if (!origin) {
        return callback(null, true);
      }
      // Si la whitelist está vacía, permitir cualquier origen (útil para desarrollo local)
      // O si el origen está en la whitelist
      if (whitelist.length === 0 || whitelist.indexOf(origin) !== -1) {
        callback(null, true); // Refleja el origen solicitado
      } else {
        callback(new Error('Origen no permitido por la política CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.set('trust proxy', 1);
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`API encendida en http://localhost:${port}/api`);
  console.log(`🖼  Estáticos: ${IMAGE_PUBLIC_URL} → ${IMAGE_PUBLIC_DIR}`);
  console.log(`🎞  Media:     ${MEDIA_PUBLIC_URL} → ${MEDIA_UPLOAD_DIR}`);
  console.log(`📄  Docs:      ${DOC_PUBLIC_URL} → ${DOC_UPLOAD_DIR}`);
}
bootstrap();
