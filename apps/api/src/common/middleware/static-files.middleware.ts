import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class StaticFilesMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Manejar rutas que empiecen con /uploads, /images, /videos o /docs
    if (
      !req.path.startsWith('/uploads') &&
      !req.path.startsWith('/images') &&
      !req.path.startsWith('/videos') &&
      !req.path.startsWith('/docs')
    ) {
      return next();
    }

    // Construir la ruta del archivo
    const filePath = path.join(process.cwd(), 'public', req.path);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verificar que es un archivo (no directorio)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Establecer headers apropiados
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año

    // Enviar el archivo
    res.sendFile(filePath);
  }
}
