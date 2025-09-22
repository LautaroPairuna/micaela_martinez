import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { contentType } from 'mime-types';

type RangeInfo = {
  status: 200 | 206;
  start: number;
  end: number;
  size: number;
};

type StreamPayload = {
  stream: fs.ReadStream;
  headers: Record<string, string | number>;
  status: 200 | 206;
};

type TokenPayload = {
  videoId: string;
  userId?: string;
  exp: number; // epoch seconds
  iat?: number;
  jti?: string;
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  // Directorios base para buscar archivos
  private roots(): string[] {
    const roots = [
      // Raíz principal de la API compilada (dist)
      path.resolve(__dirname, '../../'), // -> apps/api/dist

      // Raíz del proyecto sin compilar (para desarrollo)
      path.resolve(__dirname, '../../../'), // -> apps/api

      // Raíz absoluta del proyecto (por si acaso)
      'D:/wamp64/www/mica_pestanas/apps/api',
    ];

    // Normalizamos y quitamos duplicados
    const out = Array.from(new Set(roots.map((r) => path.resolve(r))));
    return out;
  }

  // carpetas candidatas donde pueden estar los videos (simplificado)
  private candidateVideoPaths(filename: string): string[] {
    const roots = this.roots();

    // Estructuras principales que usamos
    const patterns = [
      ['public', 'uploads', 'media', filename], // apps/api/public/uploads/media/<file> (PRINCIPAL)
      ['public', 'uploads', 'media', 'leccion', filename],
      ['public', 'videos', filename], // apps/api/public/videos/<file> (ALTERNATIVA)
    ];

    const paths: string[] = [];
    for (const root of roots) {
      for (const parts of patterns) {
        paths.push(path.resolve(root, ...parts));
      }
    }
    return Array.from(new Set(paths));
  }

  private debugListDir(dir: string): void {
    // Método eliminado - ya no necesitamos logs de depuración
  }

  private findVideoOr404(filename: string): string {
    const candidates = this.candidateVideoPaths(filename);

    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        return p;
      }
    }
    throw new NotFoundException('Video no encontrado');
  }

  // ------------- utils comunes -------------

  private safeJoin(base: string, unsafe: string) {
    const decoded = decodeURIComponent(unsafe);
    const p = path.normalize(path.join(base, decoded));
    if (!p.startsWith(path.normalize(base))) {
      throw new BadRequestException('Ruta inválida');
    }
    return p;
  }

  private statOr404(fullPath: string) {
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return fs.statSync(fullPath);
  }

  private parseRange(rangeHeader: string | undefined, size: number): RangeInfo {
    if (!rangeHeader) {
      return { status: 200, start: 0, end: size - 1, size };
    }
    const m = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!m) return { status: 200, start: 0, end: size - 1, size };

    let start = m[1] ? parseInt(m[1], 10) : 0;
    let end = m[2] ? parseInt(m[2], 10) : size - 1;

    if (isNaN(start) && !isNaN(end)) {
      start = size - end;
      end = size - 1;
    }
    if (!isNaN(start) && isNaN(end)) {
      end = Math.min(start + 1024 * 1024 - 1, size - 1); // ~1MB por chunk
    }
    start = Math.max(0, start);
    end = Math.min(end, size - 1);

    if (start > end || start >= size) {
      return { status: 200, start: 0, end: size - 1, size };
    }
    return { status: 206, start, end, size };
  }

  private buildCommonHeaders(fullPath: string) {
    const type =
      (contentType(path.basename(fullPath)) as string) ||
      'application/octet-stream';
    return {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=0, no-store',
      'Last-Modified': fs.statSync(fullPath).mtime.toUTCString(),
    } as Record<string, string>;
  }

  /**
   * Determina el tipo MIME basado en la extensión del archivo
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    // Mapa de extensiones a tipos MIME
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  // ----------- token helpers (base64 JSON) -----------

  private fromBase64(s?: string): string {
    if (!s) return '';
    try {
      return Buffer.from(s, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }

  private parseToken(token?: string): TokenPayload {
    if (!token) throw new UnauthorizedException('Token faltante');
    const json = this.fromBase64(token);
    let payload: TokenPayload | null = null;
    try {
      payload = JSON.parse(json);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
    if (!payload?.videoId || !payload.exp) {
      throw new UnauthorizedException('Token incompleto');
    }
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) throw new UnauthorizedException('Token expirado');
    return payload;
  }

  // ------------- API pública -------------

  getVideoStream(
    filename: string,
    rangeHeader?: string,
    opts?: { token?: string },
  ): StreamPayload {
    // Ya no validamos el token, la autenticación se maneja a través de las cookies de sesión
    // que son verificadas por los guards de NestJS

    const fullPath = this.findVideoOr404(filename);
    const stat = this.statOr404(fullPath);
    const fileSize = stat.size;

    // Determinar el Content-Type basado en la extensión
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'video/mp4'; // Por defecto

    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.ogg' || ext === '.ogv') contentType = 'video/ogg';
    else if (ext === '.mov') contentType = 'video/quicktime';

    // Configuración para streaming de video
    let start = 0;
    let end = fileSize - 1;
    let status: 200 | 206 = 200;

    // Procesar header Range si existe
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10) || 0;
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      status = 206; // Partial Content
    }

    // Headers mejorados para streaming
    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Origin',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      Connection: 'keep-alive',
    };

    if (status === 206) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
    }

    const stream = fs.createReadStream(fullPath, {
      start: start,
      end: end,
    });

    return { stream, headers, status: status };
  }

  getDocumentStream(filename: string, asAttachment = false): StreamPayload {
    // probamos en apps/api/public/uploads/docs
    const roots = this.roots();
    const candidates = [
      ...roots.map((r) =>
        path.resolve(r, 'public', 'uploads', 'docs', filename),
      ),
      ...roots.map((r) => path.resolve(r, 'public', 'docs', filename)),
      ...roots.map((r) => path.resolve(r, 'docs', filename)),
    ];

    let fullPath = '';
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        fullPath = p;
        break;
      }
    }
    if (!fullPath) throw new NotFoundException('Documento no encontrado');

    const stat = this.statOr404(fullPath);
    const headers = this.buildCommonHeaders(fullPath);
    headers['Content-Length'] = String(stat.size);
    if (asAttachment) {
      headers['Content-Disposition'] =
        `attachment; filename="${encodeURIComponent(path.basename(filename))}"`;
    }

    const stream = fs.createReadStream(fullPath);
    return { stream, headers, status: 200 };
  }

  getImageStream(filename: string): StreamPayload {
    // probamos en apps/api/public/images
    const roots = this.roots();
    const candidates = [
      ...roots.map((r) => path.resolve(r, 'public', 'images', filename)),
      ...roots.map((r) => path.resolve(r, 'images', filename)),
    ];

    let fullPath = '';
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        fullPath = p;
        break;
      }
    }
    if (!fullPath) throw new NotFoundException('Imagen no encontrada');

    const stat = this.statOr404(fullPath);
    const headers = this.buildCommonHeaders(fullPath);
    headers['Content-Length'] = String(stat.size);

    const stream = fs.createReadStream(fullPath);
    return { stream, headers, status: 200 };
  }

  // Método para servir imágenes públicas desde el backend
  getPublicImageStream(filename: string): StreamPayload {
    // Directorios donde buscar imágenes públicas (solo en el backend)
    const candidates = [
      // Directorio principal public del backend
      path.resolve(__dirname, '../../public', filename),
      // Directorio public/images del backend
      path.resolve(__dirname, '../../public/images', filename),
      // Directorio images en la raíz del backend
      path.resolve(__dirname, '../../images', filename),
    ];

    // Buscar el archivo
    let fullPath = '';
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        fullPath = p;
        break;
      }
    }

    if (!fullPath) {
      throw new NotFoundException(`Imagen pública no encontrada: ${filename}`);
    }

    const mimeType = this.getMimeType(path.extname(fullPath)) || 'image/jpeg';
    const stream = fs.createReadStream(fullPath);

    return {
      stream,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400',
      },
      status: 200,
    };
  }

  /**
   * Obtiene el thumbnail de un video
   * Busca un archivo .jpg con el mismo nombre que el video
   */
  getVideoThumbnail(filename: string): StreamPayload {
    // Quitamos la extensión del video y buscamos un .jpg
    const baseName = filename.replace(/\.[^.]+$/, '');
    const thumbFilename = `${baseName}.jpg`;

    // Buscamos en varias ubicaciones posibles
    const roots = this.roots();
    const candidates = [
      // Thumbnails específicos
      ...roots.map((r) =>
        path.resolve(r, 'public', 'uploads', 'thumbnails', thumbFilename),
      ),
      ...roots.map((r) =>
        path.resolve(r, 'public', 'thumbnails', thumbFilename),
      ),
      ...roots.map((r) => path.resolve(r, 'thumbnails', thumbFilename)),
      // Junto a los videos
      ...roots.map((r) =>
        path.resolve(r, 'public', 'uploads', 'media', thumbFilename),
      ),
      ...roots.map((r) => path.resolve(r, 'public', 'media', thumbFilename)),
      ...roots.map((r) => path.resolve(r, 'media', thumbFilename)),
    ];

    let fullPath = '';
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        fullPath = p;
        break;
      }
    }

    if (!fullPath)
      throw new NotFoundException(`Thumbnail no encontrado para ${filename}`);

    const stat = this.statOr404(fullPath);
    const headers = this.buildCommonHeaders(fullPath);
    headers['Content-Length'] = String(stat.size);
    headers['Cache-Control'] = 'public, max-age=86400'; // Cachear por 24h

    const stream = fs.createReadStream(fullPath);
    return { stream, headers, status: 200 };
  }
}
