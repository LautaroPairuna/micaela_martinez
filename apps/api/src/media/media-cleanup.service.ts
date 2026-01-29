import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { promises as fsp } from 'fs';

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);
  private readonly TMP_PATH = path.join(process.cwd(), 'public', 'tmp');
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Ejecutando limpieza de archivos temporales...');
    try {
      if (!fs.existsSync(this.TMP_PATH)) {
        return;
      }

      await this.cleanDirectory(this.TMP_PATH);
    } catch (error) {
      this.logger.error('Error durante la limpieza de tmp:', error);
    }
  }

  private async cleanDirectory(dirPath: string) {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        const stats = await fsp.stat(fullPath);
        const age = now - stats.mtimeMs;

        if (age > this.MAX_AGE_MS) {
          if (entry.isDirectory()) {
            await fsp.rm(fullPath, { recursive: true, force: true });
            this.logger.log(`Directorio temporal eliminado por antigüedad: ${entry.name}`);
          } else {
            await fsp.unlink(fullPath);
            this.logger.log(`Archivo temporal eliminado por antigüedad: ${entry.name}`);
          }
        } else if (entry.isDirectory()) {
          // Si es un directorio reciente, podríamo querer limpiar dentro,
          // pero para 'tmp/chunks/{uploadId}' o 'tmp/{file}',
          // generalmente queremos borrar todo el bloque si es viejo.
          // Si tenemos subcarpetas persistentes, habría que llamar recursivamente.
          // En este caso, asumimos que todo en 'tmp' es efímero.
          // Si el directorio es reciente, lo dejamos.
        }
      } catch (err) {
        this.logger.warn(`No se pudo procesar/borrar ${fullPath}: ${err}`);
      }
    }
  }
}
