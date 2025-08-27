import Link from "next/link";
import { notFound } from "next/navigation";
import { formatARS } from "../../../../lib/format";
import { Package, Tag, BadgeDollarSign, CheckCircle2 } from "lucide-react";
import AddToCartButton from "@/backup/components/AddToCartButton";

export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { APP_URL } from "@/lib/env";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const API = process.env.NEXT_PUBLIC_API_URL!;
  let p: any = null;
  try {
    const res = await fetch(`${API}/tienda/${params.slug}`, { next: { revalidate: 60 } });
    if (res.ok) p = await res.json();
  } catch {}

  const titulo = p?.titulo ?? "Producto";
  const desc =
    p?.descripcion ??
    `Descubrí ${p?.titulo ?? "nuestro producto"} en la tienda.`;
  const canonical = `/tienda/${params.slug}`;
  const image = p?.imagen || "/og.png";

  return {
    title: `${titulo}`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `{titulo}`,
      description: desc,
      url: canonical,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${titulo}`,
      description: desc,
      images: [image],
    },
    robots: p?.stock === 0 ? { index: false, follow: false } : undefined,
  };
}


export default async function ProductoDetalle({ params }: Props) {
  const API = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${API}/tienda/${params.slug}`, { cache: "no-store" });
  if (!res.ok) return notFound();
  const p = await res.json();

  const attrs: Record<string, any> = p.atributos ?? {};

  return (
    <section className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-white/70">
        <Link href="/tienda" className="hover:underline">Tienda</Link> <span>›</span> {p.titulo}
      </nav>

        <header className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
                <Package size={20} /> {p.titulo}
            </h1>
            <p className="mt-1 inline-flex items-center gap-2 text-white/70">
                <Tag size={16} /> SKU: {p.sku}
            </p>
        </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        {/* Izquierda: descripción / atributos */}
        <article className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-medium mb-2">Descripción</h2>
          <p className="text-white/80">
            {p.descripcion ?? "Producto sin descripción detallada por el momento."}
          </p>

          {attrs && Object.keys(attrs).length > 0 && (
            <>
              <h3 className="font-medium mt-6 mb-2">Especificaciones</h3>
              <ul className="text-white/80 text-sm space-y-1">
                {Object.entries(attrs).map(([k, v]) => (
                  <li key={k}><span className="text-white/60">{k}:</span> {String(v)}</li>
                ))}
              </ul>
            </>
          )}
        </article>

        {/* Derecha: precio/stock/CTA */}
        <aside className="h-fit rounded-2xl border border-white/10 p-6">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-lg font-semibold">
                <BadgeDollarSign size={18} />
                {formatARS(p.precio)}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/70">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Stock: {p.stock}
            </div>
            <div className="mt-4">
                <AddToCartButton productId={p.id} />
            </div>
        </aside>
      </div>
    </section>
  );
}
