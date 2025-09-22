import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsTaskService {
  private readonly logger = new Logger(NotificationsTaskService.name);

  constructor(private prisma: PrismaService) {}

  // Ejecutar todos los días a la medianoche
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldNotifications() {
    this.logger.log('Iniciando limpieza de notificaciones antiguas...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const result = await this.prisma.notificacion.deleteMany({
        where: {
          creadoEn: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(`Se eliminaron ${result.count} notificaciones antiguas`);
    } catch (error) {
      this.logger.error(
        `Error al limpiar notificaciones antiguas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
