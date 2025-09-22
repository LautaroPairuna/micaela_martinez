// components/courses/CourseCardHorizontal.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Pill } from '@/components/ui/Pill';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';
import { AddCourseButton } from '@/components/cart/AddCourseButton';
import { Star } from 'lucide-react';

type NivelCurso = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
const NIVEL_LABEL: Record<NivelCurso, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

type CourseMinimal = {
  slug: string;
  titulo: string;
  precio: number;                // precio directo
  nivel?: NivelCurso | null;
  portadaUrl?: string | null;
  destacado?: boolean | null;
  ratingProm?: number | string | null;
  ratingConteo?: number | null;
  _count?: { modulos?: number };
  instructor?: { nombre?: string | null } | null;
};

type InscripcionMini = {
  estado?: string | null;
  progreso?: { percent?: number; porcentaje?: number } | null;
} | null;

export function CourseCard({ c, inscripcion = null }: { c: CourseMinimal; inscripcion?: InscripcionMini }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const nivelLabel = c.nivel ? NIVEL_LABEL[c.nivel] : undefined;

  // Solo calcular valores dependientes del cliente después de la hidratación
  const isEnrolled = isClient ? (!!inscripcion && inscripcion?.estado !== 'cancelled') : false;
  const progressPctRaw = isClient ? (inscripcion?.progreso?.percent ?? inscripcion?.progreso?.porcentaje ?? 0) : 0;
  const progressPct = Math.max(0, Math.min(100, Math.round(progressPctRaw || 0)));
  const ctaLabel = isEnrolled ? (progressPct > 0 ? 'Continuar' : 'Empezar') : 'Ver curso';

  return (
    <Link
      href={`/cursos/detalle/${c.slug}`}
      className="group block h-full touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
      style={{ outlineOffset: 4, WebkitTapHighlightColor: 'transparent' }}
    >
      <Card className="h-full flex flex-col lg:flex-row border border-gray-700 bg-gray-900 backdrop-blur-sm transition-all duration-300 ease-out group-hover:border-[var(--gold)] group-hover:shadow-xl group-hover:shadow-[var(--gold)]/20 group-hover:-translate-y-1">
        {/* Imagen */}
        <div className="relative overflow-hidden rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none lg:w-80 lg:h-auto">
          <div className="aspect-video lg:aspect-square w-full h-full transition-transform duration-500 ease-out group-hover:scale-105">
            <SafeImage
              src={c.portadaUrl || null}
              alt={c.titulo}
              ratio="16/9"
              className="w-full h-full object-cover"
              rounded="all"
              hoverZoom={false}
              sizes="(min-width:1280px) 100vw, (min-width:768px) 50vw, 100vw"
            />
          </div>
          {/* Overlay con badges */}
          <div className="absolute inset-2 flex flex-col justify-between pointer-events-none">
            <div className="flex flex-wrap gap-2">
              {c.destacado && (
                <span className="animate-pulse rounded-full px-3 py-1.5 text-xs font-bold text-black shadow-lg backdrop-blur-sm border border-[var(--gold-700)] bg-[var(--gold)] flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-current" />
                  Destacado
                </span>
              )}
              {nivelLabel && (
                <Pill tone="default">
                  {nivelLabel}
                </Pill>
              )}
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex flex-col gap-3 flex-1 p-4 sm:p-5 lg:p-6">
              <h3 className="font-bold text-lg leading-tight line-clamp-2 min-h-[3.5rem] uppercase tracking-wide transition-all duration-300 text-white group-hover:text-[var(--gold)]">{c.titulo}</h3>

              <p className="text-sm text-[var(--muted)]">
                {c._count?.modulos && c._count.modulos > 0 ? `${c._count.modulos} módulos` : 'Sin módulos'}
              </p>

              {c.ratingProm && c.ratingConteo && c.ratingConteo > 0 && (
                <div className="min-h-[24px] flex items-center">
                  <RatingStars value={Number(c.ratingProm || 0)} count={c.ratingConteo || 0} size="sm" />
                </div>
              )}

              {isEnrolled && (
                <div className="space-y-2 p-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-200">Tu progreso</span>
                    <span className="font-bold text-[var(--gold)]">{progressPct}%</span>
                  </div>
                  <div className="h-3 bg-gray-600 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold)]/80 transition-all duration-500 ease-out shadow-sm"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <Price value={c.precio} />
                </div>
                
                {isEnrolled ? (
                  <div className="rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold)]/90 px-4 py-2 text-center shadow-lg transition-all duration-300 hover:from-[var(--gold)]/90 hover:to-[var(--gold)]/80 hover:shadow-xl hover:scale-105 active:scale-95">
                    <span className="text-sm font-bold text-black">{ctaLabel}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AddCourseButton 
                      c={{
                        id: c.slug,
                        slug: c.slug,
                        titulo: c.titulo,
                        precio: c.precio,
                        portadaUrl: c.portadaUrl
                      }}
                      className="w-full"
                    />
                    <div className="rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600 px-4 py-2 text-center transition-all duration-300 group-hover:from-gray-700 group-hover:to-gray-600 group-hover:border-[var(--gold)]/50 group-hover:shadow-md">
                      <span className="text-sm font-medium text-gray-200 transition-colors group-hover:text-[var(--gold)]">{ctaLabel}</span>
                    </div>
                  </div>
                )}
              </div>
        </div>
      </Card>
    </Link>
  );
}
