// src/app/(site)/tienda/page.tsx
import type { Metadata } from "next";
import ProductCard, { type ProductoMin } from "@/backup/components/ProductCard";

export const metadata: Metadata = {
  title: "Tienda Cosmética",
  description: "Productos recomendados por instructoras. Pagá con tu método favorito.",
  alternates: { canonical: "/tienda" },
};

export const dynamic = "force-dynamic";

type Marca = { id: string; slug: string; nombre: string; imagen: string | null };
type Categoria = { id: string; slug: string; nombre: string; imagen: string | null };

export default async function TiendaPage() {
  const API = process.env.NEXT_PUBLIC_API_URL!;
  // Usamos tu endpoint Nest: GET /tienda/home -> { marcas, categorias, destacados, top }
  const res = await fetch(`${API}/tienda/home`, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as {
    marcas?: Marca[]; categorias?: Categoria[];
    destacados?: Array<{
      id: string; slug: string; titulo: string; sku?: string;
      precio: number; imagen?: string | null; ratingProm?: number | null; ratingConteo: number;
    }>;
    top?: Array<{
      id: string; slug: string; titulo: string; sku?: string;
      precio: number; imagen?: string | null; ratingProm?: number | null; ratingConteo: number;
    }>;
  };

  const mapToCard = (p: any): ProductoMin => ({
    id: p.id,
    slug: p.slug,
    titulo: p.titulo,
    sku: p.sku ?? "—",                // por si el select de tu API no trae sku
    precio: p.precio ?? 0,            // centavos
    stock: undefined,                 // opcional
    rating: p.ratingProm ?? null,     // ProductCard espera "rating"
    imagen: p.imagen ?? null,
  });

  const marcas = data.marcas ?? [];
  const categorias = data.categorias ?? [];
  const destacados: ProductoMin[] = (data.destacados ?? []).map(mapToCard);
  const top: ProductoMin[] = (data.top ?? []).map(mapToCard);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 space-y-8">
      {/* 1) Slider/Hero */}
      <div className="h-48 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-neutral-200 grid place-items-center">
        <div className="text-sm text-neutral-700">Envíos a todo el país · 3 y 6 cuotas</div>
      </div>

      {/* 2) Marcas */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Marcas</h2>
        <div className="flex items-center gap-3 overflow-x-auto rounded-xl border border-neutral-200 p-3">
          {marcas.length > 0 ? marcas.map((m) => (
            <a key={m.id} href={`/tienda/catalogo/pagina-1?marca=${m.slug}`} className="h-14 w-28 shrink-0 rounded-lg bg-white ring-1 ring-neutral-200 grid place-items-center">
              {m.imagen ? <img src={m.imagen} alt={m.nombre} className="max-h-10" /> : <span className="text-xs">{m.nombre}</span>}
            </a>
          )) : <span className="text-sm text-neutral-500">Sin marcas por ahora.</span>}
        </div>
      </div>

      {/* 3) Categorías */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Categorías</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categorias.length > 0 ? categorias.map((c) => (
            <a key={c.id} href={`/tienda/catalogo/pagina-1?categoria=${c.slug}`} className="rounded-xl border border-neutral-200 p-4 text-center hover:bg-neutral-50">
              <div className="aspect-[4/3] mb-2 rounded-md overflow-hidden bg-neutral-100">
                {c.imagen && <img src={c.imagen} alt={c.nombre} className="w-full h-full object-cover" />}
              </div>
              <div className="text-sm font-medium">{c.nombre}</div>
            </a>
          )) : <p className="text-sm text-neutral-500">Sin categorías cargadas.</p>}
        </div>
      </div>

      {/* 4) Destacados */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Destacados</h2>
          <a href="/tienda/catalogo/pagina-1" className="text-sm text-rose-700 hover:underline">Ver catálogo</a>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {destacados.length > 0
            ? destacados.map((p) => <ProductCard key={p.id} p={p} />)
            : <p className="text-sm text-neutral-500">Sin productos destacados.</p>}
        </div>
      </div>

      {/* 5) Más vendidos */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Más vendidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {top.length > 0
            ? top.map((p) => <ProductCard key={p.id} p={p} />)
            : <p className="text-sm text-neutral-500">Sin ventas suficientes aún.</p>}
        </div>
      </div>
    </section>
  );
}
