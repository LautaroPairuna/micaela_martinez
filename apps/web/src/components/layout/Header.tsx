'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { SearchBar } from '@/components/search/SearchBar';
import { CartButton } from '@/components/cart/CartButton';
import { CartPanel } from '@/components/cart/CartPanel';
import {
  Menu, X, LogIn, UserPlus, GraduationCap, ShoppingBag, HelpCircle, ChevronRight, Instagram
} from 'lucide-react';
import { buildCursosPrettyPath, buildTiendaPrettyPath } from '@/lib/routes';

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Sombra/blur
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cerrar panel móvil automáticamente al pasar a ≥1200px
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1200) setOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header
      className={[
        'top-0 z-50 relative',
        'bg-[var(--bg)] border-b border-default py-4',
        'after:content-[""] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px',
        'after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-[var(--gold-strong)]/90 after:to-transparent',
        'after:pointer-events-none',
        scrolled ? 'shadow-[0_6px_24px_rgba(0,0,0,.06)]' : ''
      ].join(' ')}
    >
      <div className="mx-auto px-4 sm:px-6 min-[1200px]:px-8 h-16 flex items-center gap-10">
        {/* Logo */}
        <Link href="/" aria-label="Micaela Pestañas — Inicio" className="flex items-center">
          <Image
            src="/images/mica_pestanas_logo.svg"
            alt="Micaela Pestañas"
            width={220}
            height={40}
            priority
            sizes="(min-width:1200px) 220px, 160px"
            className="h-20 w-auto"
          />
        </Link>

        {/* Navegación principal (solo ≥1200px) */}
        <nav className="hidden min-[1200px]:flex items-center gap-6 text-sm">
          <NavLink href="/cursos" active={pathname.startsWith('/cursos')}>Cursos</NavLink>
          <NavLink href="/tienda" active={pathname.startsWith('/tienda')}>Tienda</NavLink>
          <NavLink href="/ayuda"  active={pathname.startsWith('/ayuda')}>Ayuda</NavLink>
        </nav>

        {/* Búsqueda + Auth (solo ≥1200px) */}
        <div className="ml-auto hidden min-[1200px]:flex items-center gap-4">
          <div className="w-80"><SearchBar /></div>
          <Link href="/auth" className="inline-flex items-center gap-2 text-sm hover:text-[var(--gold)]">
            <LogIn className="size-4" /> Ingresar
          </Link>
          <CartButton />
          <Link href="/auth?tab=registro" className="inline-flex items-center gap-2 text-sm rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle">
            <UserPlus className="size-4" /> Crear cuenta
          </Link>
        </div>

        {/* Botón móvil (solo <1200px) */}
        <button
          className="min-[1200px]:hidden ml-auto inline-flex items-center gap-2 rounded-xl2 border border-default px-3 py-2"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <Menu className="size-4" />
          Menú
        </button>
      </div>

      <CartPanel />
      {open && <MobilePanel onClose={() => setOpen(false)} />}
    </header>
  );
}

function NavLink({ href, active, children }:{ href:string; active?:boolean; children:React.ReactNode }) {
  return (
    <Link
      href={href}
      className={[
        'relative py-2 group',
        'hover:text-[var(--gold-dark)] transition-colors',
        active ? 'text-[var(--gold-dark)]' : ''
      ].join(' ')}
    >
      {children}
      <span
        aria-hidden
        className={[
          'absolute -bottom-0.5 left-0 h-[3px] rounded-full transition-all drop-shadow-[0_0_0.5px_rgba(0,0,0,.25)]',
          active ? 'w-full bg-[var(--gold-strong)]' : 'w-0 bg-[var(--gold-strong)]/80 group-hover:w-full'
        ].join(' ')}
      />
    </Link>
  );
}

