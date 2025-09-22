/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import sharp from 'sharp';
import { schemaByResource } from '../../../../../admin/resources/[tableName]/schemas';
import { isFileField, getFileTypeFromMime, getFolderByFileType, getFileType } from '../../../../../admin/resources/[tableName]/utils/fileFieldDetection';
import { adminApi } from '@/lib/sdk/adminApi';
import * as z from 'zod';

export const runtime = 'nodejs';

// ───────── MAPEO DE RECURSOS A NOMBRES DE TABLA ─────────
const resourceToTable: Record<string, string> = {
  // Usuarios y autenticación
  Usuario: 'Usuario',
  UsuarioRol: 'UsuarioRol',
  Favorito: 'Favorito',

  // Cursos y contenido educativo
  Curso: 'Curso',
  Inscripcion: 'Inscripcion',
  Modulo: 'Modulo',
  Leccion: 'Leccion',

  // Productos y e-commerce
  Producto: 'Producto',
  ProductoImagen: 'ProductoImagen',
  Marca: 'Marca',
  Categoria: 'Categoria',

  // Órdenes y pagos
  Orden: 'Orden',
  ItemOrden: 'ItemOrden',
  Direccion: 'Direccion',

  // Reseñas y interacciones
  Resena: 'Resena',
  ResenaLike: 'ResenaLike',
  ResenaRespuesta: 'ResenaRespuesta',
  ResenaBorrador: 'ResenaBorrador',

  // Notificaciones
  Notificacion: 'Notificacion',
  PreferenciasNotificacion: 'PreferenciasNotificacion',

  // Auditoría
  AuditLog: 'AuditLog',
};

// ───────── NOMBRES DE CARPETA POR TABLA (si difieren del .toLowerCase()) ─────────
const folderNames: Record<string, string> = {
  // ejemplo: ProductoImagen: 'producto-imagenes'
  // pon aquí overrides si los tenés; si no, usaremos tableName.toLowerCase()
};

// Campos booleanos que normalizamos desde string/number
const BOOLEAN_FIELDS = ['activo', 'destacado'] as const;

