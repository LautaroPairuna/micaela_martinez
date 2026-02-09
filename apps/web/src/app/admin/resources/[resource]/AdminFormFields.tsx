// apps/web/src/app/admin/resources/[resource]/AdminFormFields.tsx
'use client';

import React, {
  useCallback,
  useRef,
  DragEvent,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';
import type { FieldMeta, ResourceMeta } from '@/lib/admin/meta-types';
import { THUMBNAIL_PUBLIC_URL } from '@/lib/adminConstants';
import { Tooltip } from '@/components/ui/Tooltip';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/* ───────────── Constantes de tamaño ───────────── */

const IMAGE_MAX_BYTES = 50 * 1024 * 1024;          // 50 MB
const DOC_MAX_BYTES   = 50 * 1024 * 1024;          // 50 MB
const VIDEO_MAX_BYTES = 8 * 1024 * 1024 * 1024;    // 8 GB

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  }
  return `${mb.toFixed(0)} MB`;
}

/* ───────────── Tipos auxiliares ───────────── */

export type ForeignOption = { id: number | string; label: string };

export function getOptionLabel(row: any): string {
  const rec = row as Record<string, unknown>;
  for (const key of ['titulo', 'nombre', 'name', 'slug', 'codigo', 'id']) {
    if (typeof rec[key] === 'string' && rec[key]) {
      return String(rec[key]);
    }
  }
  return `ID: ${rec['id']}`;
}

/* ───────────── BooleanSwitch (sin descripción) ───────────── */

