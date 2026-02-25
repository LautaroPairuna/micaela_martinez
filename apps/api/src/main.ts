// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded, raw } from 'express';
import type { Request, Response, NextFunction } from 'express';
import * as express from 'express';
import * as path from 'path';
import { randomUUID } from 'crypto';

const cookieParser = require('cookie-parser');
const compression = require('compression');

process.on('warning', (warning: Error) => {
  const code = (warning as Error & { code?: string }).code;
  const message = warning.message;
  if (code === 'DEP0040' && message.includes('punycode')) {
    return;
  }
  console.warn(warning);
});

// 🔹 Raíz de `public` del backend
const PUBLIC_ROOT = path.join(process.cwd(), 'public');

// 🔹 Rutas públicas “externas” (las que ve el navegador)
const IMAGE_PUBLIC_URL = '/images'; // p.ej. /images/logo.png
const MEDIA_PUBLIC_URL = '/uploads/media'; // p.ej. /uploads/media/video.mp4
const DOC_PUBLIC_URL = '/uploads/docs'; // p.ej. /uploads/docs/archivo.pdf

// 🔹 Directorios reales en disco
const IMAGE_PUBLIC_DIR = path.join(PUBLIC_ROOT, 'images');
const MEDIA_UPLOAD_DIR = path.join(PUBLIC_ROOT, 'uploads', 'media');
const DOC_UPLOAD_DIR = path.join(PUBLIC_ROOT, 'uploads', 'docs');
const UPLOADS_ROOT_DIR = path.join(PUBLIC_ROOT, 'uploads'); // Nueva raíz de uploads

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // webhook raw ANTES de json/urlencoded
  app.use('/api/payments/webhook', raw({ type: '*/*' }));

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.trim() !== ''
        ? incoming
        : randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      const user = (req as any).user as
        | { id?: string; sub?: string }
        | undefined;
      const userId = user?.id ?? (req as any).userId ?? user?.sub;
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'http_request',
          requestId,
          method: req.method,
          path: req.originalUrl ?? req.url,
          status: res.statusCode,
          durationMs,
          userId,
        }),
      );
    });
    next();
  });
  // Aumentar límites de payload para uploads grandes (pero razonables para RAM)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // ✅ Servir archivos estáticos fuera del prefijo /api
  app.use(
    IMAGE_PUBLIC_URL, // '/images'
    express.static(IMAGE_PUBLIC_DIR, {
      index: false,
      maxAge: '365d',
      etag: true,
    }),
  );

  // Servir TODO /uploads
  app.use(
    '/uploads',
    express.static(UPLOADS_ROOT_DIR, {
      index: false,
      maxAge: '30d',
      etag: true,
    }),
  );

  app.use(
    MEDIA_PUBLIC_URL, // '/uploads/media' (si quieres reglas específicas para video, mantenlo, sino el de arriba ya lo cubre)
    express.static(MEDIA_UPLOAD_DIR, {
      index: false,
      maxAge: '30d',
      etag: true,
    }),
  );

  app.use(
    DOC_PUBLIC_URL, // '/uploads/docs'
    express.static(DOC_UPLOAD_DIR, {
      index: false,
      maxAge: '30d',
      etag: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Aumentar timeout del servidor para subidas lentas (60 minutos)
  const server = app.getHttpServer();
  if (server && typeof server.setTimeout === 'function') {
    server.setTimeout(3600000);
  }

  // Habilitar CORS para desarrollo y producción
  app.enableCors({
    origin: true, // Permitir cualquier origen en dev/test (ajustar en prod si es necesario)
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Authorization, X-Requested-With, X-Request-Id',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
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
  console.log(
    `🔧  Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${port}`,
  );
}

bootstrap();
