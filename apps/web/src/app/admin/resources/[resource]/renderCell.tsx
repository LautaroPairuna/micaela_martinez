// apps/web/src/app/admin/resources/[resource]/renderCell.tsx
'use client';

import type { FieldMeta, ResourceMeta } from '@/lib/admin/meta-types';
import Image from 'next/image';
import { IMAGE_PUBLIC_URL } from '@/lib/adminConstants';

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
      src = `${IMAGE_PUBLIC_URL}/${clean}`; // /api/media/images/uploads/producto/archivo.webp
    } else {
      // Formato nuevo: solo nombre => /api/media/images/images/<tabla>/<archivo>
      src = `${IMAGE_PUBLIC_URL}/${meta.tableName}/${v}`;
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
