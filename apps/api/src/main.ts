// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded, raw } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ⚠️ El raw del webhook debe declararse ANTES del json/urlencoded
  app.use('/api/payments/webhook', raw({ type: '*/*' }));
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  app.setGlobalPrefix('api');

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',').map(s => s.trim());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
    exposedHeaders: ['Content-Length','ETag'],
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // ✅ ahora compila: método propio de Express
  app.set('trust proxy', 1);

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`API encendida en http://localhost:${port}/api`);
}
bootstrap();
