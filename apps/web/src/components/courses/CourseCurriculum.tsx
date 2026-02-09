import { formatDuration } from '@/lib/utils';
import { Clock, PlayCircle } from 'lucide-react';

export function CourseCurriculum({ modules }: { modules: { titulo: string; lecciones: { titulo: string; duracion?: number }[] }[] }) {
  // Calcular duración total de un módulo
  const getModuleDuration = (lecciones: { duracion?: number }[]) => {
    return lecciones.reduce((total, leccion) => total + (leccion.duracion ? Math.round(leccion.duracion * 60) : 0), 0);
  };

  return (
    <div className="space-y-3">
      {modules?.map((m, idx) => {
        const moduleDuration = getModuleDuration(m.lecciones);
        const lessonCount = m.lecciones.length;
        
        return (
          <details key={idx} className="rounded-xl border border-default bg-subtle hover:bg-subtle/80 transition-colors">
            <summary className="cursor-pointer px-4 py-3 font-medium flex items-center justify-between group">
              <span className="flex-1">{m.titulo}</span>
              <div className="flex items-center gap-3 text-xs text-muted group-hover:text-[var(--fg)] transition-colors">
                <span className="flex items-center gap-1">
                  <PlayCircle className="size-3" />
                  {lessonCount} {lessonCount === 1 ? 'lección' : 'lecciones'}
                </span>
                {moduleDuration > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDuration(moduleDuration)}
                  </span>
                )}
              </div>
            </summary>
            <ul className="px-4 pb-3 space-y-1">
              {m.lecciones.map((l, i) => (
                <li key={i} className="py-2 text-sm flex justify-between items-center border-b border-default/30 last:border-0 hover:bg-white/5 rounded px-2 -mx-2 transition-colors">
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full flex-shrink-0" />
                    {l.titulo}
                  </span>
                  <span className="text-muted text-xs flex items-center gap-1">
                    {(l.duracion && l.duracion > 0) ? (
                      <>
                        <Clock className="size-3" />
                        {formatDuration(Math.round(l.duracion * 60))}
                      </>
                    ) : (
                      <span className="text-muted/60">Sin duración</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
