// src/app/(public)/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import type { ComponentProps, CSSProperties } from "react";
import { Section } from "@/components/layout/Section";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { getProducts, getCourses } from "@/lib/api";
import { SafeImage } from "@/components/ui/SafeImage";

/* ───────────────────── helpers UI ───────────────────── */
function TitleBand({
  title,
  tone = "111", // "111" | "000"
}: { title: string; tone?: "111" | "000" }) {
  const bg = tone === "111" ? "#111" : "var(--bg,#000)";
  return (
    <div className="relative w-full">
      <div className="absolute inset-0" style={{ background: bg }} />
      <div className="relative container-xl">
        <div className="py-5 sm:py-6 text-center">
          <h2 className="font-display uppercase tracking-[.06em] text-xl sm:text-2xl">
            {title}
          </h2>
        </div>
      </div>
      {/* líneas sutiles arriba/abajo */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
    </div>
  );
}

function SeeAllButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center rounded-xl2 px-5 py-2 text-sm font-medium
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

// Tipado para CSS custom properties (evita `any`)
type CSSVars = { [key in `--${string}`]?: string | number };

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

  const heroBg = (process.env.NEXT_PUBLIC_HERO_BG ?? "/images/hero-bg.jpg").trim();
  const heroFocalX = Number(process.env.NEXT_PUBLIC_HERO_FOCAL_X ?? 85);
  const clamped = Math.min(100, Math.max(0, heroFocalX));

  // ✅ Sin `any`: pasamos custom property tipada
  const bleedStyle: CSSProperties & CSSVars = {
    ["--hero-pos"]: `${clamped}% 50%`,
  };

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
      <Section
        width="bleed"
        padY="lg"
        bleedBackground={
          <div className="absolute inset-0" style={bleedStyle}>
            {/* ✅ SafeImage sin `style`; controlamos foco con prop */}
            <SafeImage
              src={heroBg}
              alt=""
              className="absolute inset-0 h-full w-full"
              objectPosition={`${clamped}% 50%`}
              priority
              withBg={false}
              rounded="none"
              skeleton={false}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--bg)_0%,rgba(0,0,0,0.55)_26%,rgba(0,0,0,0.32)_48%,rgba(0,0,0,0.16)_64%,transparent_80%)]" />
            <div className="absolute inset-0 mix-blend-soft-light opacity-10 bg-[radial-gradient(22rem_22rem_at_18%_30%,#f5c45155_0%,transparent_60%)]" />
          </div>
        }
        innerClassName="container-xl section-pad-y"
      >
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="text-[11px] tracking-[.16em] uppercase text-white/70">ACADEMIA & TIENDA</p>
            <h1 className="mt-2 font-display uppercase tracking-[.06em] leading-[1.5] text-2xl sm:text-4xl">
              Micaela Martinez – <span className="text-gold">Extensiones de Pestañas</span>
            </h1>
            <p className="mt-5 text-base text-white/85 max-w-prose">
              Aprendé técnicas profesionales y encontrá productos curados. Minimalismo, elegancia y resultados.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/cursos"
                className="group relative inline-flex items-center justify-center rounded-xl2 px-6 py-2.5
                           text-black shadow-[0_8px_24px_rgba(245,196,81,.22)]
                           transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(245,196,81,.28)]
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                style={{
                  background:
                    "linear-gradient(90deg, var(--gold,#F5C451) 0%, #F7D789 50%, var(--gold,#F5C451) 100%)",
                  backgroundSize: "200% 100%",
                }}
              >
                Ver cursos
              </Link>

              <Link
                href="/tienda"
                className="group relative inline-flex items-center justify-center rounded-xl2 px-6 py-2.5
                           border border-white/15 text-white/95 backdrop-blur
                           transition-all hover:-translate-y-0.5 hover:bg-white/10
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Ver tienda
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl2 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)",
                    backgroundSize: "200% 100%",
                    animation: "gradient-x 1.8s linear infinite",
                  }}
                />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5" aria-hidden />
        </div>
      </Section>

      {/* ───────── CURSOS: divisor full-width + sección en #111 ───────── */}
      <TitleBand title="CURSOS DESTACADOS" tone="111" />
      <Section
        id="cursos"
        width="xl"
        padY="lg"
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

        <div className="mt-6 flex justify-center">
          <SeeAllButton href="/cursos">Ver todos</SeeAllButton>
        </div>
      </Section>

      {/* ───────── PRODUCTOS: divisor full-width + sección negra ───────── */}
      <TitleBand title="PRODUCTOS DESTACADOS" tone="000" />
      <Section
        id="productos"
        width="xl"
        padY="lg"
        bleedBackground={<div className="absolute inset-0 bg-[var(--bg,#000)]" />}
        innerClassName={compactPadY(productCount)}
      >
        {productCount > 0 ? (
          <div className={`${compactWrap(productCount, "max-w-6xl")} grid gap-4 grid-cols-2 md:grid-cols-4`}>
            {products.slice(0, productCount).map((p, i) => (
              <ProductCard key={productKey(p, i)} p={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl2 border border-default bg-[var(--bg)]/60 p-6 text-center text-sm text-muted">
            No hay productos destacados por el momento.
          </div>
        )}

        <div className="mt-6 flex justify-center">
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
