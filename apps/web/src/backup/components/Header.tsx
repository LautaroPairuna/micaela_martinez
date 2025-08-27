"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { ShoppingBag, GraduationCap, LogIn, Menu, X, Search, ChevronRight } from "lucide-react";
import Button from "@/backup/components/ui/Button";

/* Links contextuales (mismo set que en SubHeader desktop) */
// TIENDA
const tiendaLinks = [
  { label: "Inicio", href: "/tienda" },
  { label: "Catálogo", href: "/tienda/catalogo/pagina-1" }, // ← todos los productos
] as const;

// CURSOS
const cursosLinks = [
  { label: "Inicio", href: "/cursos" },
  { label: "Todos los cursos", href: "/cursos/catalogo/pagina-1" },
  { label: "Calendario", href: "/cursos/calendario" },
] as const;

export default function Header() {
  const pathname = usePathname() || "/";
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const area: "tienda" | "cursos" = pathname.startsWith("/tienda") ? "tienda" : "cursos";

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Altura del header → var CSS para sticky del overlay
  useEffect(() => {
    const setVar = () => {
      const h = headerRef.current?.offsetHeight ?? 64;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setVar();
    window.addEventListener("resize", setVar);
    window.addEventListener("load", setVar);
    return () => {
      window.removeEventListener("resize", setVar);
      window.removeEventListener("load", setVar);
    };
  }, []);

  // Sombra al scrollear
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bloquea scroll de fondo cuando el overlay está abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  // Cierra overlay al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Helpers
  const links = area === "tienda" ? tiendaLinks : cursosLinks;
  const isActive = (href: string) => {
    const url = new URL(href, "http://x");
    const samePath =
      url.pathname === "/tienda" || url.pathname === "/cursos"
        ? pathname.startsWith(url.pathname)
        : pathname === url.pathname;
    if (!samePath) return false;
    if (!url.search) return true;
    let ok = true;
    url.searchParams.forEach((v, k) => {
      if (sp.get(k) !== v) ok = false;
    });
    return ok;
  };

  return (
    <>
      {/* HEADER */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 bg-white border-b border-neutral-200 ${scrolled ? "shadow-sm" : ""}`}
      >
        {/* 📱 Mobile: logo | toggle (derecha) — 🖥️ Desktop: 3 cols */}
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-neutral-900 md:grid-cols-3">
          {/* Col 1: Logo */}
          <div className="flex items-center justify-start">
            <Link href={"/" as Route} className="flex items-center gap-2">
              <Image
                src="/images/mica_pestanas_logo.svg"
                alt="Micaela Martínez — Extensión de Pestañas"
                width={320}
                height={44}
                priority
                className="h-8 w-auto md:h-24"
              />
            </Link>
          </div>

          {/* Col 2: Switch centrado (solo md+) */}
          <div className="hidden items-center justify-center md:flex">
            <SegmentedSwitch active={area} />
          </div>

          {/* Col 3: CTA derecha + toggle mobile */}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden md:block">
              <Button
                href={"/auth" as Route}
                variant="outline"
                size="sm"
                className="border-rose-300 text-rose-700 hover:bg-rose-100"
              >
                <LogIn size={16} />
                Ingresar
              </Button>
            </div>

            {/* Toggle móvil pegado a la derecha */}
            <button
              type="button"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 p-2 md:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-rose-200 via-amber-200 to-rose-200" />
      </header>

      {/* OVERLAY MOBILE: switch + lista contextual + búsqueda + acción única */}
      <div
        id="mobile-menu"
        className={[
          "fixed inset-x-0 top-[var(--header-h,64px)] z-40 bg-white border-b border-neutral-200 md:hidden",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-y-0" : "-translate-y-[120%]",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <div className="mx-auto max-w-6xl px-4 py-4">
          {/* Switch (única fuente de enlaces principales en móvil) */}
          <div className="mb-3">
            <SegmentedSwitch active={area} />
          </div>

          {/* Lista contextual (antes "chips" → ahora lista) */}
          <nav aria-label={area === "cursos" ? "Secciones de Academia" : "Secciones de Tienda"}>
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-neutral-50/50">
              {links.map((l) => {
                const active = isActive(l.href);
                return (
                  <li key={l.href} className="first:rounded-t-xl last:rounded-b-xl">
                    <Link
                      href={l.href as Route}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex items-center justify-between px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-rose-50 text-rose-700"
                          : "bg-white text-neutral-800 hover:bg-neutral-100",
                      ].join(" ")}
                    >
                      <span>{l.label}</span>
                      <ChevronRight size={16} className={active ? "text-rose-700" : "text-neutral-400"} aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Búsqueda contextual */}
          <form
            action={(area === "cursos" ? "/cursos" : "/tienda") as Route}
            role="search"
            className="mt-4"
            onSubmit={() => setMobileOpen(false)}
          >
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                name="q"
                defaultValue={q}
                placeholder={area === "cursos" ? "Buscar cursos..." : "Buscar productos..."}
                className="w-full rounded-full border border-neutral-300 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
                aria-label="Buscar"
              />
            </div>
          </form>

          {/* Acción secundaria (sin duplicar “Tienda/Academia”) */}
          <div className="mt-4">
            <Button href={"/auth" as Route} variant="outline" className="justify-start border-rose-300 text-rose-700">
              <LogIn size={16} /> Ingresar
            </Button>
          </div>

          <div className="py-2" />
        </div>
      </div>
    </>
  );
}

/* Switch reutilizable (Academia | Tienda) */
function SegmentedSwitch({ active }: { active: "tienda" | "cursos" }) {
  return (
    <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 p-0.5">
      {/* Slider */}
      <div className="pointer-events-none absolute inset-0 p-0.5">
        <div
          className={[
            "h-full w-1/2 rounded-lg border border-rose-200 bg-rose-50",
            "shadow-[inset_0_0_0_1px_rgba(244,63,94,.12)]",
            "transition-transform duration-200 ease-out",
            active === "tienda" ? "translate-x-full" : "translate-x-0",
          ].join(" ")}
        />
      </div>
      {/* Opciones */}
      <div className="relative z-10 grid grid-cols-2">
        <Link
          href={"/cursos" as Route}
          aria-current={active === "cursos" ? "page" : undefined}
          className={[
            "inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm transition-colors",
            active === "cursos" ? "text-rose-700" : "text-neutral-700 hover:text-neutral-900",
          ].join(" ")}
        >
          <GraduationCap size={16} />
          <span className="hidden sm:inline">Academia</span>
        </Link>
        <Link
          href={"/tienda" as Route}
          aria-current={active === "tienda" ? "page" : undefined}
          className={[
            "inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm transition-colors",
            active === "tienda" ? "text-rose-700" : "text-neutral-700 hover:text-neutral-900",
          ].join(" ")}
        >
          <ShoppingBag size={16} />
          <span className="hidden sm:inline">Tienda</span>
        </Link>
      </div>
    </div>
  );
}