type BooleanSwitchProps = {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

const BooleanSwitch: React.FC<BooleanSwitchProps> = ({
  label,
  help,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between rounded-md bg-[#101010] px-3 py-2">
    <div className="flex flex-col">
      <span className="text-xs text-slate-100">{label}</span>
      {help && <span className="text-[10px] text-slate-500 mt-0.5">{help}</span>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
        checked
          ? 'border-emerald-500 bg-emerald-500'
          : 'border-[#3a3a3a] bg-[#181818]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-3.5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

/* ───────────── ImageDropzone (50MB máx) ───────────── */

type ImageDropzoneProps = {
  label: string;
  help?: string;
  tableName: string;
  storedValue: string | null | undefined;
  onFileSelected: (file: File | null) => void;
};

const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  label,
  help,
  tableName,
  storedValue,
  onFileSelected,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  let previewSrc: string | undefined;

  if (storedValue) {
    const v = String(storedValue);
    if (v.startsWith('blob:') || v.startsWith('http') || v.startsWith('/')) {
      previewSrc = v;
    } else {
      const thumb = v.replace(/\.webp$/i, '-thumb.webp');
      previewSrc = `${API_BASE}/media/images/uploads/${tableName}/${thumb}`;
    }
  }

  const inputId = `image-${tableName}-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleClickBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const validateImageSize = (file: File): boolean => {
    if (file.size > IMAGE_MAX_BYTES) {
      alert(
        `La imagen supera el límite permitido de ${formatSize(
          IMAGE_MAX_BYTES,
        )}.`,
      );
      return false;
    }
    return true;
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file =
        e.target.files && e.target.files[0] ? e.target.files[0] : null;

      if (!file) {
        onFileSelected(null);
        return;
      }

      if (!validateImageSize(file)) {
        e.target.value = '';
        onFileSelected(null);
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);

      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;

      if (!validateImageSize(file)) {
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-xs font-medium text-slate-100">
          {label}
        </label>
        {help && <Tooltip content={help} />}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors ${
          dragging
            ? 'border-emerald-400 bg-emerald-500/10'
            : 'border-[#2a2a2a] bg-[#101010] hover:border-emerald-500/70'
        }`}
      >
        {/* Preview 1:1 */}
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2 text-[10px] text-slate-500">
              Sin imagen
            </span>
          )}
        </div>

        {/* Texto + botón */}
        <div className="flex flex-col items-center gap-2 text-xs text-slate-300">
          <p className="text-[11px]">
            Arrastrá una imagen aquí o usá el botón para seleccionarla desde tu
            dispositivo.
          </p>
          <button
            type="button"
            onClick={handleClickBrowse}
            className="inline-flex cursor-pointer items-center rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white shadow hover:bg-emerald-500"
          >
            Buscar imagen
          </button>
          <p className="text-[10px] text-slate-500">
            Formatos: JPG, PNG, WebP · tamaño máx. {formatSize(IMAGE_MAX_BYTES)}.
          </p>
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};

/* ───────────── MediaDropzone (video / doc con 2GB / 50MB) ───────────── */

type MediaDropzoneProps = {
  label: string;
  help?: string;
  fileKind?: 'video' | 'document' | 'generic';
  storedValue: string | null | undefined;
  onFileSelected: (file: File | null) => void;
};

const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  label,
  help,
  fileKind = 'generic',
  storedValue,
  onFileSelected,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleClickBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const validateMediaSize = useCallback(
    (file: File): boolean => {
      const mime = file.type;
      const name = file.name.toLowerCase();

      const kind: 'video' | 'document' =
        fileKind === 'generic'
          ? mime.startsWith('video/') ||
            name.endsWith('.mp4') ||
            name.endsWith('.webm') ||
            name.endsWith('.mov')
            ? 'video'
            : 'document'
          : fileKind;

      const limit = kind === 'video' ? VIDEO_MAX_BYTES : DOC_MAX_BYTES;
    if (file.size > limit) {
      const isVideo = limit === VIDEO_MAX_BYTES;
      alert(
        `${isVideo ? 'El video' : 'El archivo'} supera el límite permitido de ${formatSize(limit)}.`,
      );
      return false;
    }
    return true;
    },
    [fileKind],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file =
        e.target.files && e.target.files[0] ? e.target.files[0] : null;

      if (!file) {
        onFileSelected(null);
        return;
      }

      if (!validateMediaSize(file)) {
        e.target.value = '';
        onFileSelected(null);
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected, validateMediaSize],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);

      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;

      if (!validateMediaSize(file)) {
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected, validateMediaSize],
  );

  // Preview básico
  let previewKind: 'video' | 'document' | 'none' =
    fileKind === 'video' ? 'video' : fileKind === 'document' ? 'document' : 'none';
  let previewSrc: string | undefined;

  if (storedValue) {
    const v = String(storedValue);
    const lower = v.toLowerCase();

    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
      previewKind = 'video';
    } else if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx')) {
      previewKind = 'document';
    }

    if (v.startsWith('blob:') || v.startsWith('http') || v.startsWith('/')) {
      previewSrc = v;
    } else {
      if (previewKind === 'video') {
        previewSrc = `${THUMBNAIL_PUBLIC_URL}/${v}`;
      } else if (previewKind === 'document') {
        previewSrc = `${API_BASE}/media/documents/${v}`;
      } else {
        previewSrc = v;
      }
    }
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-xs font-medium text-slate-100">
          {label}
        </label>
        {help && <Tooltip content={help} />}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors ${
          dragging
            ? 'border-emerald-400 bg-emerald-500/10'
            : 'border-[#2a2a2a] bg-[#101010] hover:border-emerald-500/70'
        }`}
      >
        {/* Preview */}
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
          {previewSrc ? (
            previewKind === 'video' ? (
              previewSrc.startsWith('blob:') ? (
                <video
                  src={previewSrc}
                  className="h-full w-full object-cover"
                  muted
                  controls
                  preload="metadata"
                />
              ) : (
                <img
                  src={previewSrc}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                <span className="text-[11px] text-slate-100">Documento</span>
                <span className="break-all text-[9px] text-slate-400">
                  {storedValue}
                </span>
              </div>
            )
          ) : (
            <span className="px-2 text-[10px] text-slate-500">
              Sin archivo
            </span>
          )}
        </div>

        {/* Texto + botón */}
        <div className="flex flex-col items-center gap-2 text-xs text-slate-300">
          <p className="text-[11px]">
            Arrastrá un archivo aquí o usá el botón para seleccionarlo desde tu
            dispositivo.
          </p>
          <button
            type="button"
            onClick={handleClickBrowse}
            className="inline-flex cursor-pointer items-center rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white shadow hover:bg-emerald-500"
          >
            Buscar archivo
          </button>
          <p className="text-[10px] text-slate-500">
            Videos hasta {formatSize(VIDEO_MAX_BYTES)} · documentos hasta{' '}
            {formatSize(DOC_MAX_BYTES)}.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};

/* ───────────── Render de campos ───────────── */

type RenderAdminFieldProps = {
  field: FieldMeta;
  meta: ResourceMeta;
  value: any;
  formValues: Record<string, any>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  imageFiles: Record<string, File | null>;
  setImageFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  fileFiles: Record<string, File | null>;
  setFileFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  fkOptions: Record<string, ForeignOption[]>;
  fkLoading: Record<string, boolean>;
  onChangeField: (
    field: FieldMeta,
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>,
  ) => void;
};

export function renderAdminField({
  field,
  meta,
  value,
  formValues,
  setFormValues,
  imageFiles,
  setImageFiles,
  fileFiles,
  setFileFiles,
  fkOptions,
  fkLoading,
  onChangeField,
}: RenderAdminFieldProps) {
  const label =
    field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1);

  const LabelWithTooltip = () => (
    <div className="flex items-center gap-2 mb-1">
      <label className="block text-xs font-medium text-slate-100">
        {label}
      </label>
      {field.help && <Tooltip content={field.help} />}
    </div>
  );

  /* FK select */
  if (field.isForeignKey && field.fkResource) {
    const options = fkOptions[field.name] ?? [];
    const loading = fkLoading[field.name];

    return (
      <div key={field.name} className="space-y-1 md:col-span-2">
        <LabelWithTooltip />
        <div className="relative group">
          <select
            className="w-full appearance-none rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100 transition-colors hover:border-[#444] focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none pr-8"
            value={value ?? ''}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                [field.name]:
                  field.type === 'Int'
                    ? Number(e.target.value) || null
                    : e.target.value,
              }))
            }
            disabled={loading}
            style={{ colorScheme: 'dark' }}
          >
            <option value="">
              {loading ? 'Cargando opciones...' : 'Seleccionar…'}
            </option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none group-hover:text-slate-400 transition-colors" />
        </div>
        <p className="text-[10px] text-slate-500">
          Recurso relacionado: <code>{field.fkResource}</code>
        </p>
      </div>
    );
  }

  /* Imagen */
  if (field.isImage) {
    const stored = formValues[field.name] as string | null | undefined;

    return (
      <ImageDropzone
        key={field.name}
        label={label}
        help={field.help}
        tableName={meta.tableName}
        storedValue={stored}
        onFileSelected={(file) => {
          setImageFiles((prev) => ({
            ...prev,
            [field.name]: file,
          }));

          if (file) {
            const objectUrl = URL.createObjectURL(file);
            setFormValues((prev) => ({
              ...prev,
              [field.name]: objectUrl,
            }));
          } else {
            setFormValues((prev) => ({
              ...prev,
              [field.name]: '',
            }));
          }
        }}
      />
    );
  }

  /* Archivo genérico (video / doc) */
  if (field.isFile) {
    const stored = formValues[field.name] as string | null | undefined;

    return (
      <MediaDropzone
        key={field.name}
        label={label}
        help={field.help}
        fileKind={field.fileKind as any}
        storedValue={stored}
        onFileSelected={(file) => {
          setFileFiles((prev) => ({
            ...prev,
            [field.name]: file,
          }));

          if (file) {
            const objectUrl = URL.createObjectURL(file);
            setFormValues((prev) => ({
              ...prev,
              [field.name]: objectUrl,
            }));
          } else {
            setFormValues((prev) => ({
              ...prev,
              [field.name]: '',
            }));
          }
        }}
      />
    );
  }

  /* Boolean → switch sin descripción */
  if (field.type === 'Boolean') {
    const checked = Boolean(value);
    return (
      <BooleanSwitch
        key={field.name}
        label={label}
        help={field.help}
        checked={checked}
        onChange={(val) =>
          setFormValues((prev) => ({
            ...prev,
            [field.name]: val,
          }))
        }
      />
    );
  }

  /* Enum */
  if (field.isEnum && field.enumValues?.length) {
    return (
      <div key={field.name} className="space-y-1">
        <LabelWithTooltip />
        <div className="relative group">
          <select
            className="w-full appearance-none rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100 transition-colors hover:border-[#444] focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none pr-8"
            value={value ?? ''}
            onChange={(e) => onChangeField(field, e as any)}
            style={{ colorScheme: 'dark' }}
          >
            <option value="">—</option>
            {field.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    );
  }

  /* DateTime */
  if (field.type === 'DateTime') {
    return (
      <div key={field.name} className="space-y-1">
        <LabelWithTooltip />
        <input
          type="datetime-local"
          className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100"
          value={value ?? ''}
          onChange={(e) => onChangeField(field, e as any)}
        />
      </div>
    );
  }

  /* Json */
  if (field.type === 'Json') {
    return (
      <div key={field.name} className="space-y-1 md:col-span-2">
        <LabelWithTooltip />
        <textarea
          className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-xs text-slate-100"
          rows={4}
          value={value ?? ''}
          onChange={(e) => onChangeField(field, e as any)}
        />
        <p className="text-[10px] text-slate-500">
          JSON válido. Ej: {'{"foo":"bar"}'}
        </p>
      </div>
    );
  }

  /* Texto largo */
  const isLongText =
    field.name.toLowerCase().includes('descripcion') ||
    field.name.toLowerCase().includes('resumen') ||
    field.name.toLowerCase().includes('comentario');

  if (isLongText) {
    return (
      <div key={field.name} className="space-y-1 md:col-span-2">
        <LabelWithTooltip />
        <textarea
          className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-xs text-slate-100"
          rows={4}
          value={value ?? ''}
          onChange={(e) => onChangeField(field, e as any)}
        />
      </div>
    );
  }

  /* Default (texto / número) */
  const inputType =
    field.type === 'Int' || field.type === 'Decimal' ? 'number' : 'text';

  return (
    <div key={field.name} className="space-y-1">
      <LabelWithTooltip />
      <input
        type={inputType}
        className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100"
        value={value ?? ''}
        onChange={(e) => onChangeField(field, e as any)}
      />
    </div>
  );
}