// Helpers
function isFileLike(v: unknown): v is Blob {
  return typeof v === 'object' && v !== null && typeof (v as Blob).arrayBuffer === 'function';
}
function normalizeBooleans(obj: Record<string, unknown>) {
  for (const key of BOOLEAN_FIELDS) {
    if (key in obj) {
      const v = obj[key];
      obj[key] = v === true || v === 'true' || v === '1' || v === 1;
    }
  }
}
function makeTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function saveFileIfAny(
  tableName: string,
  file: File | null,
  fileField: string | null,
  data: Record<string, any>,
  existingFileName?: string | null
) {
  if (!file || !fileField) return;

  const fileType = getFileTypeFromMime(file.type);
  const baseFolder = getFolderByFileType(fileType);
  const keyDir = folderNames[tableName] || tableName.toLowerCase();
  const dir = path.join(process.cwd(), 'public', baseFolder, keyDir);

  await fs.mkdir(dir, { recursive: true });

  // Eliminar archivo anterior si existe
  if (existingFileName) {
    const oldFileType = getFileType(existingFileName);
    const oldBaseFolder = getFolderByFileType(oldFileType);
    const oldDir = path.join(process.cwd(), 'public', oldBaseFolder, keyDir);
    await fs.rm(path.join(oldDir, existingFileName), { force: true }).catch(() => {});
    // Thumbnail (si existía)
    const thumbsDir = path.join(oldDir, 'thumbs');
    await fs.rm(path.join(thumbsDir, existingFileName), { force: true }).catch(() => {});
  }

  const hint = data.titulo ?? data.producto ?? tableName;
  const slug = slugify(String(hint), { lower: true, strict: true });
  const buf = Buffer.from(await file.arrayBuffer());

  if (fileType === 'image') {
    const name = `${slug}-${makeTimestamp()}.webp`;
    const fullPath = path.join(dir, name);
    await sharp(buf).webp().toFile(fullPath);

    // Thumbnail
    const thumbsDir = path.join(dir, 'thumbs');
    await fs.mkdir(thumbsDir, { recursive: true });
    const thumbPath = path.join(thumbsDir, name);
    await sharp(buf).resize(200).webp().toFile(thumbPath);

    data[fileField] = name;
  } else if (fileType === 'video') {
    const ext = path.extname(file.name || '.mp4');
    const name = `${slug}-${makeTimestamp()}${ext}`;
    const fullPath = path.join(dir, name);
    await fs.writeFile(fullPath, buf);

    // Generar thumbnail de video (no bloqueante)
    const thumbsDir = path.join(dir, 'thumbs');
    await fs.mkdir(thumbsDir, { recursive: true });
    const thumbName = `${slug}-${makeTimestamp()}.jpg`;
    const thumbPath = path.join(thumbsDir, thumbName);
    const { generateVideoThumbnail } = await import('@/lib/thumbnailGenerator');
    generateVideoThumbnail(fullPath, thumbPath, 200).catch((error) => {
      console.error('Error generando thumbnail de video:', error);
    });

    data[fileField] = name;
  } else if (fileType === 'audio') {
    const ext = path.extname(file.name || '.mp3');
    const name = `${slug}-${makeTimestamp()}${ext}`;
    const fullPath = path.join(dir, name);
    await fs.writeFile(fullPath, buf);
    data[fileField] = name;
  } else {
    const ext = path.extname(file.name || '.bin');
    const name = `${slug}-${makeTimestamp()}${ext}`;
    const fullPath = path.join(dir, name);
    await fs.writeFile(fullPath, buf);
    data[fileField] = name;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { tableName: string; id: string } }
) {
  const tableName = resourceToTable[params.tableName];
  if (!tableName) {
    return NextResponse.json({ error: `Recurso “${params.tableName}” no existe` }, { status: 404 });
  }
  // eliminado "key" no usado

  try {
    const item = await adminApi.get(`/admin/tables/${tableName}/records/${params.id}`);
    if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al leer registro' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { tableName: string; id: string } }
) {
  const { tableName: resourceName, id } = params;
  const tableName = resourceToTable[resourceName];
  if (!tableName) {
    return NextResponse.json({ error: `Recurso "${resourceName}" no existe` }, { status: 404 });
  }

  // eliminado "key" no usado
  const existing = await adminApi.get(`/admin/tables/${tableName}/records/${id}`);

  const ct = req.headers.get('content-type') || '';
  let data: Record<string, any> = {};
  let file: File | null = null;

  try {
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      let fileField: string | null = null;

      for (const [k, v] of form.entries()) {
        if (isFileField(k) && isFileLike(v)) {
          file = v as File;
          fileField = k;
        } else if (typeof v === 'string') {
          data[k] = /^\d+$/.test(v) ? Number(v) : v;
        }
      }
      normalizeBooleans(data);
      const existingRecord = existing as Record<string, any> | null;
      await saveFileIfAny(
        tableName,
        file,
        fileField,
        data,
        existingRecord?.[fileField || 'foto'] ?? null
      );
    } else {
      data = await req.json();
      for (const k in data) {
        const val = data[k];
        if (typeof val === 'string' && /^\d+$/.test(val)) data[k] = Number(val);
      }
      normalizeBooleans(data);
    }

    // Validación con Zod (manejo de distintos tipos de schema)
    const schema = schemaByResource[resourceName] as z.ZodTypeAny | undefined;
    let validated: unknown = data;

    if (schema) {
      if (schema instanceof z.ZodObject) {
        validated = schema.partial().parse(data);
      } else {
        // Si no es objeto (e.g., ZodUnion, ZodDiscriminatedUnion, etc.)
        validated = schema.parse(data);
      }
    }

    const updated = await adminApi.put(`/admin/tables/${tableName}/records/${id}`, validated);
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error(e);
    const msg = e?.issues?.[0]?.message ?? e?.message ?? 'Error al actualizar registro';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { tableName: string; id: string } }
) {
  const { tableName: resourceName, id } = params;
  const tableName = resourceToTable[resourceName];
  if (!tableName) {
    return NextResponse.json({ error: `Recurso "${resourceName}" no existe` }, { status: 404 });
  }

  // eliminado "key" no usado
  const existing = await adminApi.get(`/admin/tables/${tableName}/records/${id}`);
  const existingRecord = existing as Record<string, any> | null;

  // borrar archivos si hay
  if (existingRecord) {
    for (const field in existingRecord) {
      if (isFileField(field) && existingRecord[field]) {
        const fileName = existingRecord[field] as string;
        const fileType = getFileType(fileName);
        const baseFolder = getFolderByFileType(fileType);
        const keyDir = folderNames[tableName] || tableName.toLowerCase();
        const dir = path.join(process.cwd(), 'public', baseFolder, keyDir);
        const thumbs = path.join(dir, 'thumbs');
        await fs.rm(path.join(dir, fileName), { force: true }).catch(() => {});
        await fs.rm(path.join(thumbs, fileName), { force: true }).catch(() => {});
      }
    }
  }

  try {
    await adminApi.delete(`/admin/tables/${tableName}/records/${id}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al eliminar registro' }, { status: 500 });
  }
}
