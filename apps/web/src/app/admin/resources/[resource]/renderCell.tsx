// apps/web/src/app/admin/resources/[resource]/renderCell.tsx
'use client';

import type { FieldMeta, ResourceMeta } from '@/lib/admin/meta-types';
import Image from 'next/image';
import { IMAGE_PUBLIC_URL, THUMBNAIL_PUBLIC_URL } from '@/lib/adminConstants';

export function renderCell({
  field,
  row,
  meta,
}: {
  field: FieldMeta;
  row: any;
  meta: ResourceMeta;
}) {
  const value = row[field.name];

  // ───────────────── IMAGEN ─────────────────
  if (field.isImage) {
    if (!value) {
      return <span className="text-xs text-slate-500">—</span>;
    }

    const v = String(value);
    let src: string;

    if (v.startsWith('http')) {
      // URL absoluta ya lista
      src = v;
    } else if (v.startsWith('/')) {
      // Ya viene lista (por ejemplo /api/media/images/...)
      src = v;
    } else if (v.includes('/')) {
      // Formato viejo: 'uploads/producto/archivo.webp'
      const clean = v.replace(/^\/+/, '');
      const thumb = clean.replace(/\.webp$/i, '-thumb.webp');
      src = `${IMAGE_PUBLIC_URL}/${thumb}`;
    } else {
      // Formato nuevo: solo nombre => /api/media/images/images/<tabla>/<archivo>
      const thumb = v.replace(/\.webp$/i, '-thumb.webp');
      src = `${IMAGE_PUBLIC_URL}/${meta.tableName}/${thumb}`;
    }

    return (
      <div className="flex items-center gap-2">
        <Image
          src={src}
          alt={field.name}
          width={42}
          height={42}
          className="rounded border border-slate-800 object-cover"
          unoptimized
        />
        <span className="max-w-[180px] truncate text-xs text-slate-300">
          {v}
        </span>
      </div>
    );
  }

  if (field.isFile) {
    if (!value) return <span className="text-xs text-slate-500">—</span>;
    const v = String(value);
    const filename = v.split('/').pop() ?? v;
    const lower = filename.toLowerCase();
    const isVideo =
      field.fileKind === 'video' ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov');

    if (!isVideo) {
      return (
        <span className="max-w-[180px] truncate text-xs text-slate-300">
          {filename}
        </span>
      );
    }

    const thumbSrc = `${THUMBNAIL_PUBLIC_URL}/${filename}`;
    return (
      <div className="flex items-center gap-2">
        <img
          src={thumbSrc}
          alt={field.name}
          width={56}
          height={42}
          className="rounded border border-slate-800 object-cover"
        />
        <span className="max-w-[180px] truncate text-xs text-slate-300">
          {filename}
        </span>
      </div>
    );
  }

  // ──────────────── CONTEO HIJOS ────────────────
  if (field.isParentChildCount) {
    const count = row._count?.[field.name] ?? 0;
    return (
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[12px] text-slate-100">
        {count} ítem{count === 1 ? '' : 's'}
      </span>
    );
  }

  // ──────────────── BOOLEANOS ────────────────
  if (field.type === 'Boolean') {
    const b = Boolean(value);
    return (
      <span
        className={
          'inline-flex min-w-[88px] items-center justify-center rounded-full px-3 py-1 text-[12px] font-medium ' +
          (b
            ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/60'
            : 'bg-rose-500/15 text-rose-200 border border-rose-500/60')
        }
      >
        {b ? 'Sí' : 'No'}
      </span>
    );
  }

  // ──────────────── VACÍOS ────────────────
  if (value === null || value === undefined || value === '') {
    return <span className="text-[12px] text-slate-500">—</span>;
  }

  // ──────────────── DATETIME ────────────────
  if (field.type === 'DateTime') {
    const d = new Date(value);
    return (
      <span className="text-[12px] text-slate-200">
        {d.toLocaleDateString()} {d.toLocaleTimeString()}
      </span>
    );
  }

  // ──────────────── DEFAULT ────────────────
  return (
    <span className="max-w-[260px] truncate text-[12px] text-slate-100">
      {String(value)}
    </span>
  );
}
