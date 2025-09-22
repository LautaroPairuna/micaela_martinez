import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';
import * as path from 'path';

@Injectable()
export class StaticFilesMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Configuración de rutas estáticas
    const publicPath = path.join(process.cwd(), 'public');

    // Middleware para servir archivos estáticos
    express.static(publicPath)(req, res, next);
  }
}
