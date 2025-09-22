// src/app/api/disk-images/[...filePath]/route.ts
export const runtime = 'nodejs';

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { generateThumbnailAuto } from '@/lib/thumbnailGenerator';

// ====== Rutas físicas locales (NO URLs) ======
// Ajustá si tu estructura difiere
const IMAGE_PUBLIC_DIR = path.join(process.cwd(), 'public', 'images');
const MEDIA_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'media');

// Si usás alias en las carpetas públicas, mapealos acá
function resolveFolderAlias(input: string): string {
  // Ejemplos de alias; ajustá a tu realidad de disco
  const map: Record<string, string> = {
    // 'media': 'medios', // descomenta si en tu FS la carpeta se llama distinto
  };
  return map[input] ?? input;
}

// Mime mínimo sin dependencia externa
function getMimeType(p: string): string | undefined {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.pdf':
      return 'application/pdf';
    default:
      return undefined;
  }
}

// Utils
function safeJoin(base: string, ...parts: string[]) {
  const decoded = parts.map((p) => decodeURIComponent(p));
  const full = path.resolve(base, ...decoded);
  const safeBase = path.resolve(base);
  if (!full.startsWith(safeBase + path.sep) && full !== safeBase) {
    throw new Error('BAD_PATH');
  }
  return full;
}

function guessMime(p: string): string {
  return getMimeType(p) || 'application/octet-stream';
}

// Node Readable -> Web ReadableStream (sin any)
function toWebReadable(
  nodeStream: import('node:stream').Readable
): ReadableStream<Uint8Array> {
  const { toWeb } = Readable as unknown as {
    toWeb: (s: import('node:stream').Readable) => ReadableStream<Uint8Array>;
  };
  return toWeb(nodeStream);
}

/**
 * Acepta:
 *   /api/disk-images/images/producto/[...]
 *   /api/disk-images/images/marca/[...]
 *   /api/disk-images/images/categoria/[...]
 *   /api/disk-images/uploads/media/[...]
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filePath: string[] }> }
) {
  try {
    const { filePath } = await context.params;
    const parts = filePath ?? [];
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
    }

    const root = parts[0]; // "images" | "uploads"
    let absPath: string;
    let contentType: string;

    if (root === 'images') {
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Carpeta de imágenes no válida' }, { status: 400 });
      }

      const folderReq = parts[1];     // "producto" | "marca" | "categoria" | etc.
      const rest = parts.slice(2);    // ["thumbs","file.webp"] | ["file.webp"]

      const physicalFolder = resolveFolderAlias(folderReq);
      absPath = safeJoin(IMAGE_PUBLIC_DIR, physicalFolder, ...rest);
      contentType = guessMime(absPath);

      // Si es thumbs y no existe, generamos miniatura desde el original
      if (rest[0] === 'thumbs' && !existsSync(absPath)) {
        const originalFileName = rest[rest.length - 1];
        const originalPath = safeJoin(IMAGE_PUBLIC_DIR, physicalFolder, originalFileName);

        if (existsSync(originalPath)) {
          console.log(`Generando miniatura para: ${originalPath}`);
          const success = await generateThumbnailAuto(originalPath, absPath, 200);
          if (!success) {
            return NextResponse.json({ error: 'Error generando miniatura' }, { status: 500 });
          }
        }
      }
    } else if (root === 'uploads') {
      if (parts[1] !== 'media' || parts.length < 3) {
        return NextResponse.json({ error: 'Subcarpeta de uploads no permitida' }, { status: 404 });
      }

      const rest = parts.slice(2); // bajo /uploads/media
      absPath = safeJoin(MEDIA_UPLOAD_DIR, ...rest);
      contentType = guessMime(absPath);

      // Si es thumbs de video y no existe, generamos
      if (rest[0] === 'thumbs' && !existsSync(absPath)) {
        const originalFileName = rest[rest.length - 1];
        const originalPath = safeJoin(MEDIA_UPLOAD_DIR, originalFileName);

        if (existsSync(originalPath)) {
          console.log(`Generando miniatura de video para: ${originalPath}`);
          const success = await generateThumbnailAuto(originalPath, absPath, 200);
          if (!success) {
            return NextResponse.json({ error: 'Error generando miniatura de video' }, { status: 500 });
          }
        }
      }
    } else {
      return NextResponse.json({ error: 'Raíz no soportada' }, { status: 404 });
    }

    if (!existsSync(absPath)) {
      return NextResponse.json({ error: 'Fichero no encontrado' }, { status: 404 });
    }
    const st = statSync(absPath);
    if (!st.isFile()) {
      return NextResponse.json({ error: 'No es un archivo' }, { status: 404 });
    }

    const etag = `W/"${st.size}-${Number(st.mtimeMs).toString(36)}"`;
    const baseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Last-Modified': st.mtime.toUTCString(),
      ETag: etag,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    const inm = req.headers.get('if-none-match');
    if (inm && inm === etag) {
      return new NextResponse(null, { status: 304, headers: baseHeaders });
    }

    const range = req.headers.get('range');
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const size = st.size;
        const start = m[1] ? Math.min(parseInt(m[1], 10), size - 1) : 0;
        const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
        const chunk = end - start + 1;

        const headers = {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(chunk),
        };
        const nodeStream = createReadStream(absPath, { start, end });
        return new Response(toWebReadable(nodeStream), { status: 206, headers });
      }
    }

    const headers = { ...baseHeaders, 'Content-Length': String(st.size) };
    const nodeStream = createReadStream(absPath);
    return new Response(toWebReadable(nodeStream), { status: 200, headers });
  } catch (e) {
    if (e instanceof Error && e.message === 'BAD_PATH') {
      return NextResponse.json({ error: 'Bad path' }, { status: 400 });
    }

    console.error('disk-images error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const HEAD = GET;
