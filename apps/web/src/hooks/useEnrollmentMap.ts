'use client';

import { useQuery } from '@tanstack/react-query';
import { listEnrollments } from '@/lib/sdk/userApi';

type InscripcionMini = {
  estado?: string | null;
  progreso?: number | { percent?: number; porcentaje?: number } | null;
};

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
    map.set(slug, {
      estado: e.estado,
      progreso: e.progreso as InscripcionMini['progreso'],
    });
  }
  return map;
}