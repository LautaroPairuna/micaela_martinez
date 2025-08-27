import Link from "next/link";
import { notFound } from "next/navigation";
import { formatARS } from "@/lib/format";
import { GraduationCap, ListTree, Clock3, BadgeDollarSign } from "lucide-react";
import BuyCourseButton from "@/backup/components/BuyCourseButton";

export const dynamic = "force-dynamic";

import type { Metadata } from "next";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const API = process.env.NEXT_PUBLIC_API_URL!;
  let c: any = null;
  try {
    const res = await fetch(`${API}/cursos/${params.slug}`, { next: { revalidate: 60 } });
    if (res.ok) c = await res.json();
  } catch {}

  const titulo = c?.titulo ?? "Curso";
  const desc =
    (c?.resumen as string) ??
    `Conocé el curso ${c?.titulo ?? ""} y aprendé técnicas profesionales.`;

  const canonical = `/cursos/${params.slug}`;
  const image = c?.imagen || "/og.png";

  return {
    title: `Curso – ${titulo}`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `Curso – ${titulo}`,
      description: desc,
      url: canonical,
      images: [{ url: image }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `Curso – ${titulo}`,
      description: desc,
      images: [image],
    },
    robots: c?.publicado === false ? { index: false, follow: false } : undefined,
  };
}


export default async function CursoDetalle({ params }: Props) {
  const API = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${API}/cursos/${params.slug}`, { cache: "no-store" });
  if (!res.ok) return notFound();
  const c = await res.json();

  return (
    <section className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-white/70">
        <Link href="/cursos" className="hover:underline">Cursos</Link> <span>›</span> {c.titulo}
      </nav>

      {/* Hero */}
      <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <GraduationCap size={20} /> {c.titulo}
        </h1>
        <p className="mt-1 text-white/70">{c.resumen ?? "Curso sin descripción detallada."}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Currícula */}
        <article className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-medium mb-3">
            <ListTree size={18} /> Contenido del curso
          </h2>
          <ol className="space-y-4">
            {(c.modulos ?? []).sort((a: any, b: any) => a.orden - b.orden).map((m: any) => (
              <li key={m.id} className="rounded-xl border border-white/10 p-4">
                <div className="font-medium mb-2">{m.titulo}</div>
                <ul className="text-sm text-white/80 space-y-1">
                  {(m.lecciones ?? []).sort((a: any, b: any) => a.orden - b.orden).map((l: any) => (
                    <li key={l.id}>• {l.titulo} <span className="text-white/50">({Math.round((l.duracionS ?? 0) / 60)} min)</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </article>

        {/* Sidebar compra */}
        <aside className="h-fit rounded-2xl border border-white/10 p-6">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-lg font-semibold">
            <BadgeDollarSign size={18} />
            {formatARS(c.precio)}
          </div>
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/70">
            <Clock3 size={16} /> Acceso ilimitado
          </div>
          <div className="mt-4">
            <BuyCourseButton courseId={c.id} />
          </div>
        </aside>
      </div>
    </section>
  );
}
