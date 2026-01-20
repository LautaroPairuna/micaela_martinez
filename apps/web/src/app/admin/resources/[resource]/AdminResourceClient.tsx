// apps/web/src/app/admin/resources/[resource]/AdminResourceClient.tsx
'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminToast } from '@/contexts/AdminToastContext';
import type {
  FieldMeta,
  ResourceMeta,
} from '@/lib/admin/meta-types';
import type { AdminListResponse } from '@/lib/admin/fetch-admin-meta';
import { AdminResourceForm } from './AdminResourceForm';
import { renderCell } from './renderCell';
import { Pencil, Trash2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface AdminResourceClientProps {
  resource: string;
  meta: ResourceMeta;
  initialData: AdminListResponse<any>;
}

type FormMode = 'create' | 'edit';

export function AdminResourceClient({
  resource,
  meta,
  initialData,
}: AdminResourceClientProps) {
  const { showToast } = useAdminToast();

  const [data, setData] = useState<AdminListResponse<any>>(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [currentRow, setCurrentRow] = useState<any | null>(null);

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

  const getPageHref = (p: number) =>
    `/admin/resources/${resource}?page=${p}`;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2a2a2a] pb-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
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

        <button
          type="button"
          onClick={handleOpenCreate}
          className="rounded-md bg-[#13392c] border border-[#08885d] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#08885d]"
        >
          Nuevo {meta.displayName}
        </button>
      </header>

      {/* Tabla */}
      <section className="overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="bg-[#1e1e1e]">
              <tr>
                <th
                  className="sticky left-0 z-20 border-b border-[#2a2a2a] bg-[#1c1c1c] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
                  style={{ minWidth: '96px' }}
                />
                {listFields.map((field) => (
                  <th
                    key={field.name}
                    className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
                  >
                    {field.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={listFields.length + 1}
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
                      className="sticky left-0 z-10 bg-[#101010] px-4 py-3 align-middle"
                      style={{ minWidth: '96px' }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1c1c1c] text-sky-200 hover:bg-[#262626] hover:text-sky-100"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#1c1c1c] text-rose-300 hover:bg-[#262626] hover:text-rose-200"
                          aria-label="Borrar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {listFields.map((field) => (
                      <td
                        key={field.name}
                        className="px-4 py-3 align-middle"
                      >
                        {renderCell({ field, row, meta })}
                      </td>
                    ))}
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
