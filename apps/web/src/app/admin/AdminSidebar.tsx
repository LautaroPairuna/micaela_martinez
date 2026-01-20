// apps/web/src/app/admin/AdminSidebar.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ResourceMeta } from '@/lib/admin/meta-types';
import {
  Home,
  BarChart3,
  Users,
  ShoppingBag,
  GraduationCap,
  Settings,
  MoreHorizontal,
} from 'lucide-react';

const HIDDEN_RESOURCES = [
  'AuditLog',
  'ResenaLike',
  'ResenaRespuesta',
  'ResenaBorrador',
  'PagoSuscripcion',
  'PreferenciasNotificacion',
  'Notificacion',
  'UsuarioRol',
  'Favorito',
  'ItemOrden',
];

const RESOURCE_GROUPS: {
  id: string;
  label: string;
  icon: React.ReactNode;
  resources: string[];
}[] = [
  {
    id: 'users',
    label: 'Usuarios & Accesos',
    icon: <Users className="h-4 w-4" />,
    resources: ['Usuario', 'Role'],
  },
  {
    id: 'catalog',
    label: 'Catálogo & Ventas',
    icon: <ShoppingBag className="h-4 w-4" />,
    resources: ['Producto', 'ProductoImagen', 'Marca', 'Categoria', 'Orden', 'Slider'],
  },
  {
    id: 'courses',
    label: 'Cursos & Lecciones',
    icon: <GraduationCap className="h-4 w-4" />,
    resources: ['Curso', 'Leccion', 'Modulo', 'Inscripcion'],
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: <Settings className="h-4 w-4" />,
    resources: ['Direccion'],
  },
];

interface GroupedResource {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: ResourceMeta[];
}

interface AdminSidebarProps {
  resources: ResourceMeta[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function AdminSidebar({ resources }: AdminSidebarProps) {
  const pathname = usePathname();

  const visibleResources = useMemo(
    () =>
      resources
        .filter((r) => !HIDDEN_RESOURCES.includes(r.name))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [resources],
  );

  const { groups, others }: { groups: GroupedResource[]; others: ResourceMeta[] } =
    useMemo(() => {
      const usedNames = new Set<string>();

      const grouped: GroupedResource[] = RESOURCE_GROUPS.map((g) => {
        const items = visibleResources.filter((r) => g.resources.includes(r.name));
        items.forEach((r) => usedNames.add(r.name));
        return { id: g.id, label: g.label, icon: g.icon, items };
      }).filter((g) => g.items.length > 0);

      const othersList = visibleResources.filter((r) => !usedNames.has(r.name));

      return { groups: grouped, others: othersList };
    }, [visibleResources]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenGroups((prev) => {
      const copy: Record<string, boolean> = { ...prev };
      for (const g of groups) {
        if (copy[g.id] === undefined) copy[g.id] = true;
      }
      if (others.length > 0 && copy['others'] === undefined) {
        copy['others'] = true;
      }
      return copy;
    });
  }, [groups, others.length]);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const isActiveHref = (href: string) => pathname.startsWith(href);

  // Contadores
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      try {
        const entries = await Promise.all(
          visibleResources.map(async (r) => {
            try {
              const base = API_BASE || '';
              const url = `${base}/admin/resources/${r.tableName}?page=1&pageSize=1`;
              const res = await fetch(url, { cache: 'no-store' });
              if (!res.ok) return [r.tableName, null] as const;

              const json = await res.json();
              const total = json?.pagination?.totalItems;
              return [r.tableName, typeof total === 'number' ? total : null] as const;
            } catch {
              return [r.tableName, null] as const;
            }
          }),
        );
        if (!cancelled) setCounts(Object.fromEntries(entries));
      } catch {
        /* ignore */
      }
    }

    if (visibleResources.length > 0) loadCounts();
    return () => {
      cancelled = true;
    };
  }, [visibleResources]);

  const renderCount = (tableName: string) => {
    const value = counts[tableName];
    if (value == null) return '– ítems';
    return `${value.toLocaleString('es-AR')} ítems`;
  };

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-[#252525] bg-[#141414]">
      {/* Header */}
      <header className="border-b border-[#252525] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-50">
              Panel de administración
            </h1>
            <p className="mt-1 text-[11px] text-slate-400">
              Gestioná los recursos del sistema.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-slate-100 hover:border-sky-500/60 hover:text-sky-100"
            title="Volver al sitio"
          >
            <Home className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-3">
          <Link
            href="/admin"
            className={[
              'group flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs',
              pathname === '/admin'
                ? 'border-sky-500/60 bg-[#22232b] text-sky-50'
                : 'border-transparent text-slate-200 hover:border-sky-500/30 hover:bg-[#232323] hover:text-sky-100',
            ].join(' ')}
          >
            <span className="inline-flex items-center gap-2 truncate font-medium">
              <BarChart3 className="h-4 w-4" />
              Inicio
            </span>
            <span className="flex-shrink-0 text-[10px] text-slate-500 group-hover:text-sky-300">
              Dashboard
            </span>
          </Link>
        </div>

        {groups.map((group) => {
          const isOpen = openGroups[group.id] ?? true;

          return (
            <section key={group.id} className="mb-3">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-[#252525]"
              >
                <span className="inline-flex items-center gap-2">
                  {group.icon}
                  <span>{group.label}</span>
                </span>
                <span
                  className={`transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {isOpen && (
                <ul className="mt-1 space-y-1 pl-1">
                  {group.items.map((r) => {
                    const href = `/admin/resources/${r.tableName}`;
                    const active = isActiveHref(href);
                    const countLabel = renderCount(r.tableName);

                    return (
                      <li key={r.name}>
                        <Link
                          href={href}
                          className={[
                            'group flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs',
                            active
                              ? 'border-sky-500/60 bg-[#22232b] text-sky-50'
                              : 'border-transparent text-slate-200 hover:border-sky-500/30 hover:bg-[#232323] hover:text-sky-100',
                          ].join(' ')}
                        >
                          <span className="truncate font-medium">
                            {r.displayName}
                          </span>
                          <span className="flex-shrink-0 text-[10px] text-slate-500 group-hover:text-sky-300">
                            {countLabel}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        {others.length > 0 && (
          <section className="mt-4 border-t border-[#252525] pt-3">
            <button
              type="button"
              onClick={() => toggleGroup('others')}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-[#252525]"
            >
              <span className="inline-flex items-center gap-2">
                <MoreHorizontal className="h-4 w-4" />
                <span>Otros recursos</span>
              </span>
              <span
                className={`transition-transform ${
                  openGroups['others'] ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
            </button>

            {openGroups['others'] && (
              <ul className="mt-1 space-y-1 pl-1">
                {others.map((r) => {
                  const href = `/admin/resources/${r.tableName}`;
                  const active = isActiveHref(href);
                  const countLabel = renderCount(r.tableName);

                  return (
                    <li key={r.name}>
                      <Link
                        href={href}
                        className={[
                          'group flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs',
                          active
                            ? 'border-sky-500/60 bg-[#22232b] text-sky-50'
                            : 'border-transparent text-slate-200 hover:border-sky-500/30 hover:bg-[#232323] hover:text-sky-100',
                        ].join(' ')}
                      >
                        <span className="truncate font-medium">
                          {r.displayName}
                        </span>
                        <span className="flex-shrink-0 text-[10px] text-slate-500 group-hover:text-sky-300">
                          {countLabel}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </nav>

      <footer className="border-t border-[#252525] px-5 py-3 text-[11px] text-slate-500">
        MicaAdmin • v1
      </footer>
    </aside>
  );
}
