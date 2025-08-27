// Server Component
type Params = { page: string };
export const metadata = { title: "Catálogo — Tienda" };

export default async function CatalogoPage({ params }: { params: Params }) {
  const page = Number(params.page) || 1;
  // const { items, totalPages } = await getProducts({ page, pageSize: 24 });

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-end justify-between">
        <h1 className="text-xl font-semibold">Catálogo</h1>
        <span className="text-sm text-neutral-500">Página {page}</span>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(24)].map((_, i) => (
          <article key={i} className="rounded-xl border border-neutral-200 p-3 bg-white">Producto</article>
        ))}
      </div>

      {/* Paginación básica (placeholder) */}
      <nav className="mt-6 flex items-center justify-center gap-2">
        <a href={`/tienda/catalogo/pagina-${Math.max(1, page - 1)}`} className="rounded-md border px-3 py-1 text-sm">Anterior</a>
        <a href={`/tienda/catalogo/pagina-${page + 1}`} className="rounded-md border px-3 py-1 text-sm">Siguiente</a>
      </nav>
    </section>
  );
}
