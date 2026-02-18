// apps/web/src/app/admin/resources/[resource]/renderCell.tsx
'use client';

import { useState } from 'react';
import type { FieldMeta, ResourceMeta } from '@/lib/admin/meta-types';
import Image from 'next/image';
import { THUMBNAIL_PUBLIC_URL, isImageFile } from '@/lib/adminConstants';
import { resolveResourceThumb } from '@/lib/image-utils';

function lowerFirst(value: string) {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function resolveRelationLabel(relation: any) {
  if (!relation || typeof relation !== 'object') return null;
  const candidates = ['nombre', 'name', 'titulo', 'title', 'email', 'slug'];
  for (const key of candidates) {
    const v = relation[key];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

function ThumbnailImage({ src, alt, fallbackSrc, originalSrc }: { src: string; alt: string; fallbackSrc?: string; originalSrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex h-[42px] w-[42px] items-center justify-center rounded border border-slate-800 bg-slate-900 text-xs text-slate-500" title="No image">
        Img
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={42}
      height={42}
      className="rounded border border-slate-800 object-cover"
      unoptimized
      onError={() => {
        // 1. Si falla la principal (con /thumbs/), probar fallback (plana)
        if (fallbackSrc && currentSrc === src) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        // 2. Si falla fallback, probar original (sin thumb)
        if (originalSrc && currentSrc !== originalSrc) {
          setCurrentSrc(originalSrc);
          return;
        }
        // 3. Si todo falla
        setError(true);
      }}
    />
  );
}

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
    const primarySrc = resolveResourceThumb(meta.tableName, v) || v;
    
    // Fallback: Si la ruta generada tiene /thumbs/, probar la ruta plana (legacy uploads)
    let fallbackSrc: string | undefined;
    if (primarySrc.includes('/thumbs/') && primarySrc.startsWith('/uploads/')) {
       fallbackSrc = primarySrc.replace('/thumbs/', '/');
    }

    return (
      <div className="flex items-center gap-2">
        <ThumbnailImage 
          src={primarySrc} 
          alt={field.name} 
          fallbackSrc={fallbackSrc}
          originalSrc={v !== primarySrc ? v : undefined}
        />
        <span className="max-w-[120px] truncate text-xs text-slate-300">
          {v}
        </span>
      </div>
    );
  }

  if (field.isFile || field.widget === 'video') {
    if (!value) return <span className="text-xs text-slate-500">—</span>;
    const v = String(value);
    const filename = v.split('/').pop() ?? v;
    const lower = filename.toLowerCase();
    
    const isVideo =
      field.widget === 'video' ||
      field.fileKind === 'video' ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov');

    // Si es archivo pero resulta ser una imagen (ej. slider banner), mostramos thumb
    if (!isVideo && isImageFile(v)) {
      const primarySrc = resolveResourceThumb(meta.tableName, v) || v;
      
      let fallbackSrc: string | undefined;
      if (primarySrc.includes('/thumbs/') && primarySrc.startsWith('/uploads/')) {
         fallbackSrc = primarySrc.replace('/thumbs/', '/');
      }

      return (
        <div className="flex items-center gap-2">
          <ThumbnailImage 
            src={primarySrc} 
            alt={field.name} 
            fallbackSrc={fallbackSrc}
            originalSrc={v !== primarySrc ? v : undefined}
          />
          <span className="max-w-[120px] truncate text-xs text-slate-300" title={filename}>
            {filename}
          </span>
        </div>
      );
    }

    if (!isVideo) {
      return (
        <span className="max-w-[120px] truncate text-xs text-slate-300" title={filename}>
          {filename}
        </span>
      );
    }

    // Video Thumbnail (WebP generado en backend)
    const baseName = filename.replace(/\.[^/.]+$/, "");
    const thumbSrc = `${THUMBNAIL_PUBLIC_URL}/${baseName}-thumb.webp`;
    
    return (
      <div className="flex items-center gap-2">
        <ThumbnailImage 
          src={thumbSrc}
          alt={field.name}
          // Fallback a JPG por si existen antiguos
          fallbackSrc={`${THUMBNAIL_PUBLIC_URL}/${baseName}-thumb.jpg`}
        />
        <span className="max-w-[120px] truncate text-xs text-slate-300" title={filename}>
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

  if (field.isForeignKey && field.fkResource) {
    const relationKey = lowerFirst(field.fkResource);
    const relation = row?.[relationKey];
    const label = resolveRelationLabel(relation);
    if (label) {
      return (
        <span className="max-w-[180px] truncate text-[12px] text-slate-100" title={label}>
          {label}
        </span>
      );
    }
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

  // ──────────────── JSON / ARRAY (Tags, Listas) ────────────────
  if (field.type === 'Json') {
    if (!value) return <span className="text-[12px] text-slate-500">—</span>;
    
    // Si es un array de strings (tags, requisitos simples)
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-[12px] text-slate-500">—</span>;
      // Si son strings
      if (typeof value[0] === 'string') {
        const isLongContent =
          field.name === 'queAprenderas' ||
          field.name === 'requisitos' ||
          field.name === 'tags';
        // Si es contenido largo (frases), mostramos solo 1 línea truncada + contador
        if (isLongContent) {
          return (
            <div
              className="flex max-w-[150px] items-center gap-2"
              title={value.join('\n')}
            >
              <span className="truncate rounded border border-slate-700/50 bg-slate-800/50 px-2 py-0.5 text-[11px] text-slate-300">
                • {value[0]}
              </span>
              {value.length > 1 && (
                <span className="shrink-0 text-[10px] font-medium text-slate-500">
                  +{value.length - 1}
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="flex max-w-[200px] flex-wrap gap-1">
            {value.slice(0, 3).map((v: string, i: number) => (
              <span
                key={i}
                className="inline-flex max-w-[120px] truncate items-center rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 ring-1 ring-inset ring-slate-700/20"
                title={v}
              >
                {v}
              </span>
            ))}
            {value.length > 3 && (
              <span className="self-center text-[10px] text-slate-500">
                +{value.length - 3}
              </span>
            )}
          </div>
        );
      }
      // Si son objetos, mostrar cantidad
      return (
        <span className="text-[12px] text-slate-400">
          {value.length} items
        </span>
      );
    }

    // Si es objeto
    if (typeof value === 'object') {
      return (
        <span className="text-[12px] font-mono text-slate-400" title={JSON.stringify(value, null, 2)}>
          {'{...}'}
        </span>
      );
    }
  }

  // ──────────────── DEFAULT ────────────────
  return (
    <span className="max-w-[150px] truncate text-[12px] text-slate-100" title={String(value)}>
      {String(value)}
    </span>
  );
}