function MobilePanel({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const DURATION = 200;

  useEffect(() => {
    setMounted(true);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let raf1 = 0, raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setShow(true));
    });

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setShow(false);
    setTimeout(onClose, DURATION);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" id="mobile-menu">
      <div
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(8px)',
        }}
        data-state={show ? 'open' : 'closed'}
        className={[
          'fixed inset-0 bg-white text-neutral-900',
          'overscroll-contain overflow-y-auto',
          'transform-gpu will-change-transform',
          'transition-[transform,opacity] duration-200',
          show ? 'ease-out' : 'ease-in',
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          'motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100',
        ].join(' ')}
      >
        {/* Top bar */}
        <div className="h-24 flex items-center justify-between px-4 sticky top-0 bg-white border-b border-neutral-200">
          <Link href="/" onClick={close} className="flex items-center" aria-label="Inicio">
            <Image
              src="/images/mica_pestanas_logo.svg"
              alt="Micaela Pestañas"
              width={220}
              height={40}
              className="h-16 w-auto"
              priority
            />
          </Link>
          <button
            onClick={close}
            className="inline-flex items-center gap-2 rounded-xl2 px-3 py-2 border border-neutral-200 hover:bg-neutral-50"
          >
            <X className="size-4" /> Cerrar
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b border-neutral-200">
          <SearchBar />
        </div>

        {/* CTAs Auth */}
        <div className="p-4 flex gap-3">
          <Link href="/auth" onClick={close}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl2 px-3 py-2 border border-neutral-200 hover:bg-neutral-50">
            <LogIn className="size-4" /> Ingresar
          </Link>
          <Link href="/auth?tab=registro" onClick={close}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl2 px-3 py-2 bg-[var(--gold)] text-neutral-950 hover:brightness-95">
            <UserPlus className="size-4" /> Crear cuenta
          </Link>
        </div>

        {/* Navegación principal */}
        <nav className="px-2 py-1">
          <ul className="rounded-xl2 overflow-hidden border border-neutral-200 divide-y divide-neutral-200">
            <li>
              <Link href="/cursos" onClick={close}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                <span className="inline-flex items-center gap-2"><GraduationCap className="size-4" /> Cursos</span>
                <ChevronRight className="size-4" />
              </Link>
            </li>
            <li>
              <Link href="/tienda" onClick={close}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                <span className="inline-flex items-center gap-2"><ShoppingBag className="size-4" /> Tienda</span>
                <ChevronRight className="size-4" />
              </Link>
            </li>
            <li>
              <Link href="/ayuda" onClick={close}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                <span className="inline-flex items-center gap-2"><HelpCircle className="size-4" /> Ayuda</span>
                <ChevronRight className="size-4" />
              </Link>
            </li>
          </ul>
        </nav>

        {/* Atajos */}
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium font-display mb-2">Cursos por nivel</h3>
            <div className="flex flex-wrap gap-2">
              <a href={buildCursosPrettyPath({ nivel: 'BASICO' })} onClick={close}
                 className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)]">Nivel básico</a>
              <a href={buildCursosPrettyPath({ nivel: 'INTERMEDIO' })} onClick={close}
                 className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)]">Nivel intermedio</a>
              <a href={buildCursosPrettyPath({ nivel: 'AVANZADO' })} onClick={close}
                 className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)]">Nivel avanzado</a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium font-display mb-2">Tienda rápido</h3>
            <div className="flex flex-wrap gap-2">
              <a href={buildTiendaPrettyPath({ categoria: 'kits' })} onClick={close}
                 className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)]">Categoría: kits</a>
              <a href={buildTiendaPrettyPath({ marca: 'skinlab' })} onClick={close}
                 className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)]">Marca: Skinlab</a>
              <a href={buildTiendaPrettyPath({ categoria: 'adhesivos' })} onClick={close}
                 className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-[var(--gold)] hover:text-[var(--gold)]">Categoría: adhesivos</a>
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="mt-auto p-4 border-t border-neutral-200 flex items-center justify-between">
          <a
            href="https://instagram.com/"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-[var(--gold)]"
          >
            <Instagram className="size-4" /> Instagram
          </a>
          <div className="h-px flex-1 mx-4 bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent" />
          <span className="text-xs text-muted">Belleza minimalista · Micaela</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
