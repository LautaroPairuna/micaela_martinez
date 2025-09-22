// src/app/(public)/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { Section } from "@/components/layout/Section";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { getProducts, getCourses } from "@/lib/sdk/catalogApi";
import { HeroCarousel } from "@/components/ui/HeroCarousel";

/* ───────────────────── helpers UI ───────────────────── */
function TitleBand({
  title,
  tone = "gold", // "gold" | "neutral" | "dark"
}: { title: string; tone?: "gold" | "neutral" | "dark" }) {
  const getStyles = () => {
    switch (tone) {
      case "gold":
        return {
          bg: "#1a1a1a",
          text: "text-[var(--gold)]",
          accent: "var(--gold)",
          border: "border-[var(--gold)]/20"
        };
      case "neutral":
        return {
          bg: "#1a1a1a",
          text: "text-white/90",
          accent: "#888",
          border: "border-white/10"
        };
      case "dark":
      default:
        return {
          bg: "#111",
          text: "text-white",
          accent: "#666",
          border: "border-white/10"
        };
    }
  };

  const styles = getStyles();

  return (
    <div className="relative w-full">
      <div 
        className={`absolute inset-0 border-t ${styles.border}`}
        style={{ background: styles.bg }} 
      />
      <div className="relative w-full max-w-7xl mx-auto p-4">
        <div className="py-6 text-center">
          <h2 className={`font-display uppercase tracking-[.06em] text-xl sm:text-2xl font-medium ${styles.text}`}>
            {title}
          </h2>
          <div className="mt-3 mx-auto w-20 h-px opacity-60" style={{ background: styles.accent }} />
        </div>
      </div>
    </div>
  );
}

function SeeAllButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center rounded-xl2 px-5 py-2 text-sm font-medium mt-10
        border-2 border-[var(--gold,#F5C451)] text-[var(--gold,#F5C451)]
        hover:bg-[var(--gold,#F5C451)] hover:text-black
        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60
      "
    >
      {children}
    </Link>
  );
}

export const metadata: Metadata = {
  title: "Inicio",
  description: "Cursos y tienda de cosmética minimalista y elegante por Micaela Pestañas.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

// Derivamos tipos desde las cards (evita any y mantiene sincronía)
type CourseMinimal = ComponentProps<typeof CourseCard>["c"];
type ProductMinimal = ComponentProps<typeof ProductCard>["p"];

// Keys seguras sin usar `any`
const courseKey = (c: CourseMinimal, i: number) => {
  const r = c as unknown as Record<string, unknown>;
  const slug = r["slug"];
  return typeof slug === "string" ? slug : String(i);
};
const productKey = (p: ProductMinimal, i: number) => {
  const r = p as unknown as Record<string, unknown>;
  const id = r["id"];
  const slug = r["slug"];
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : typeof slug === "string"
    ? slug
    : String(i);
};



export default async function HomePage() {
  const [cursos, productos] = await Promise.all([
    getCourses({ sort: "relevancia", page: 1, perPage: 8 }),
    getProducts({ sort: "relevancia", page: 1, perPage: 12 }),
  ]);

  const courses: CourseMinimal[] = Array.isArray(cursos?.items) ? (cursos!.items as CourseMinimal[]) : [];
  const products: ProductMinimal[] = Array.isArray(productos?.items) ? (productos!.items as ProductMinimal[]) : [];

  // visibles
  const courseCount = Math.min(4, courses.length);
  const productCount = Math.min(8, products.length);

  // El componente HeroCarousel ahora obtiene las imágenes desde la API

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const searchJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/tienda?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const compactWrap = (n: number, maxW: string) => (n <= 2 ? `mx-auto ${maxW}` : "");
  const compactPadY = (n: number) => (n <= 2 ? "py-10" : "");

  return (
    <>
      {/* ───────── HERO ───────── */}
      <section className="w-full">
        <div className="grid lg:grid-cols-12 w-full">
          {/* Sección de contenido - 4 columnas */}
          <div className="lg:col-span-4 bg-[#111] flex items-center px-8 py-16">
            <div className="w-full">
              <h1 className="font-display uppercase tracking-[.08em] leading-[1.45] text-2xl sm:text-3xl lg:text-4xl">
                <span className="block text-white">Micaela Martinez - </span>
                <span className="block text-[var(--gold)] mt-2">Extenciones de Pestañas</span>
              </h1>
              
              <p className="mt-6 text-lg text-white/90 max-w-prose leading-relaxed">
                Aprendé técnicas profesionales y encontrá productos curados. 
                Minimalismo, elegancia y resultados.
              </p>
              
              <div className="mt-8 flex flex-col gap-4">
                <Link
                  href="/cursos"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-3
                             bg-[var(--gold)] text-black font-semibold
                             transition-all duration-300 hover:bg-[var(--gold-200)]"
                >
                  Explorar Cursos
                </Link>

                <Link
                  href="/tienda"
                  className="inline-flex items-center justify-center rounded-lg px-6 py-3
                             border border-white/20 text-white font-semibold
                             transition-all duration-300 hover:bg-white/10"
                >
                  Ver Tienda
                </Link>
              </div>
            </div>
          </div>
          
          {/* Carrusel de imágenes - 8 columnas */}
          <div className="lg:col-span-8">
            <HeroCarousel
              autoPlay={true}
              autoPlayInterval={6000}
              className=""
            />
          </div>
        </div>
      </section>

      {/* ───────── CURSOS: divisor full-width + sección en #111 ───────── */}
      <TitleBand title="CURSOS DESTACADOS" tone="gold" />
      <Section
        id="cursos"
        width="xl"
        padY="md"
        bleedBackground={<div className="absolute inset-0 bg-[#111]" />}
        innerClassName={compactPadY(courseCount)}
      >
        {courseCount > 0 ? (
          <div className={`${compactWrap(courseCount, "max-w-3xl")} grid gap-5 grid-cols-1 md:grid-cols-2`}>
            {courses.slice(0, courseCount).map((c, i) => (
              <CourseCard key={courseKey(c, i)} c={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 border border-default bg-[var(--bg)]/60 p-6 text-center text-sm text-muted">
            Sin cursos por ahora. Estamos preparando novedades.
          </div>
        )}

        <div className="flex justify-center">
          <SeeAllButton href="/cursos">Ver todos</SeeAllButton>
        </div>
      </Section>

      {/* ───────── PRODUCTOS: divisor full-width + sección negra ───────── */}
      <TitleBand title="PRODUCTOS DESTACADOS" tone="gold" />
      <Section
        id="productos"
        width="xl"
        padY="md"
        bleedBackground={<div className="absolute inset-0 bg-[var(--bg,#000)]" />}
        innerClassName={compactPadY(productCount)}
      >
        {productCount > 0 ? (
          <div className={`${compactWrap(productCount, "max-w-6xl")} grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4`}>
            {products.slice(0, productCount).map((p, i) => (
              <ProductCard key={productKey(p, i)} p={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 border border-default bg-[var(--bg)]/60 p-6 text-center text-sm text-muted">
            No hay productos destacados por el momento.
          </div>
        )}

        <div className="flex justify-center">
          <SeeAllButton href="/tienda">Ver todos</SeeAllButton>
        </div>
      </Section>

      {/* ───────── JSON-LD ───────── */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchJsonLd) }}
      />
    </>
  );
}
