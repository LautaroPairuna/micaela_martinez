'use client';

import { useQuery } from '@tanstack/react-query';
import { listEnrollments } from '@/lib/sdk/userApi';

type InscripcionMini = {
  estado?: string | null;
  progreso?: number | { percent?: number; porcentaje?: number } | null;
};

function computePercent(e: {
  curso?: { modulos?: Array<{ lecciones?: Array<{ id: string | number }> }> };
  progreso?: unknown;
}): number {
  const prog = e.progreso as Record<string, unknown> | undefined;
  const mods = e.curso?.modulos || [];
  const total = mods.reduce((acc, m) => acc + (m.lecciones?.length || 0), 0);
  let done = 0;
  if (prog && typeof prog === 'object') {
    const modKeys = Object.keys(prog);
    for (const mk of modKeys) {
      const modData = (prog as Record<string, unknown>)[mk];
      if (modData && typeof modData === 'object') {
        const lessonKeys = Object.keys(modData as Record<string, unknown>);
        for (const lk of lessonKeys) {
          const entry = (modData as Record<string, unknown>)[lk];
          if (entry && typeof entry === 'object' && 'completed' in (entry as { completed?: boolean })) {
            if ((entry as { completed?: boolean }).completed) done += 1;
          }
        }
      }
    }
  }
  if (total > 0) return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  const p1 = (prog as { percent?: number } | undefined)?.percent;
  const p2 = (prog as { porcentaje?: number } | undefined)?.porcentaje;
  const val = typeof p1 === 'number' ? p1 : typeof p2 === 'number' ? p2 : 0;
  return Math.max(0, Math.min(100, Math.round(val || 0)));
}

export function useEnrollmentMap(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => listEnrollments({ cache: 'no-store' }),
    enabled,
  });

  const map = new Map<string, InscripcionMini>();
  for (const e of data || []) {
    const slug = e?.curso?.slug;
    if (!slug) continue;
    const percent = computePercent(e);
    map.set(slug, {
      estado: e.estado,
      progreso: percent,
    });
  }
  return map;
}
