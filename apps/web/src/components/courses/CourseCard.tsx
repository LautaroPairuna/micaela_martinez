// components/courses/CourseCardHorizontal.tsx
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { SafeImage } from '@/components/ui/SafeImage';
import { Pill } from '@/components/ui/Pill';
import { Price } from '@/components/ui/Price';
import { RatingStars } from '@/components/ui/RatingStars';

type NivelCurso = 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
const NIVEL_LABEL: Record<NivelCurso, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
};

type CourseMinimal = {
  slug: string;
  titulo: string;
  precio: number;                // centavos
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

export function CourseCard({ c, inscripcion }: { c: CourseMinimal; inscripcion?: InscripcionMini }) {
  const nivelLabel = c.nivel ? NIVEL_LABEL[c.nivel] : undefined;

  const isEnrolled = !!inscripcion && inscripcion?.estado !== 'cancelled';
  const progressPctRaw = inscripcion?.progreso?.percent ?? inscripcion?.progreso?.porcentaje ?? 0;
  const progressPct = Math.max(0, Math.min(100, Math.round(progressPctRaw || 0)));
  const ctaLabel = isEnrolled ? (progressPct > 0 ? 'Continuar' : 'Empezar') : 'Ver curso';

  return (
    <Link href={`/cursos/detalle/${c.slug}`} className="block focus:outline-none">
      <Card
        className={[
          'relative overflow-hidden',
          'before:content-[""] before:absolute before:inset-y-0 before:left-0 before:w-[2px]',
          'before:bg-gradient-to-b before:from-transparent before:via-[var(--gold)]/80 before:to-transparent',
          'before:pointer-events-none',
        ].join(' ')}
      >
        {/* Grid interno: col fija para imagen + col flexible para contenido */}
        <div
          className={[
            'grid gap-4 p-3 sm:p-4',
            // Ancho fijo de imagen según breakpoint; el resto es 1fr
            'grid-cols-[9rem_1fr] sm:grid-cols-[12rem_1fr] xl:grid-cols-[14rem_1fr]',
          ].join(' ')}
        >
          <div className="min-w-0">
            <SafeImage
              src={c.portadaUrl || null}
              alt={c.titulo}
              ratio="1/1"
              rounded="all"
              hoverZoom={false}
              sizes="(min-width:1280px) 14rem, (min-width:768px) 12rem, 9rem"
            />
          </div>

          <CardBody className="p-0 min-w-0 flex flex-col gap-1 sm:gap-1.5">
            <h3 className="font-medium leading-snug line-clamp-2 pr-2">{c.titulo}</h3>

            {c.instructor?.nombre ? (
              <p className="text-xs text-muted">Por {c.instructor.nombre}</p>
            ) : null}

            <div className="mt-1 flex flex-wrap gap-2">
              {nivelLabel ? <Pill tone="gold" size="sm">Nivel: {nivelLabel}</Pill> : null}
              {typeof c._count?.modulos === 'number' ? (
                <Pill tone="muted" size="sm">{c._count.modulos} módulos</Pill>
              ) : null}
              {c.destacado ? <Pill tone="gold" size="sm">Recomendado</Pill> : null}
            </div>

            <div className="mt-1">
              <RatingStars value={Number(c.ratingProm || 0)} count={c.ratingConteo || 0} size="sm" />
            </div>

            {isEnrolled && (
              <div className="mt-1">
                <div className="h-1.5 rounded-full bg-neutral-200">
                  <div className="h-1.5 rounded-full bg-[var(--gold)]" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="mt-1 block text-[11px] text-muted">{progressPct}% completado</span>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <Price value={c.precio / 100} />
              <span className="inline-flex items-center rounded-xl2 border border-default px-2.5 py-1 text-sm transition-colors hover:bg-subtle">
                {ctaLabel}
              </span>
            </div>
          </CardBody>
        </div>
      </Card>
    </Link>
  );
}
