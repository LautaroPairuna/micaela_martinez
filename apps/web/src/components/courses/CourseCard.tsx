// components/courses/CourseCardHorizontal.tsx
'use client';

import Link from 'next/link';
import React from 'react';
import { Card } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Pill } from '@/components/ui/Pill';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';
import { AddCourseButton } from '@/components/cart/AddCourseButton';
import { Star, BookOpen, Clock } from 'lucide-react';
import { useEnrollmentProgressSafe } from '@/components/courses/EnrollmentProgressProvider';
import { formatDuration } from '@/lib/utils';

type NivelCurso = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
const NIVEL_LABEL: Record<NivelCurso, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

type CourseMinimal = {
  id: string | number;
  slug: string;
  titulo: string;
  precio: number;                // precio directo
  nivel?: NivelCurso | null;
  portadaUrl?: string | null;
  destacado?: boolean | null;
  ratingProm?: number | string | null;
  ratingConteo?: number | null;
  _count?: { modulos?: number };
  totalLessons?: number;
  totalDuration?: number;
};

type InscripcionMini = {
  estado?: string | null;
  progreso?: number | { percent?: number; porcentaje?: number } | null;
} | null;

export function CourseCard({ c, inscripcion = null }: { c: CourseMinimal; inscripcion?: InscripcionMini }) {

  const nivelLabel = c.nivel ? NIVEL_LABEL[c.nivel] : undefined;

  const progressCtx = useEnrollmentProgressSafe();
  const providerPct = progressCtx ? progressCtx.getCourseProgressBySlug(c.slug) : 0;
  const progressPctRaw =
    providerPct && providerPct > 0
      ? providerPct
      : (typeof inscripcion?.progreso === 'number'
          ? inscripcion?.progreso
          : inscripcion?.progreso?.percent ?? inscripcion?.progreso?.porcentaje ?? 0);
  const progressPct = Math.max(0, Math.min(100, Math.round(progressPctRaw || 0)));
  const isEnrolled = !!inscripcion && inscripcion?.estado !== 'cancelled';
  const ctaLabel = isEnrolled ? (progressPct > 0 ? 'Continuar aprendiendo' : 'Empezar') : 'Ver curso';

  return (
    <div
      className="group block h-full touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
      style={{ outlineOffset: 4, WebkitTapHighlightColor: 'transparent' }}
    >
      <Card className="relative h-full flex flex-col lg:flex-row border border-[#131313] bg-[#141414] backdrop-blur-sm transition-all duration-300 ease-out hover:border-[var(--gold)] hover:shadow-xl hover:shadow-[var(--gold)]/20 hover:-translate-y-1 overflow-hidden rounded-xl">
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[linear-gradient(120deg,transparent,rgba(197,164,109,0.12),transparent)] bg-[length:200%_200%] animate-shine" />
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-[var(--gold)]/10" />
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_20%_20%,rgba(197,164,109,0.18),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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
        <div className="relative flex flex-col gap-3 flex-1 p-4 sm:p-5 lg:p-6">
              <h3 className="relative font-bold text-lg leading-tight line-clamp-2 min-h-[3.5rem] uppercase tracking-wide transition-all duration-300 text-white group-hover:text-[var(--gold)] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-[var(--pink-strong)] after:rounded-full group-hover:after:w-3/4">{c.titulo}</h3>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800/80 px-2 py-1 text-gray-200">
                  <BookOpen className="h-3 w-3" />
                  {c.totalLessons ? `${c.totalLessons} lecciones` : '0 lecciones'}
                </span>

                {c.totalDuration && c.totalDuration > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800/80 px-2 py-1 text-gray-200">
                    <Clock className="h-3 w-3" />
                    {formatDuration(c.totalDuration)}
                  </span>
                )}

                {c.ratingProm && c.ratingConteo && c.ratingConteo > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800/80 px-2 py-1 text-gray-200">
                    <Star className="h-3 w-3 text-[var(--gold)]" />
                    {Number(c.ratingProm || 0).toFixed(1)} · {c.ratingConteo}
                  </span>
                )}
              </div>

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
                {!isEnrolled && (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <Price value={c.precio} tone="pink" />
                      <span className="text-xs text-[var(--muted)]">Suscripción mensual</span>
                    </div>
                  </div>
                )}
                
                {isEnrolled ? (
                  <div className="space-y-2">
                    <Link
                      href={`/cursos/player/${c.slug}`}
                      className="block w-full rounded-xl bg-[var(--pink)] px-4 py-2 text-center shadow-lg transition-all duration-300 hover:bg-[var(--pink-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pink)]/40"
                    >
                      <span className="text-sm font-bold text-black">{ctaLabel}</span>
                    </Link>
                    <Link
                      href={`/cursos/detalle/${c.slug}`}
                      className="block w-full rounded-xl border border-[var(--gold)] px-4 py-2 text-center transition-all duration-300 text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black hover:shadow-md"
                    >
                      <span className="text-sm font-semibold">Ver curso</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AddCourseButton 
                      c={{
                        id: c.id,
                        slug: c.slug,
                        titulo: c.titulo,
                        precio: c.precio,
                        portadaUrl: c.portadaUrl
                      }}
                      className="w-full rounded-xl bg-[var(--pink)] text-black font-bold px-4 py-2 transition-all duration-300 hover:bg-[var(--pink-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--pink)]/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <Link
                      href={`/cursos/detalle/${c.slug}`}
                      className="block w-full rounded-xl border border-[var(--gold)] px-4 py-2 text-center transition-all duration-300 text-[var(--gold)] hover:bg-[var(--gold)] hover:text-black hover:shadow-md"
                    >
                      <span className="text-sm font-semibold">{ctaLabel}</span>
                    </Link>
                  </div>
                )}
              </div>
        </div>
      </Card>
    </div>
  );
}
