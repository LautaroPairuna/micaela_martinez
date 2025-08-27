"use client";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const tiendaViews = [
  { label: "Inicio", href: "/tienda" },
  { label: "Catálogo", href: "/tienda/catalogo/pagina-1" },
] as const;

const cursosViews = [
  { label: "Inicio", href: "/cursos" },
  { label: "Todos los cursos", href: "/cursos/catalogo/pagina-1" },
  { label: "Calendario", href: "/cursos/calendario" },
] as const;

function isActivePath(pathname: string, href: string) {
  const strip = (s: string) => s.replace(/\/+$/, "");
  const a = strip(pathname || "/");
  const b = strip(href);
  // raíz de sección + su paginación
  if (b === "/tienda") return /^\/tienda(\/pagina-\d+)?$/i.test(a) || a === "/tienda";
  if (b === "/cursos") return /^\/cursos(\/pagina-\d+)?$/i.test(a) || a === "/cursos";
  // vistas específicas (prefijo)
  return a === b || a.startsWith(b + "/");
}

export default function SubHeader() {
  const pathname = usePathname() || "/";
  const sp = useSearchParams();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const headerH =
        parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue("--header-h")) || 64;
      setStuck(window.scrollY >= headerH - 1);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  const area: "tienda" | "cursos" =
    pathname.startsWith("/tienda") ? "tienda" :
    pathname.startsWith("/cursos") ? "cursos" : "tienda";

  const views = area === "tienda" ? tiendaViews : cursosViews;

  return (
    <div
      className={[
        "hidden md:block",
        "sticky top-[var(--header-h,64px)] z-40",
        "border-b border-neutral-800",
        "bg-[#222]",
        stuck ? "shadow-[0_8px_24px_-16px_rgba(0,0,0,.6)]" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-4 py-2.5">
        <div className="grid gap-3 md:grid-cols-[1fr_20rem] md:items-center">
          <nav
            aria-label={area === "cursos" ? "Vistas de Academia" : "Vistas de Tienda"}
            className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {views.map((l) => {
              const active = isActivePath(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href as Route}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-all border outline-none",
                    active
                      ? "bg-rose-500/15 text-rose-200 border-rose-400/40 shadow-[inset_0_0_0_1px_rgba(244,63,94,.25)] focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400/50"
                      : "bg-neutral-900 text-neutral-200/90 border-neutral-800 hover:bg-neutral-800 hover:text-white focus:ring-2 focus:ring-rose-300/30 focus:border-rose-300/30",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Búsqueda contextual */}
          <form
            action={(area === "cursos" ? "/cursos" : "/tienda") as Route}
            role="search"
            className="md:justify-self-end"
          >
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                name="q"
                defaultValue={sp.get("q") ?? ""}
                placeholder={area === "cursos" ? "Buscar cursos..." : "Buscar productos..."}
                className="w-full md:w-80 rounded-full border pl-9 pr-3 py-2 text-sm outline-none bg-neutral-900 text-neutral-100 placeholder:text-neutral-400 border-neutral-800 focus:border-rose-400/40 focus:ring-2 focus:ring-rose-400/30"
                aria-label="Buscar"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
