import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);
  // Intentar leer FRONTEND_URL, fallback a localhost
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  private readonly secret = process.env.REVALIDATION_SECRET;

  async revalidate(tag: string) {
    if (!this.secret) {
      this.logger.warn('REVALIDATION_SECRET not set. Skipping revalidation.');
      return;
    }

    try {
      // Construir URL absoluta
      const baseUrl = this.frontendUrl.replace(/\/$/, '');
      const url = `${baseUrl}/api/revalidate?tag=${encodeURIComponent(tag)}&secret=${this.secret}`;
      
      this.logger.log(`Revalidating tag: ${tag} -> ${url}`);
      
      const res = await fetch(url, { method: 'POST' });
      
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Revalidation failed [${res.status}]: ${text}`);
      } else {
        this.logger.log(`Revalidation success for tag: ${tag}`);
      }
    } catch (error) {
      this.logger.error(`Revalidation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async revalidateResource(resourceName: string) {
    const map: Record<string, string[]> = {
      Producto: ['products'],
      Curso: ['courses'],
      Marca: ['products'],
      Categoria: ['products'],
      Hero: ['hero'],
    };

    const tags = map[resourceName] || [];
    if (tags.length > 0) {
      await Promise.all(tags.map((tag) => this.revalidate(tag)));
    }
  }
}
