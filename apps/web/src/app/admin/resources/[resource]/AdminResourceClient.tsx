// apps/web/src/app/admin/resources/[resource]/AdminResourceClient.tsx
'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminToast } from '@/contexts/AdminToastContext';
import type {
  FieldMeta,
  ResourceMeta,
  FilterMeta,
  FilterOperator,
} from '@/lib/admin/meta-types';
import type { AdminListResponse } from '@/lib/admin/fetch-admin-meta';
import { AdminResourceForm } from './AdminResourceForm';
import { renderCell } from './renderCell';
import { Pencil, Trash2, Filter, ChevronDown, Search, Calendar, Hash, Check, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface AdminResourceClientProps {
  resource: string;
  meta: ResourceMeta;
  initialData: AdminListResponse<any>;
  allResources: ResourceMeta[];
}

type FormMode = 'create' | 'edit';

type FilterDraft = {
  field: string;
  op: FilterOperator;
  value: string;
};

type FilterPayload = {
  field: string;
  op: FilterOperator;
  value?: string | string[];
};

// --- Componente para cargar y seleccionar relaciones (FK) ---
function RelationFilterSelect({
  fieldMeta,
  value,
  onChange,
}: {
  fieldMeta: FieldMeta;
  value: string;
  onChange: (val: string) => void;
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!fieldMeta.fkResource || loadedRef.current) return;

    const load = async () => {
      setLoading(true);
      try {
        // Asumimos endpoint estándar de admin
        const fkResourceTable = fieldMeta.fkResource!.toLowerCase();
        const res = await fetch(`${API_BASE}/admin/resources/${fkResourceTable}?pageSize=100`, {
           credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          setOptions(Array.isArray(json.items) ? json.items : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        loadedRef.current = true;
      }
    };
    load();
  }, [fieldMeta.fkResource]);

  return (
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full appearance-none rounded border border-[#333] bg-[#0f0f0f] px-3 py-2 text-xs text-slate-200 transition-colors hover:border-[#555] focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none pr-8 cursor-pointer disabled:opacity-50"
        style={{ colorScheme: 'dark' }}
      >
        <option value="">Todos</option>
        {loading && <option value="" disabled>Cargando...</option>}
        {options.map((opt) => {
           // Intentar adivinar el label: name, title, email, o id
           const label = opt.name || opt.title || opt.email || opt.username || opt.slug || `ID: ${opt.id}`;
           return (
             <option key={opt.id} value={opt.id}>
               {label}
             </option>
           );
        })}
      </select>
      {loading ? (
        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 animate-spin" />
      ) : (
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none group-hover:text-slate-400 transition-colors" />
      )}
    </div>
  );
}

const parseFiltersParam = (
  raw: string | null,
  metaFilters: FilterMeta[],
): FilterDraft[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{
      field: string;
      op: string;
      value?: unknown;
    }>;
    if (!Array.isArray(parsed)) return [];

    const metaMap = new Map(metaFilters.map((f) => [f.field, f]));

    return parsed
      .map((item) => {
        const meta = metaMap.get(item.field);
        if (!meta || !meta.operators.includes(item.op as FilterOperator)) return null;

        let value = '';
        if (Array.isArray(item.value)) {
          value = item.value.map((v) => String(v)).join(',');
        } else if (typeof item.value === 'boolean') {
          value = item.value ? 'true' : 'false';
        } else if (item.value !== undefined && item.value !== null) {
          value = String(item.value);
        }

        return {
          field: item.field,
          op: item.op as FilterOperator,
          value,
        };
      })
      .filter((item): item is FilterDraft => item !== null);
  } catch {
    return [];
  }
};

const formatRelationLabel = (name: string) => {
  const withSpaces = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

export function AdminResourceClient({
  resource,
  meta,
  initialData,
  allResources,
}: AdminResourceClientProps) {
  const { showToast } = useAdminToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<AdminListResponse<any>>(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [currentRow, setCurrentRow] = useState<any | null>(null);

  const filtersMeta = useMemo(() => meta.filters ?? [], [meta.filters]);
  const filtersParam = searchParams.get('filters');
  const qParam = searchParams.get('q');
  
  const [searchTerm, setSearchTerm] = useState(qParam || '');

  const [filters, setFilters] = useState<FilterDraft[]>(() =>
    parseFiltersParam(filtersParam, filtersMeta),
  );

  useEffect(() => {
    setSearchTerm(qParam || '');
  }, [qParam]);

  const handleSearch = useCallback((term: string) => {
     setSearchTerm(term);
     const params = new URLSearchParams(searchParams.toString());
     if (term) {
       params.set('q', term);
     } else {
       params.delete('q');
     }
     params.set('page', '1'); // Reset page on search
     router.push(`/admin/resources/${resource}?${params.toString()}`);
  }, [router, resource, searchParams]);

  useEffect(() => {
    setFilters(parseFiltersParam(filtersParam, filtersMeta));
  }, [filtersParam, filtersMeta]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const listFields: FieldMeta[] = useMemo(
    () => meta.fields.filter((f) => f.showInList),
    [meta],
  );

  const hasEditor = useMemo(
    () =>
      meta.fields.some(
        (f) => f.showInForm && f.kind === 'scalar' && !f.isId,
      ),
    [meta],
  );

  const handleOpenCreate = useCallback(() => {
    if (!hasEditor) {
      showToast({
        variant: 'info',
        title: 'Editor no disponible',
        description:
          'Este recurso todavía no tiene campos configurados para edición.',
      });
      return;
    }

    setFormMode('create');
    setCurrentRow(null);
    setFormOpen(true);
  }, [hasEditor, showToast]);

  const handleOpenEdit = useCallback(
    (row: any) => {
      if (!hasEditor) {
        showToast({
          variant: 'info',
          title: 'Editor no disponible',
          description:
            'Este recurso todavía no tiene campos configurados para edición.',
        });
        return;
      }

      setFormMode('edit');
      setCurrentRow(row);
      setFormOpen(true);
    },
    [hasEditor, showToast],
  );

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setCurrentRow(null);
  }, []);

  const handleDelete = useCallback(
    async (row: any) => {
      const confirmMsg = `¿Eliminar este ${meta.displayName}? (ID: ${
        row.id ?? 'sin ID'
      })`;
      if (!window.confirm(confirmMsg)) return;

      try {
        const url = `${API_BASE}/admin/resources/${resource}/${row.id}`;
        const res = await fetch(url, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Error eliminando: ${res.status} ${text}`);
        }

        setData((prev) => {
          const newItems = prev.items.filter(
            (it: any) => it.id !== row.id,
          );
          return {
            ...prev,
            items: newItems,
            pagination: {
              ...prev.pagination,
              totalItems:
                prev.pagination.totalItems > 0
                  ? prev.pagination.totalItems - 1
                  : 0,
            },
          };
        });

        showToast({
          variant: 'success',
          title: `${meta.displayName} eliminado`,
        });
      } catch (err) {
        console.error(err);
        showToast({
          variant: 'error',
          title: 'Error al eliminar',
          description:
            err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    },
    [meta.displayName, resource, showToast],
  );

  const handleSaved = useCallback(
    (row: any, mode: FormMode) => {
      setData((prev) => {
        if (mode === 'edit') {
          const newItems = prev.items.map((it: any) =>
            it.id === row.id ? row : it,
          );
          return { ...prev, items: newItems };
        }

        const newItems = [row, ...prev.items];
        return {
          ...prev,
          items: newItems,
          pagination: {
            ...prev.pagination,
            totalItems: prev.pagination.totalItems + 1,
          },
        };
      });
    },
    [],
  );

  const { page, totalPages, totalItems } = data.pagination;

  const getPageHref = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    return `/admin/resources/${resource}?${params.toString()}`;
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const updateFilterValue = useCallback(
    (field: string, value: string, op?: FilterOperator) => {
      setFilters((prev) => {
        // Buscar coincidencia exacta de field + op si se provee op
        const existingIndex = prev.findIndex((f) => 
          f.field === field && (!op || f.op === op)
        );
        
        // Si el valor está vacío y existe el filtro, lo eliminamos
        if (!value && existingIndex >= 0) {
          return prev.filter((_, idx) => idx !== existingIndex);
        }

        // Si el valor está vacío y no existe, no hacemos nada
        if (!value && existingIndex === -1) {
          return prev;
        }

        // Si existe, actualizamos
        if (existingIndex >= 0) {
          return prev.map((item, idx) => {
            if (idx !== existingIndex) return item;
            return { 
              ...item, 
              value, 
              op: op || item.op // Mantener op existente si no se provee
            };
          });
        }

        // Si no existe, creamos uno nuevo
        const meta = filtersMeta.find((m) => m.field === field);
        const defaultOp = op || meta?.operators[0] || 'equals';
        
        return [...prev, { 
          field, 
          op: defaultOp, 
          value 
        }];
      });
    },
    [filtersMeta]
  );

  const updateFilterOp = useCallback(
    (field: string, newOp: FilterOperator) => {
      setFilters((prev) => {
        const existingIndex = prev.findIndex((f) => f.field === field);
        if (existingIndex === -1) return prev; // No se puede cambiar op de algo que no existe

        return prev.map((item, idx) => 
          idx === existingIndex ? { ...item, op: newOp } : item
        );
      });
    },
    []
  );

  const applyFilters = useCallback(() => {
    const payload: FilterPayload[] = [];

    for (const f of filters) {
        const metaFilter = filtersMeta.find((m) => m.field === f.field);
        if (!metaFilter || !metaFilter.operators.includes(f.op)) continue;

        if (f.op === 'isNull' || f.op === 'notNull') {
          payload.push({ field: f.field, op: f.op });
          continue;
        }

        if (!f.value.trim()) continue;

        const value =
          f.op === 'in' || f.op === 'notIn'
            ? f.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            : f.value.trim();

        payload.push({ field: f.field, op: f.op, value });
      }

    const params = new URLSearchParams(searchParams.toString());
    if (qParam) params.set('q', qParam);
    params.set('page', '1');
    if (payload.length > 0) params.set('filters', JSON.stringify(payload));
    else params.delete('filters');

    setFilterDialogOpen(false); // Close dialog on apply
    router.push(`/admin/resources/${resource}?${params.toString()}`);
  }, [filters, filtersMeta, qParam, resource, router, searchParams]);

  const clearFilters = useCallback(() => {
    setFilters([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('filters');
    params.set('page', '1');
    router.push(`/admin/resources/${resource}?${params.toString()}`);
  }, [resource, router, searchParams]);

  const relationFields = useMemo(
    () => {
      const all = meta.fields.filter(
        (f) => f.kind === 'relation' && f.isList && f.isParentChildCount,
      );

      // Regla específica para Producto: filtrar solo ciertas relaciones
      if (resource.toLowerCase() === 'producto') {
        const allowed = ['imagenes', 'resenas', 'favoritos'];
        return all.filter((r) => allowed.includes(r.name));
      }

      // Regla específica para Curso: filtrar solo ciertas relaciones
      if (resource.toLowerCase() === 'curso') {
        const allowed = ['modulos', 'resenas', 'inscripciones'];
        return all.filter((r) => allowed.includes(r.name));
      }

      // Regla específica para Usuario: filtrar relaciones relevantes
      if (resource.toLowerCase() === 'usuario') {
        const allowed = ['ordenes', 'inscripciones', 'roles', 'direcciones'];
        return all.filter((r) => allowed.includes(r.name));
      }

      return all;
    },
    [meta.fields, resource],
  );

  const idField = useMemo(
    () => meta.fields.find((f) => f.isId && f.kind === 'scalar'),
    [meta.fields],
  );

  const buildRelationHref = useCallback(
    (relation: FieldMeta, row: any) => {
      if (!relation.relationModel || !idField) return '#';
      const parentId = row[idField.name];
      if (parentId === undefined || parentId === null) return '#';

      const childMeta = allResources.find(
        (r) => r.name === relation.relationModel,
      );
      if (!childMeta) return '#';

      const fkField =
        childMeta.fields.find(
          (f) => f.isForeignKey && f.fkResource === meta.name,
        )?.name ??
        childMeta.fields.find(
          (f) => f.name === `${meta.name.charAt(0).toLowerCase()}${meta.name.slice(1)}Id`,
        )?.name;

      if (!fkField) return '#';

      const filtersPayload: FilterPayload[] = [
        { field: fkField, op: 'equals', value: String(parentId) },
      ];

      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('filters', JSON.stringify(filtersPayload));

      return `/admin/resources/${relation.relationModel}?${params.toString()}`;
    },
    [allResources, idField, meta.name],
  );

  return (
    <div className="w-full px-4 space-y-4 overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2a2a] pb-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-widest text-slate-50 uppercase">
            {meta.displayName}
          </h1>
          <p className="text-xs text-slate-400">
            Recurso <code>{meta.name}</code> • tabla{' '}
            <code>{meta.tableName}</code>
          </p>
          <p className="text-[11px] text-slate-500">
            {totalItems} registro
            {totalItems === 1 ? '' : 's'} • página {page} de {totalPages}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {filtersMeta.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterDialogOpen(true)}
              className="flex items-center gap-2 rounded-md border border-[#2a2a2a] bg-[#1c1c1c] px-4 py-2 text-sm font-medium text-slate-200 shadow hover:bg-[#262626]"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-md bg-[#13392c] border border-[#08885d] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#08885d]"
          >
            Nuevo {meta.displayName}
          </button>
        </div>
      </header>

      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="max-w-4xl bg-[#141414] border border-[#2a2a2a] text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-50">Filtros Avanzados</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="text-xs text-slate-400">
                Configura los filtros para refinar la búsqueda. Deja el campo vacío para ignorar el filtro.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded border border-[#2a2a2a] px-3 py-1 text-xs text-slate-200 hover:bg-[#1e1e1e]"
              >
                Limpiar todos
              </button>
            </div>

            <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 max-h-[60vh] overflow-y-auto pr-2">
              {filtersMeta.map((metaFilter) => {
                const inputType = metaFilter.input;
                const field = metaFilter.field;
                const fieldMeta = meta.fields.find(f => f.name === field);
                const isFK = fieldMeta?.isForeignKey && fieldMeta?.fkResource;

                // Ocultar campos de texto simples (asumimos que el buscador global se encarga)
                // Solo mostramos si es Enum, FK, Booleano, Fecha o Número
                const isTextLike = inputType === 'text' || inputType === 'string';

                // Ocultar campos de texto simples (el buscador global ya cubre eso)
                // Pero si es FK, mostramos el select de relación.
                if (isTextLike && !isFK) {
                  return null;
                }

                // --- UI para Relaciones (Select con fetch) ---
                if (isFK && fieldMeta) {
                   const activeFilter = filters.find(f => f.field === field);
                   const currentValue = activeFilter?.value ?? '';
                   
                   return (
                     <div key={field} className="space-y-1.5 rounded-lg border border-[#222] bg-[#1a1a1a] p-3">
                       <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                          <Filter className="h-3 w-3 text-slate-500" />
                          {metaFilter.label}
                       </label>
                       <RelationFilterSelect 
                          fieldMeta={fieldMeta}
                          value={currentValue}
                          onChange={(val) => updateFilterValue(field, val, 'equals')}
                       />
                     </div>
                   );
                }

                // --- UI para Rangos (Números y Fechas) ---
                if (inputType === 'number' || inputType === 'date') {
                   const minVal = filters.find(f => f.field === field && f.op === 'gte')?.value ?? '';
                   const maxVal = filters.find(f => f.field === field && f.op === 'lte')?.value ?? '';
                   
                   // Si es ID, mostrar búsqueda exacta, no rango
                   if (field === 'id' || field.endsWith('Id')) {
                      const exactVal = filters.find(f => f.field === field && f.op === 'equals')?.value ?? '';
                      return (
                        <div key={field} className="space-y-1.5 rounded-lg border border-[#222] bg-[#1a1a1a] p-3">
                           <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                             <Hash className="h-3 w-3 text-slate-500" />
                             {metaFilter.label}
                           </label>
                           <input
                             type="number"
                             value={exactVal}
                             onChange={(e) => updateFilterValue(field, e.target.value, 'equals')}
                             placeholder={`ID exacto...`}
                             className="w-full rounded border border-[#333] bg-[#0f0f0f] px-3 py-1.5 text-xs text-slate-200 focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none transition-colors hover:border-[#444]"
                             style={{ colorScheme: 'dark' }}
                           />
                        </div>
                      );
                   }

                   const typeAttr = inputType === 'date' ? 'date' : 'number';
                   
                   return (
                     <div key={field} className="space-y-1.5 rounded-lg border border-[#222] bg-[#1a1a1a] p-3">
                       <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                         {inputType === 'date' ? <Calendar className="h-3 w-3 text-slate-500" /> : <Hash className="h-3 w-3 text-slate-500" />}
                         {metaFilter.label}
                       </label>
                       <div className="flex items-center gap-2">
                         <div className="relative flex-1 group">
                           <input
                             type={typeAttr}
                             value={minVal}
                             onChange={(e) => updateFilterValue(field, e.target.value, 'gte')}
                             placeholder={inputType === 'date' ? 'Desde' : 'Mínimo'}
                             className="w-full rounded border border-[#333] bg-[#0f0f0f] px-3 py-1.5 text-xs text-slate-200 focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none transition-colors hover:border-[#444]"
                             style={{ colorScheme: 'dark' }} // Habilita calendario nativo oscuro
                           />
                         </div>
                         <span className="text-slate-500 text-xs font-medium">a</span>
                         <div className="relative flex-1 group">
                           <input
                             type={typeAttr}
                             value={maxVal}
                             onChange={(e) => updateFilterValue(field, e.target.value, 'lte')}
                             placeholder={inputType === 'date' ? 'Hasta' : 'Máximo'}
                             className="w-full rounded border border-[#333] bg-[#0f0f0f] px-3 py-1.5 text-xs text-slate-200 focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none transition-colors hover:border-[#444]"
                             style={{ colorScheme: 'dark' }} // Habilita calendario nativo oscuro
                           />
                         </div>
                       </div>
                     </div>
                   );
                }

                // --- UI para Booleanos ---
                if (inputType === 'boolean') {
                   const currentVal = filters.find(f => f.field === field)?.value;
                   return (
                     <div key={field} className="space-y-1.5 rounded-lg border border-[#222] bg-[#1a1a1a] p-3">
                       <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                         <Check className="h-3 w-3 text-slate-500" />
                         {metaFilter.label}
                       </label>
                       <div className="flex rounded bg-[#0f0f0f] p-1 border border-[#333]">
                         <button
                           type="button"
                           onClick={() => updateFilterValue(field, '')}
                           className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${!currentVal ? 'bg-[#2a2a2a] text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1a]'}`}
                         >
                           Todos
                         </button>
                         <button
                           type="button"
                           onClick={() => updateFilterValue(field, 'true', 'equals')}
                           className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${currentVal === 'true' ? 'bg-[#059669] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1a]'}`}
                         >
                           Sí
                         </button>
                         <button
                           type="button"
                           onClick={() => updateFilterValue(field, 'false', 'equals')}
                           className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${currentVal === 'false' ? 'bg-[#dc2626] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1a]'}`}
                         >
                           No
                         </button>
                       </div>
                     </div>
                   );
                }

                // --- UI para Enums ---
                if (inputType === 'enum') {
                    const activeFilter = filters.find(f => f.field === field);
                    const currentValue = activeFilter?.value ?? '';
                    
                    return (
                      <div key={field} className="space-y-1.5 rounded-lg border border-[#222] bg-[#1a1a1a] p-3">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                           <Filter className="h-3 w-3 text-slate-500" />
                           {metaFilter.label}
                        </label>
                        
                        <div className="relative group">
                          <select
                            value={currentValue}
                            onChange={(e) => updateFilterValue(field, e.target.value, 'equals')}
                            className="w-full appearance-none rounded border border-[#333] bg-[#0f0f0f] px-3 py-2 text-xs text-slate-200 transition-colors hover:border-[#555] focus:border-[#08885d] focus:ring-1 focus:ring-[#08885d] outline-none pr-8 cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                          >
                            <option value="">Todos</option>
                            {metaFilter.enumValues?.map((val) => (
                              <option key={val} value={val}>
                                {val}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                    );
                }

                return null;
              })}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setFilterDialogOpen(false)}
              className="rounded border border-[#2a2a2a] px-4 py-2 text-xs text-slate-200 hover:bg-[#1e1e1e]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded bg-[#13392c] border border-[#08885d] px-4 py-2 text-xs text-white hover:bg-[#08885d]"
            >
              Aplicar Filtros ({filters.length})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barra de Búsqueda Global */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-slate-500" />
        </div>
        <input
          type="text"
          className="block w-full p-2 pl-10 text-sm text-slate-200 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg focus:ring-[#08885d] focus:border-[#08885d] placeholder-slate-500"
          placeholder="Buscar en todos los campos..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <section className="overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-[#1e1e1e]">
              <tr>
                <th
                  className="sticky left-0 z-20 border-b border-[#2a2a2a] bg-[#1c1c1c] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
                  style={{ minWidth: '96px' }}
                />
                {listFields.map((field) => (
                  <th
                    key={field.name}
                    className="border-b border-[#2a2a2a] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
                  >
                    {field.label ?? field.name}
                  </th>
                ))}
                {relationFields.map((relation) => (
                  <th
                    key={relation.name}
                    className="border-b border-[#2a2a2a] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
                  >
                    {relation.label ?? formatRelationLabel(relation.name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={listFields.length + 1 + relationFields.length}
                    className="bg-[#101010] px-4 py-6 text-center text-xs text-slate-500"
                  >
                    No hay registros aún.
                  </td>
                </tr>
              ) : (
                data.items.map((row: any, idx: number) => (
                  <tr
                    key={row.id ?? row.slug ?? `row-${idx}`}
                    className="bg-[#101010] border-b border-[#1f1f1f] hover:bg-[#181818]"
                  >
                    <td
                      className="sticky left-0 z-10 bg-[#101010] px-3 py-2 align-middle"
                      style={{ minWidth: '96px' }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1c1c1c] text-sky-200 hover:bg-[#262626] hover:text-sky-100"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1c1c1c] text-rose-300 hover:bg-[#262626] hover:text-rose-200"
                          aria-label="Borrar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    {listFields.map((field) => (
                      <td
                        key={field.name}
                        className="px-3 py-2 align-middle"
                      >
                        {renderCell({ field, row, meta })}
                      </td>
                    ))}

                    {relationFields.map((relation) => {
                      // Caso especial: Roles de Usuario
                      if (resource.toLowerCase() === 'usuario' && relation.name === 'roles') {
                        const rolesList = row.roles;
                        return (
                          <td key={relation.name} className="px-3 py-2 align-middle">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(rolesList) && rolesList.length > 0 ? (
                                rolesList.map((ur: any, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex rounded bg-purple-900/40 border border-purple-500/30 px-2 py-0.5 text-[10px] text-purple-200"
                                  >
                                    {ur.role?.name || 'Rol'}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-500">—</span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const count = row?._count?.[relation.name] ?? 0;
                      const href = buildRelationHref(relation, row);
                      const disabled = href === '#';
                      const label = relation.label ?? formatRelationLabel(relation.name);
                      return (
                        <td key={relation.name} className="px-3 py-2 align-middle">
                          {disabled ? (
                            <span
                              className="inline-flex rounded border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-slate-500"
                            >
                              {label} ({count})
                            </span>
                          ) : (
                            <Link
                              href={href}
                              className="inline-flex rounded border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-slate-200 hover:bg-[#262626]"
                            >
                              {label} ({count})
                            </Link>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between border-t border-[#2a2a2a] px-4 py-3 text-[11px] text-slate-400">
          <span>
            Página {page} de {totalPages} • {totalItems} registro
            {totalItems === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            {hasPrev && (
              <Link
                href={getPageHref(1)}
                className="rounded border border-[#2a2a2a] px-2 py-1 hover:bg-[#262626]"
              >
                « First
              </Link>
            )}
            {hasPrev && (
              <Link
                href={getPageHref(page - 1)}
                className="rounded border border-[#2a2a2a] px-2 py-1 hover:bg-[#262626]"
              >
                ‹ Prev
              </Link>
            )}
            <span className="rounded border border-[#2a2a2a] bg-[#262626] px-2 py-1 font-medium text-slate-100">
              {page}
            </span>
            {hasNext && (
              <Link
                href={getPageHref(page + 1)}
                className="rounded border border-[#2a2a2a] px-2 py-1 hover:bg-[#262626]"
              >
                Next ›
              </Link>
            )}
            {hasNext && (
              <Link
                href={getPageHref(totalPages)}
                className="rounded border border-[#2a2a2a] px-2 py-1 hover:bg-[#262626]"
              >
                Last »
              </Link>
            )}
          </div>
        </div>
      </section>

      <AdminResourceForm
        open={formOpen}
        mode={formMode}
        meta={meta}
        resource={resource}
        currentRow={currentRow}
        onClose={handleCloseForm}
        onSaved={handleSaved}
      />
    </div>
  );
}
