export function CourseCurriculum({ modules }: { modules: { titulo: string; lecciones: { titulo: string; duracionS?: number }[] }[] }) {
  return (
    <div className="space-y-3">
      {modules?.map((m, idx) => (
        <details key={idx} className="rounded-xl2 border border-default bg-subtle">
          <summary className="cursor-pointer px-4 py-3 font-medium">{m.titulo}</summary>
          <ul className="px-4 pb-3">
            {m.lecciones.map((l, i) => (
              <li key={i} className="py-2 text-sm flex justify-between border-b border-default/60 last:border-0">
                <span>{l.titulo}</span>
                <span className="text-muted">{formatDuration(l.duracionS)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
function formatDuration(s?: number) {
  if (!s) return '—';
  const m = Math.floor(s/60), ss = s%60;
  return `${m}m ${ss}s`;
}
