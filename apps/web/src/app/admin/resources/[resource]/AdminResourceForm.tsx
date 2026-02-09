// apps/web/src/app/admin/resources/[resource]/AdminResourceForm.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  FormEvent,
} from 'react';
import { Timer, Loader2 } from 'lucide-react';
import type { ResourceMeta, FieldMeta } from '@/lib/admin/meta-types';
import {
  renderAdminField,
  type ForeignOption,
  getOptionLabel,
} from './AdminFormFields';
import { useAdminToast } from '@/contexts/AdminToastContext';
import { buildZodSchemaFromFields } from '@/lib/admin/validation';
import { io, type Socket } from 'socket.io-client';
import { AdminRichTextEditor } from './AdminRichTextEditor';
import { QuizBuilder, type QuizQuestion } from './QuizBuilder';
import { Tooltip } from '@/components/ui/Tooltip'; // 👈 NUEVO

const getApiBase = () => {
  // 1. Si hay una URL base explícita pública, usarla
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL;
    const base = url.replace(/\/+$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }

  // 2. En el cliente (navegador), usar SIEMPRE '/api' relativo para:
  //    a) Aprovechar el Proxy de Next.js (evita CORS).
  //    b) Usar la sesión/cookies del dominio actual.
  //    c) Evitar errores con URLs internas de Docker (ej. http://api:3001) inalcanzables desde fuera.
  if (typeof window !== 'undefined') {
    return '/api';
  }

  // 3. Fallback (SSR o entornos raros): intentar usar la URL pública o default
  const url = process.env.NEXT_PUBLIC_API_URL || '/api';
  const base = url.replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

const API_BASE = getApiBase();

export type FormMode = 'create' | 'edit';

export interface AdminResourceFormProps {
  open: boolean;
  mode: FormMode;
  meta: ResourceMeta;
  resource: string;
  currentRow: any | null;
  onClose: () => void;
  onSaved: (row: any, mode: FormMode) => void;
  hideUploads?: boolean;
}

/* ───────────── Tipos auxiliares FK ───────────── */

type FkOptionsState = Record<string, ForeignOption[]>;
type FkLoadingState = Record<string, boolean>;

type VideoStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

type LessonFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'json'
  | 'url'
  | 'richtext'
  | 'quiz';

type LessonFieldSchema = {
  key: string;
  label: string;
  type: LessonFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
  default?: unknown;
};

type LessonFormSchema = {
  version: number;
  title?: string;
  fields: LessonFieldSchema[];
};

/* ───────────── Componente principal ───────────── */

export function AdminResourceForm({
  open,
  mode,
  meta,
  resource,
  currentRow,
  onClose,
  onSaved,
  hideUploads,
}: AdminResourceFormProps) {
  const { showToast } = useAdminToast();

  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [lessonFormSchema, setLessonFormSchema] = useState<LessonFormSchema | null>(null);
  const [lessonFormLoading, setLessonFormLoading] = useState(false);

  // Imágenes (campos isImage)
  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  // Archivos genéricos (campos isFile: videos/docs)
  const [fileFiles, setFileFiles] = useState<Record<string, File | null>>({});

  const [fkOptions, setFkOptions] = useState<FkOptionsState>({});
  const [fkLoading, setFkLoading] = useState<FkLoadingState>({});

  // ───────── VIDEO PROGRESS (WebSocket) ─────────
  const [clientId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_upload_client_id');
      if (stored) return stored;
    }
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  });

  const [videoStatus, setVideoStatus] = useState<VideoStatus>('idle');
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [videoStage, setVideoStage] = useState<string | null>(null);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string | null>(
    null,
  );

  const [videoUploadStartedAtMs, setVideoUploadStartedAtMs] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_upload_start_time');
      if (stored) return Number(stored);
    }
    return null;
  });
  const [videoUploadElapsedMs, setVideoUploadElapsedMs] = useState(0);

  // Nuevo estado para imágenes
  const [imageStatus, setImageStatus] = useState<string | null>(null);

  const formatElapsed = useCallback((elapsedMs: number): string => {
    const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
        seconds,
      ).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  // Timer effect
  useEffect(() => {
    if (!videoUploadStartedAtMs) {
      setVideoUploadElapsedMs(0);
      return;
    }

    // Update inmediato
    setVideoUploadElapsedMs(Date.now() - videoUploadStartedAtMs);

    const intervalId = window.setInterval(() => {
      setVideoUploadElapsedMs(Date.now() - videoUploadStartedAtMs);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [videoUploadStartedAtMs]);

  const clearUploadSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_upload_client_id');
      sessionStorage.removeItem('admin_upload_start_time');
    }
    setVideoUploadStartedAtMs(null);
    setVideoStatus('idle');
    setVideoProgress(null);
    setVideoStage(null);
  }, []);

  const handleClose = useCallback(() => {
    // Si cerramos el modal explícitamente, limpiamos la sesión de upload
    // para que no aparezca en la próxima apertura.
    // Nota: Si el usuario solo recarga la página, handleClose no se llama,
    // preservando la sesión.
    if (videoStatus !== 'uploading' && videoStatus !== 'processing') {
       clearUploadSession();
    }
    // Si está subiendo y cierra, decidimos si limpiar o dejar en background.
    // Por UX simple, si cierra el modal, asumimos que "descarta" ver el progreso,
    // aunque el server siga. Limpiamos para evitar estado corrupto al reabrir.
    clearUploadSession();
    onClose();
  }, [onClose, videoStatus, clearUploadSession]);

  useEffect(() => {
    // Si estamos en el servidor, no conectar sockets
    if (typeof window === 'undefined') return;

    // Calcular la ruta del socket
    // Si estamos en dev local: http://localhost:3000 -> path: /socket.io
    // Si estamos en prod: https://midominio.com -> path: /socket.io (vía proxy next)
    
    // NOTA: No usamos API_BASE para el path del socket, sino que dejamos que socket.io-client
    // infiera el host actual (window.location.host) y solo especificamos el path '/socket.io'
    // que Next.js redirige al backend.
    
    // IMPORTANTE: El namespace '/video-progress' es parte del protocolo de conexión, no de la URL HTTP inicial.
    // socket.io-client url: "/" (conecta al mismo host del frontend)
    // path: "/socket.io" (default)
    
    /* 
       ESTRATEGIA FINAL SOCKET.IO:
       Usar path relativo para que el navegador use el mismo host/puerto que la web.
       Next.js next.config.ts ya tiene el rewrite:
       source: '/socket.io/:path*' -> destination: 'BACKEND/socket.io/:path*'
    */

    const progressSocket = io('/video-progress', {
        path: '/socket.io',
        transports: ['polling'], // 👈 FORZAR POLLING: más lento pero atraviesa todos los proxies/firewalls
        withCredentials: true,
        query: { clientId },
        reconnectionAttempts: 10,
        upgrade: false, // Evitar intentar upgrade a websocket si polling funciona (estabilidad > velocidad aquí)
    });

    progressSocket.on('connect', () => {
      // console.log('WS video-progress conectado', clientId);
    });

    progressSocket.on(
      'video-progress',
      (payload: { clientId: string; percent: number }) => {
        if (payload.clientId !== clientId) return;
        setVideoStatus('processing');
        setVideoProgress(Number(payload.percent));
        
        setVideoUploadStartedAtMs((prev) => {
          if (prev) return prev;
          if (typeof window !== 'undefined') {
             const stored = sessionStorage.getItem('admin_upload_start_time');
             if (stored) return Number(stored);
          }
          return Date.now();
        });
      },
    );

    progressSocket.on('video-stage', (payload: { clientId: string; stage: string }) => {
      if (payload.clientId !== clientId) return;
      setVideoStage(payload.stage);
      setVideoProgress(0); 
    });

    progressSocket.on('video-done', (payload: { clientId: string }) => {
      if (payload.clientId !== clientId) return;
      setVideoStatus('done');
      setVideoProgress(100);
      sessionStorage.removeItem('admin_upload_client_id');
      sessionStorage.removeItem('admin_upload_start_time');
      
      showToast({
        variant: 'success',
        title: 'Video procesado correctamente',
      });
      onClose();
    });

    progressSocket.on(
      'video-error',
      (payload: { clientId: string; error?: string }) => {
        if (payload.clientId !== clientId) return;
        setVideoStatus('error');
        const errorMessage = payload.error || 'Error al procesar el video.';
        setVideoStatusMessage(errorMessage);
        sessionStorage.removeItem('admin_upload_client_id');
        sessionStorage.removeItem('admin_upload_start_time');

        showToast({ 
          variant: 'error',
          title: 'Error en procesamiento',
          message: errorMessage,
        });
      },
    );

    progressSocket.on('disconnect', () => {
      // opcional
    });

    return () => {
      progressSocket.disconnect();
    };
  }, [clientId, onClose, showToast]);

  // Campos de formulario alineados con el backend:
  const formFields: FieldMeta[] = useMemo(
    () =>
      meta.fields.filter(
        (f) => f.showInForm && !f.isId && !f.isParentChildCount,
      ),
    [meta],
  );

  const hasEditor = formFields.length > 0;
  const isLessonResource =
    meta.tableName === 'leccion' || meta.name === 'Leccion' || resource === 'leccion';

  // Lógica dinámica para ocultar uploads en TEXTO/QUIZ
  const shouldHideUploads = useMemo(() => {
    if (hideUploads) return true;
    if (!isLessonResource) return false;
    
    const t = String(formValues.tipo ?? '').toUpperCase();
    // Ajustar según los valores reales de tu enum o strings
    return t === 'TEXTO' || t === 'QUIZ';
  }, [hideUploads, isLessonResource, formValues.tipo]);

  // Schema Zod construido desde FieldMeta
  const schema = useMemo(
    () => buildZodSchemaFromFields(meta.fields),
    [meta.fields],
  );

  /* ───────────── Inicializar valores al abrir ───────────── */

  useEffect(() => {
    if (!open || !hasEditor) return;

    const initial: Record<string, any> = {};
    const initialImages: Record<string, File | null> = {};
    const initialFiles: Record<string, File | null> = {};

    if (mode === 'edit' && currentRow) {
      for (const field of formFields) {
        const v = currentRow[field.name];

        if (field.isImage) {
          initialImages[field.name] = null;
        }
        if (field.isFile) {
          initialFiles[field.name] = null;
        }

        if (field.type === 'DateTime' && v) {
          const d = new Date(v);
          const local = new Date(
            d.getTime() - d.getTimezoneOffset() * 60_000,
          )
            .toISOString()
            .slice(0, 16); // yyyy-MM-ddTHH:mm
          initial[field.name] = local;
        } else if (field.type === 'Json') {
          if (isLessonResource && field.name === 'contenido') {
            initial[field.name] = v ?? {};
          } else if (v) {
            initial[field.name] = JSON.stringify(v, null, 2);
          } else {
            initial[field.name] = '';
          }
        } else if (field.type === 'Boolean') {
          initial[field.name] = Boolean(v);
        } else {
          initial[field.name] = v ?? '';
        }
      }
    } else {
      // create
      for (const field of formFields) {
        if (field.isImage) {
          initialImages[field.name] = null;
        }
        if (field.isFile) {
          initialFiles[field.name] = null;
        }

        if (field.type === 'Boolean') initial[field.name] = false;
        else if (field.type === 'Json' && isLessonResource && field.name === 'contenido') {
          initial[field.name] = {};
        } else initial[field.name] = '';
      }
    }

    setFormValues(initial);
    setImageFiles(initialImages);
    setFileFiles(initialFiles);

    // reset estado de video al abrir
    setVideoStatus('idle');
    setVideoProgress(null);
    setVideoStatusMessage(null);
  }, [open, mode, currentRow, formFields, hasEditor, isLessonResource]);

  useEffect(() => {
    if (!open || !isLessonResource) return;
    const rawTipo = formValues.tipo;
    const tipo = typeof rawTipo === 'string' ? rawTipo.trim() : '';
    if (!tipo) {
      setLessonFormSchema(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLessonFormLoading(true);
      
      let lastError: unknown = null;
      let success = false;
      let json: any = null;

      // Retry logic (3 intentos)
      for (let i = 0; i < 3; i++) {
        if (cancelled) return;
        try {
          const res = await fetch(
            `${API_BASE}/admin/lesson-form-config/${encodeURIComponent(tipo)}`,
            { credentials: 'include' },
          );
          
          if (!res.ok) {
            if (res.status === 404) {
              // No existe config, es válido (null schema)
              success = true;
              break;
            }
            // Si es error de servidor, lanzamos para reintentar
            if (res.status >= 500) {
              throw new Error(`Error ${res.status}`);
            }
            // Errores 4xx (salvo 404) no se reintentan
            throw new Error(`Error cliente: ${res.status}`);
          }
          
          json = await res.json();
          success = true;
          break; // Éxito
        } catch (err) {
          lastError = err;
          // Si no es el último intento, esperamos
          if (i < 2) {
             const delay = 500 * Math.pow(2, i); // 500, 1000
             await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      if (cancelled) return;

      if (success) {
        setLessonFormSchema(json?.schema ?? null);
      } else {
        setLessonFormSchema(null);
        showToast({
          variant: 'error',
          title: 'Error cargando formulario dinámico',
          message: lastError instanceof Error ? lastError.message : 'Error de conexión',
        });
      }
      setLessonFormLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, isLessonResource, formValues.tipo, showToast]);

  /* ───────────── Carga de opciones FK ───────────── */

  useEffect(() => {
    if (!open) return;

    const fkScalarFields = meta.fields.filter(
      (f) => f.isForeignKey && f.fkResource,
    );

    fkScalarFields.forEach((field) => {
      void loadFkOptions(field);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, meta.name]);

  const loadFkOptions = useCallback(
    async (field: FieldMeta) => {
      if (!field.isForeignKey || !field.fkResource) return;

      setFkLoading((prev) => ({ ...prev, [field.name]: true }));
      try {
        const fkResourceTable = field.fkResource.toLowerCase();

        const res = await fetch(
          `${API_BASE}/admin/resources/${fkResourceTable}?pageSize=200`,
          {
            credentials: 'include',
          },
        );

        if (!res.ok) {
          console.error(
            `Error al cargar FKs para ${field.name}: ${res.status}`,
          );
          return;
        }

        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : json;

        const opts: ForeignOption[] = items.map((row: any) => ({
          id: row.id,
          label: getOptionLabel(row),
        }));

        setFkOptions((prev) => ({
          ...prev,
          [field.name]: opts,
        }));
      } catch (error) {
        console.error('Error cargando opciones FK', error);
      } finally {
        setFkLoading((prev) => ({ ...prev, [field.name]: false }));
      }
    },
    [],
  );

  /* ───────────── Cambio genérico de campos ───────────── */

  const handleChangeField = useCallback(
    (
      field: FieldMeta,
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLSelectElement>,
    ) => {
      const target = e.target as HTMLInputElement;
      const { value, type, checked, files } = target;

      // Imagen → la maneja el ImageDropzone, pero dejamos este path por si usamos <input type="file">
      if (field.isImage && type === 'file') {
        const file = files && files[0] ? files[0] : null;

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
        }

        return;
      }

      // Boolean → checkbox
      if (field.type === 'Boolean' || type === 'checkbox') {
        const newValue = checked;
        setFormValues((prev) => ({
          ...prev,
          [field.name]: newValue,
        }));
        return;
      }

      // Default
      setFormValues((prev) => ({
        ...prev,
        [field.name]: value,
      }));
    },
    [],
  );

  const updateContenidoField = useCallback(
    (key: string, value: unknown) => {
      setFormValues((prev) => {
        const current = prev.contenido;
        const base =
          current && typeof current === 'object' && !Array.isArray(current)
            ? (current as Record<string, unknown>)
            : {};
        return {
          ...prev,
          contenido: {
            ...base,
            [key]: value,
          },
        };
      });
    },
    [],
  );

  const renderLessonField = useCallback(
    (field: LessonFieldSchema) => {
      const current = formValues.contenido;
      const contenido =
        current && typeof current === 'object' && !Array.isArray(current)
          ? (current as Record<string, unknown>)
          : {};
      const fallback = field.default ?? (field.type === 'boolean' ? false : '');
      let value = contenido[field.key];
      
      // Fallback para estructura anidada en 'data' (legacy/unificada)
      if (value === undefined && contenido.data && typeof contenido.data === 'object') {
        value = (contenido.data as Record<string, unknown>)[field.key];
      }
      
      value = value ?? fallback;
      const inputId = `lesson-${field.key}`;

      const LabelWithTooltip = () => (
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-xs font-medium text-slate-100" htmlFor={inputId}>
            {field.label}
          </label>
          {field.help && <Tooltip content={field.help} />}
        </div>
      );

      if (field.type === 'richtext') {
        return (
          <div key={field.key} className="space-y-1 md:col-span-2">
            <LabelWithTooltip />
            <AdminRichTextEditor
              value={String(value ?? '')}
              onChange={(val) => updateContenidoField(field.key, val)}
              placeholder={field.placeholder}
            />
          </div>
        );
      }

      if (field.type === 'quiz') {
        return (
          <div key={field.key} className="space-y-1 md:col-span-2">
            <LabelWithTooltip />
            <QuizBuilder
              value={(value as QuizQuestion[]) || []}
              onChange={(val) => updateContenidoField(field.key, val)}
            />
          </div>
        );
      }

      if (field.type === 'textarea') {
        return (
          <div key={field.key} className="space-y-1 md:col-span-2">
            <LabelWithTooltip />
            <textarea
              id={inputId}
              className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-xs text-slate-100"
              rows={4}
              value={String(value ?? '')}
              placeholder={field.placeholder}
              onChange={(e) => updateContenidoField(field.key, e.target.value)}
            />
          </div>
        );
      }

      if (field.type === 'boolean') {
        return (
          <div key={field.key} className="flex items-center justify-between rounded-md bg-[#101010] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-100">{field.label}</span>
              {field.help && <Tooltip content={field.help} />}
            </div>
            <button
              type="button"
              onClick={() => updateContenidoField(field.key, !Boolean(value))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                Boolean(value)
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-[#3a3a3a] bg-[#181818]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  Boolean(value) ? 'translate-x-3.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
      }

      if (field.type === 'select') {
        return (
          <div key={field.key} className="space-y-1">
            <LabelWithTooltip />
            <div className="relative group">
              <select
                id={inputId}
                className="w-full appearance-none rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100 transition-colors hover:border-[#444] focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none pr-8"
                value={String(value ?? '')}
                onChange={(e) => updateContenidoField(field.key, e.target.value)}
                style={{ colorScheme: 'dark' }}
              >
                <option value="">—</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      }

      if (field.type === 'number') {
        return (
          <div key={field.key} className="space-y-1">
            <LabelWithTooltip />
            <input
              id={inputId}
              type="number"
              className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100"
              value={value === '' || value === null || value === undefined ? '' : String(value)}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              onChange={(e) => updateContenidoField(field.key, e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        );
      }

      if (field.type === 'json') {
        const raw = typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2);
        return (
          <div key={field.key} className="space-y-1 md:col-span-2">
            <LabelWithTooltip />
            <textarea
              id={inputId}
              className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-xs text-slate-100"
              rows={4}
              value={raw}
              onChange={(e) => {
                const text = e.target.value;
                try {
                  updateContenidoField(field.key, JSON.parse(text));
                } catch {
                  updateContenidoField(field.key, text);
                }
              }}
            />
          </div>
        );
      }

      return (
        <div key={field.key} className="space-y-1">
          <LabelWithTooltip />
          <input
            id={inputId}
            type={field.type === 'url' ? 'url' : 'text'}
            className="w-full rounded-md border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-slate-100"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => updateContenidoField(field.key, e.target.value)}
          />
        </div>
      );
    },
    [formValues.contenido, updateContenidoField],
  );

  /* ───────────── Normalizar valores antes de enviar ───────────── */

  function normalizeValue(field: FieldMeta, raw: any) {
    if (raw === '' || raw === null || raw === undefined) {
      return field.isRequired ? null : null;
    }

    switch (field.type) {
      case 'Int':
        return Number.isNaN(Number(raw)) ? null : Number(raw);
      case 'Decimal':
        return Number.isNaN(Number(raw)) ? null : raw.toString();
      case 'Boolean':
        return Boolean(raw);
      case 'DateTime': {
        const s = String(raw);
        if (!s) return null;
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString();
      }
      case 'Json':
        if (raw && typeof raw === 'object') return raw;
        try {
          return JSON.parse(String(raw));
        } catch {
          return null;
        }
      default:
        return raw;
    }
  }

  /* ───────────── Helpers para detectar si un File es video ───────────── */

  function isVideoFile(field: FieldMeta, file: File | null): boolean {
    if (!file) return false;
    if (field.fileKind === 'video') return true;
    if (file.type.startsWith('video/')) return true;
    const name = file.name.toLowerCase();
    if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov')) {
      return true;
    }
    return false;
  }

  /* ───────────── Submit ───────────── */

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!hasEditor || isSaving) return;

      try {
        setIsSaving(true);
        setVideoStatus('idle');
        setVideoProgress(null);
        setVideoStatusMessage(null);

        // 1) Armar payload ESCALAR (sin imágenes/archivos)
        const payload: Record<string, any> = {};

        for (const field of formFields) {
          if (field.isImage || field.isFile) continue;

          payload[field.name] = normalizeValue(
            field,
            formValues[field.name],
          );
        }

        // 2) Validar con Zod (mismas reglas que el backend)
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          const path = first.path.join('.') || 'formulario';
          showToast({
            variant: 'error',
            title: 'Revisá los datos',
            message: `${path}: ${first.message}`,
          });
          setIsSaving(false);
          return;
        }

        const baseUrl = `${API_BASE}/admin/resources/${resource}`;
        const url =
          mode === 'edit' && currentRow?.id
            ? `${baseUrl}/${currentRow.id}`
            : baseUrl;

        const method = mode === 'edit' ? 'PATCH' : 'POST';

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(parsed.data),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Error ${
              mode === 'edit' ? 'actualizando' : 'creando'
            }: ${res.status} ${text}`,
          );
        }

        const saved = await res.json();

        if (!saved || saved.id == null) {
          throw new Error('El recurso guardado no tiene un ID válido.');
        }

        let currentItem = saved;

        // 3) Subir imágenes y archivos genéricos (si los hay)
        for (const field of formFields) {
          if (!field.isImage && !field.isFile) continue;

          // Si debemos ocultar uploads (ej. lección texto/quiz), saltamos
          if (shouldHideUploads && field.isFile && !field.isImage) continue;

          const file = field.isImage
            ? imageFiles[field.name]
            : fileFiles[field.name];

          if (!file) continue;

          const isVideo = field.isFile && isVideoFile(field, file);

          if (isVideo) {
            setVideoStatus('uploading');
            setVideoStatusMessage(`Subiendo video (${file.name})...`);
            setVideoProgress(0);
            // Persistir sesión de upload
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('admin_upload_client_id', clientId);
              sessionStorage.setItem('admin_upload_start_time', Date.now().toString());
            }
          }

          const uploadUrlBase = `${API_BASE}/admin/resources/${resource}/${saved.id}/upload/${field.name}`;

          const mb = 1024 * 1024;
          const rawChunkMb = Number(process.env.NEXT_PUBLIC_UPLOAD_CHUNK_MB ?? '10');
          const safeChunkMb = Number.isFinite(rawChunkMb) ? rawChunkMb : 10;
          const boundedChunkMb = Math.min(10, Math.max(1, safeChunkMb));
          const rawMinChunkMb = Number(process.env.NEXT_PUBLIC_UPLOAD_MIN_CHUNK_MB ?? '5');
          const safeMinChunkMb = Number.isFinite(rawMinChunkMb) ? rawMinChunkMb : 5;
          const boundedMinChunkMb = Math.min(boundedChunkMb, Math.max(1, safeMinChunkMb));
          const CHUNK_SIZE = Math.round(boundedChunkMb * mb);
          const MIN_CHUNK_SIZE = Math.round(boundedMinChunkMb * mb);
          const stateKey = `admin_upload_state_${resource}_${saved.id}_${field.name}`;
          const fileFingerprint = `${file.name}:${file.size}:${file.lastModified}`;
          let uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
          let resumeFrom = 0;
          let uploadJson: any;

          if (file.size <= CHUNK_SIZE) {
            // Subida normal (directa)
            const uploadUrl = clientId
              ? `${uploadUrlBase}?clientId=${encodeURIComponent(clientId)}`
              : uploadUrlBase;

            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch(uploadUrl, {
              method: 'POST',
              body: formData,
              credentials: 'include',
            });

            if (!uploadRes.ok) {
              const text = await uploadRes.text();
              throw new Error(
                `Error subiendo archivo para ${field.name}: ${uploadRes.status} ${text}`,
              );
            }
            uploadJson = await uploadRes.json();
          } else {
            if (typeof window !== 'undefined') {
              const rawState = sessionStorage.getItem(stateKey);
              if (rawState) {
                try {
                  const parsed = JSON.parse(rawState) as {
                    uploadId: string;
                    chunkSize: number;
                    totalChunks: number;
                    nextChunkIndex: number;
                    fileFingerprint: string;
                    updatedAt: number;
                  };
                  const totalChunksNow = Math.ceil(file.size / CHUNK_SIZE);
                  const isFresh = Date.now() - parsed.updatedAt < 6 * 60 * 60 * 1000;
                  if (
                    isFresh &&
                    parsed.fileFingerprint === fileFingerprint &&
                    parsed.chunkSize === CHUNK_SIZE &&
                    parsed.totalChunks === totalChunksNow &&
                    parsed.nextChunkIndex > 0 &&
                    parsed.nextChunkIndex < totalChunksNow
                  ) {
                    uploadId = parsed.uploadId;
                    resumeFrom = parsed.nextChunkIndex;
                  } else {
                    sessionStorage.removeItem(stateKey);
                  }
                } catch {
                  sessionStorage.removeItem(stateKey);
                }
              }
            }

            const saveState = (nextChunkIndex: number, chunkSize: number, totalChunks: number) => {
              if (typeof window === 'undefined') return;
              sessionStorage.setItem(
                stateKey,
                JSON.stringify({
                  uploadId,
                  chunkSize,
                  totalChunks,
                  nextChunkIndex,
                  fileFingerprint,
                  updatedAt: Date.now(),
                }),
              );
            };

            const clearState = () => {
              if (typeof window === 'undefined') return;
              sessionStorage.removeItem(stateKey);
            };

            const chunkedUpload = async (
              chunkSize: number,
              startIndex: number,
              totalChunksOverride?: number,
            ) => {
              const totalChunks = totalChunksOverride ?? Math.ceil(file.size / chunkSize);
              for (let i = startIndex; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('file', chunk, file.name);

                const query = new URLSearchParams({
                  clientId,
                  chunkIndex: i.toString(),
                  totalChunks: totalChunks.toString(),
                  uploadId,
                  originalName: file.name,
                });

                const chunkUrl = `${uploadUrlBase}?${query.toString()}`;

                let attempts = 0;
                let success = false;
                let lastError: unknown;

                while (attempts < 3 && !success) {
                  try {
                    const chunkRes = await fetch(chunkUrl, {
                      method: 'POST',
                      body: formData,
                      credentials: 'include',
                    });
                    if (!chunkRes.ok) {
                      const txt = await chunkRes.text();
                      throw new Error(`Chunk error: ${chunkRes.status} ${txt}`);
                    }
                    if (i === totalChunks - 1) {
                      uploadJson = await chunkRes.json();
                    }
                    success = true;

                    const pct = Math.round(((i + 1) / totalChunks) * 100);
                    setVideoProgress(pct);
                    setVideoStatusMessage(
                      `Subiendo parte ${i + 1} de ${totalChunks}...`,
                    );
                    saveState(i + 1, chunkSize, totalChunks);
                  } catch (e) {
                    lastError = e;
                    attempts++;
                    await new Promise((r) => setTimeout(r, 1000 * attempts));
                  }
                }

                if (!success) {
                  throw new Error(
                    `Falló chunk ${i + 1}/${totalChunks} (${field.name}): ${lastError}`,
                  );
                }
              }
              clearState();
            };

            try {
              const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
              await chunkedUpload(CHUNK_SIZE, resumeFrom, totalChunks);
            } catch (err) {
              if (CHUNK_SIZE > MIN_CHUNK_SIZE) {
                setVideoStatusMessage(
                  'Detectamos inestabilidad en el proxy. Reintentando con 5MB...'
                );
                if (typeof window !== 'undefined') sessionStorage.removeItem(stateKey);
                uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
                await chunkedUpload(MIN_CHUNK_SIZE, 0);
              } else {
                throw err;
              }
            }
          }

          // Si el backend responde "processing", es que es un video en background
          if (uploadJson?.status === 'processing') {
            setVideoStatus('processing');
            // NO cerramos el modal si está procesando
            // Solo actualizamos currentItem si trae algo útil
            if (uploadJson.item) {
              currentItem = uploadJson.item;
            }
            continue; // Pasamos al siguiente campo (si hubiera)
          }

          if (uploadJson?.item) {
            currentItem = uploadJson.item;
          }
        }

        // Si hay video procesando, NO cerramos
        if (videoStatus === 'processing' || videoStatus === 'uploading') {
           showToast({
            variant: 'info',
            title: 'Procesando video',
            message: 'El video se está procesando en segundo plano. No cierres esta ventana.',
          });
          // Forzamos "onSaved" parcial para refrescar la grilla de fondo si se desea,
          // pero mantenemos el modal abierto.
          onSaved(currentItem, mode);
        } else {
          onSaved(currentItem, mode);

          showToast({
            variant: 'success',
            title:
              mode === 'edit'
                ? `${meta.displayName} actualizado`
                : `${meta.displayName} creado`,
          });

          onClose();
        }
      } catch (err) {
        console.error(err);
        showToast({
          variant: 'error',
          title: 'Error al guardar',
          message:
            err instanceof Error ? err.message : 'Error desconocido',
        });
        setVideoStatus('error');
        if (err instanceof Error && !videoStatusMessage) {
          setVideoStatusMessage(err.message);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [
      hasEditor,
      isSaving,
      formFields,
      formValues,
      imageFiles,
      fileFiles,
      mode,
      currentRow,
      resource,
      onSaved,
      onClose,
      showToast,
      meta.displayName,
      schema,
      clientId,
      videoStatusMessage,
      shouldHideUploads,
      videoStatus,
    ],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg border border-slate-800 bg-[#181818] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              {mode === 'edit'
                ? `Editar ${meta.displayName}`
                : `Nuevo ${meta.displayName}`}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Recurso: <code>{meta.name}</code> · tabla{' '}
              <code>{meta.tableName}</code>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-slate-200 hover:bg-black/70"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        {hasEditor ? (
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[70vh] flex-col"
          >
            {/* Campos */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                {formFields.map((field) => {
                  // Ocultar si shouldHideUploads está activo y NO es imagen (o sea, es video/doc)
                  if (shouldHideUploads && field.isFile && !field.isImage) {
                    return null;
                  }

                  if (
                    isLessonResource &&
                    field.name === 'contenido' &&
                    lessonFormSchema?.fields?.length
                  ) {
                    return (
                      <div key={field.name} className="md:col-span-2 space-y-3">
                        {lessonFormLoading ? (
                          <div className="text-xs text-slate-400">Cargando formulario…</div>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-2">
                          {lessonFormSchema.fields.map((f) => renderLessonField(f))}
                        </div>
                      </div>
                    );
                  }

                  return renderAdminField({
                    field,
                    meta,
                    value: formValues[field.name],
                    formValues,
                    setFormValues,
                    imageFiles,
                    setImageFiles,
                    fileFiles,
                    setFileFiles,
                    fkOptions,
                    fkLoading,
                    onChangeField: handleChangeField,
                  });
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 border-t border-slate-800 px-5 py-3 md:flex-row md:items-center md:justify-between">
              {/* Barra de progreso de video */}
              <div className="flex flex-1 flex-col gap-1 text-[11px] text-slate-300">
                {videoStatus !== 'idle' && (
                  <>
                    {videoStatus === 'uploading' && (
                      <div className="flex flex-col gap-1 text-emerald-400">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            {videoStatusMessage ?? 'Subiendo archivo al servidor...'}
                          </span>
                        </div>
                        {/* Barra de progreso de subida */}
                        {typeof videoProgress === 'number' && (
                           <div className="flex items-center gap-1 mt-1">
                              <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-700">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                  style={{ width: `${videoProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] tabular-nums text-slate-400">{videoProgress}%</span>
                           </div>
                        )}
                      </div>
                    )}

                    {videoStatus === 'processing' && (
                      <div className="flex items-center gap-2">
                        <span>
                          {videoStage === 'generating_assets'
                            ? 'Generando assets (thumbnails, VTT)…'
                            : videoStage === 'compressing'
                            ? 'Comprimiendo video…'
                            : 'Procesando video…'}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    typeof videoProgress === 'number'
                                      ? videoProgress
                                      : 0,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="tabular-nums flex-shrink-0">
                            {(typeof videoProgress === 'number'
                              ? videoProgress
                              : 0
                            ).toFixed(0)}
                            %
                          </span>
                          {videoUploadStartedAtMs && (
                            <span className="inline-flex items-center gap-1 tabular-nums text-slate-200 flex-shrink-0">
                              <Timer className="h-3.5 w-3.5 text-slate-300" />
                              {formatElapsed(videoUploadElapsedMs)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {videoStatus === 'done' && (
                      <span className="text-emerald-400">
                        Video procesado correctamente ✔
                      </span>
                    )}
                    {videoStatus === 'error' && (
                      <span className="text-red-400">
                        Error al procesar video
                        {videoStatusMessage ? `: ${videoStatusMessage}` : ''}
                      </span>
                    )}
                  </>
                )}

                {/* Feedback Imágenes */}
                {imageStatus && (
                  <div className="flex items-center gap-2 text-slate-300 mt-1">
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                    <span>{imageStatus}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border border-slate-700 bg-[#303030] px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-[#3a3a3a]"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-60"
                  disabled={isSaving}
                >
                  {isSaving
                    ? 'Guardando...'
                    : mode === 'edit'
                    ? 'Guardar cambios'
                    : 'Crear registro'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="px-4 py-6 text-xs text-slate-400">
            El editor aún no está configurado para este recurso.
          </div>
        )}
      </div>
    </div>
  );
}
