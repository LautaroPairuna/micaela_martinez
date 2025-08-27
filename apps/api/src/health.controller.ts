import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async ping() {
    const started = Date.now();
    try {
      // SELECT 1 para verificar conexión MySQL
      await this.prisma.$queryRaw`SELECT 1 as ok`;
      const latency = Date.now() - started;
      return {
        status: 'ok',
        db: 'up',
        dbLatencyMs: latency,
        uptimeSec: Math.round(process.uptime()),
      };
    } catch (e: any) {
      // 503 si no puede llegar a la DB
      throw new ServiceUnavailableException({
        status: 'degraded',
        db: 'down',
        error: (e?.message || String(e)).slice(0, 200),
        uptimeSec: Math.round(process.uptime()),
      });
    }
  }
}