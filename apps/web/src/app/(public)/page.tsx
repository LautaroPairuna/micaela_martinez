// src/app/(public)/page.tsx
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { Section } from "@/components/layout/Section";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { safeGetCourses, safeGetProducts, safeGetHeroImages } from "@/lib/sdk/catalogApi";
import { getMe, listEnrollments } from "@/lib/sdk/userApi";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { CoursesGridClient } from "@/components/courses/CoursesGridClient";
import HeroSection from "@/components/home/HeroSection";
import { FadeIn, StaggerContainer } from "@/components/ui/Motion";

// Forzar renderizado dinámico para evitar errores con headers()
export const dynamic = "force-dynamic";

/* ───────────────────── helpers UI ───────────────────── */
function TitleBand({
  subtitle,
  title,
  highlight,
  glowClassName,
}: {
  subtitle: string;
  title: string;
  highlight?: string;
  glowClassName?: string;
}) {
  return (
    <div className="relative w-full py-12">
      <div className="relative w-full max-w-7xl mx-auto px-4 text-center">
        {glowClassName && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={glowClassName} />
          </div>
        )}
        {/* Subtitulo */}
        <p className="text-xs md:text-sm font-bold tracking-[0.2em] text-[var(--gold)] uppercase mb-6">
          {subtitle}
        </p>

        {/* Titulo Principal */}
        <h2 className="font-display text-3xl md:text-5xl text-white leading-[1.5]">
          {title}{" "}
          {highlight && <span className="text-[var(--pink)]">{highlight}</span>}
        </h2>

        {/* Linea decorativa pequeña */}
        <div className="mt-6 mx-auto w-80 h-px bg-[var(--gold)] opacity-60" />
      </div>
    </div>
  );
}

function SeeAllButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center rounded-2xl px-8 py-3 text-sm font-semibold mt-10 min-w-[240px]
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
  description:
    "Cursos y tienda de cosmética minimalista y elegante por Micaela Pestañas.",
  alternates: { canonical: "/" },
};

export const revalidate = 300;

// Derivamos tipos desde las cards (evita any y mantiene sincronía)
type CourseMinimal = ComponentProps<typeof CourseCard>["c"];
type ProductMinimal = ComponentProps<typeof ProductCard>["p"];

// Keys seguras sin usar `any`
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
  // Usar funciones seguras que no fallan en build estático
  const [cursos, productos, heroImages] = await Promise.all([
    safeGetCourses({ sort: "relevancia", page: 1, perPage: 8 }),
    safeGetProducts({ sort: "relevancia", page: 1, perPage: 12 }),
    safeGetHeroImages(),
  ]);

  const courses: CourseMinimal[] = Array.isArray(cursos?.items)
    ? (cursos!.items as CourseMinimal[])
    : [];
  const products: ProductMinimal[] = Array.isArray(productos?.items)
    ? (productos!.items as ProductMinimal[])
    : [];

  // visibles
  const courseCount = Math.min(4, courses.length);
  const productCount = Math.min(8, products.length);

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

  const qc = new QueryClient();
  const me = await getMe({ cache: "no-store" });
  const isLoggedIn = !!me?.id;
  if (isLoggedIn) {
    await qc.prefetchQuery({
      queryKey: ["enrollments"],
      queryFn: () => listEnrollments({ cache: "no-store" }),
    });
  }

  return (
    <>
      {/* ───────── HERO ───────── */}
      {heroImages.length > 0 && (
        <section className="w-full">
          <HeroSection
            logo={
              <Image
                src="/images/mica_pestanas_logo_blanco.svg"
                alt="Micaela Pestañas"
                width={520}
                height={220}
                className="h-auto w-[260px] sm:w-[320px] md:w-[380px]"
                priority
              />
            }
            items={heroImages}
          />
        </section>
      )}

      {/* ───────── CURSOS: divisor full-width + sección en #111 ───────── */}
      <FadeIn>
        <TitleBand
          subtitle="ACADEMIA"
          title="CURSOS"
          highlight="PROFESIONALES"
          glowClassName="h-40 w-40 rounded-full bg-[#F5C451]/25 blur-[72px]"
        />
      </FadeIn>
      <Section
        id="cursos"
        width="xl"
        padY="sm"
        bleedBackground={<div className="absolute inset-0 bg-[#0d0d0d]" />}
        innerClassName={compactPadY(courseCount)}
      >
        <FadeIn delay={0.2}>
          {courseCount > 0 ? (
            <HydrationBoundary state={dehydrate(qc)}>
              <div className={`${compactWrap(courseCount, "max-w-3xl")} grid gap-5 grid-cols-1`}>
                <CoursesGridClient courses={courses.slice(0, courseCount)} isLoggedIn={isLoggedIn} />
              </div>
            </HydrationBoundary>
          ) : (
            <div className="rounded-xl2 border border-default bg-[var(--bg)]/60 p-6 text-center text-sm text-muted">
              Sin cursos por ahora. Estamos preparando novedades.
            </div>
          )}

          <div className="flex justify-center">
            <SeeAllButton href="/cursos">Ver todos</SeeAllButton>
          </div>
        </FadeIn>
      </Section>

      {/* ───────── PRODUCTOS: divisor full-width + sección negra ───────── */}
      <FadeIn>
        <TitleBand
          subtitle="TIENDA"
          title="PRODUCTOS"
          highlight="DESTACADOS"
          glowClassName="h-36 w-36 rounded-full bg-[#ff4fb2]/30 blur-[72px]"
        />
      </FadeIn>
      <Section
        id="productos"
        width="xl"
        padY="sm"
        bleedBackground={<div className="absolute inset-0 bg-[var(--bg,#0d0d0d)]" />}
        innerClassName={compactPadY(productCount)}
      >
        <FadeIn delay={0.2}>
          {productCount > 0 ? (
            <div className={`${compactWrap(productCount, "max-w-6xl")} grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4`}>
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
        </FadeIn>
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
