// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { SearchBar } from '@/components/search/SearchBar';
import { CartButton } from '@/components/cart/CartButton';
import { CartPanel } from '@/components/cart/CartPanel';
import {
  Menu, X, LogIn, UserPlus, GraduationCap, ShoppingBag, HelpCircle,
  ChevronRight, Instagram, User, LogOut, ChevronDown,
  Heart, Package, LayoutDashboard, MapPin, Bell
} from 'lucide-react';

import { logout } from '@/lib/auth';
import { useSession } from '@/hooks/useSession';
import { useUnreadCount } from '@/hooks/useNotifications';

export function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner />
    </Suspense>
  );
}

/* ─────────────────────────────────────────
   Fallback (skeleton)
─────────────────────────────────────────── */
function HeaderFallback() {
  return (
    <header className="top-0 z-40 relative bg-[var(--bg)] border-b border-default py-4">
      <div className="mx-auto px-4 sm:px-6 min-[1200px]:px-8 h-16 flex items-center gap-10">
        <div className="h-20 w-[160px] rounded bg-subtle/50" aria-hidden />
        <div className="hidden min-[1200px]:flex items-center gap-6">
          <div className="h-4 w-16 rounded bg-subtle/60" />
          <div className="h-4 w-16 rounded bg-subtle/60" />
          <div className="h-4 w-16 rounded bg-subtle/60" />
        </div>
        <div className="ml-auto hidden min-[1200px]:flex items-center gap-4">
          <div className="w-80 h-9 rounded-xl2 border border-default bg-subtle/40" />
          <div className="h-4 w-20 rounded bg-subtle/60" />
          <div className="h-9 w-9 rounded-xl2 border border-default bg-subtle/40" />
          <div className="h-8 w-28 rounded-xl2 border border-default bg-subtle/40" />
        </div>
        <div className="min-[1200px]:hidden ml-auto h-10 w-24 rounded-xl2 border border-default bg-subtle/40" />
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────
   Tipos
─────────────────────────────────────────── */
type Me = {
  id: string;
  email: string;
  nombre?: string | null;
  rol?: 'ADMIN' | 'STAFF' | 'INSTRUCTOR' | 'CUSTOMER' | string | undefined;
  roles?: string[];
} | null;

/* ─────────────────────────────────────────
   Utils
─────────────────────────────────────────── */
function getInitials(nombre?: string | null, email?: string, max = 2) {
  const safe = (nombre ?? '').trim();
  if (safe) {
    const words = safe.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, Math.min(2, max)).toUpperCase();
    if (words.length > max) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    return words.slice(0, max).map(w => w[0]).join('').toUpperCase();
  }
  if (email) return (email.split('@')[0] || email).slice(0, Math.min(2, max)).toUpperCase();
  return 'U';
}

/* ─────────────────────────────────────────
   Header principal
─────────────────────────────────────────── */
function HeaderInner() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, loading, setMe } = useSession();

  // next= ruta + query actual
  const nextHref = useMemo(() => {
    const qs = searchParams?.toString();
    return qs && qs.length > 0 ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1280) setOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onLogout = async () => {
    await logout();
    // La función logout ahora maneja la limpieza completa y redirección
  };

  return (
    <header
      className={[
        'top-0 z-40 relative',
        'bg-[var(--bg)] border-b border-default py-6',
        'after:content-[""] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px',
        'after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-[var(--gold-strong)]/90 after:to-transparent',
        'after:pointer-events-none',
        scrolled ? 'shadow-[0_6px_24px_rgba(0,0,0,.06)]' : ''
      ].join(' ')}
    >
      <div className="mx-auto px-4 sm:px-6 xl:px-8 h-16 hidden xl:grid grid-cols-3 items-center gap-8">
        {/* Columna 1: Logo + Navegación */}
        <div className="flex items-center gap-x-8">
          <Link href="/" aria-label="Micaela Pestañas — Inicio" className="flex items-center">
            <Image
              src="/images/mica_pestanas_logo.svg"
              alt="Micaela Pestañas"
              width={220}
              height={40}
              priority
              sizes="(min-width:1280px) 220px, 160px"
              className="h-20 w-auto my-auto"
            />
          </Link>

          <nav className="flex items-center gap-6 text-sm" aria-label="Principal">
            <NavLink href="/cursos" active={pathname.startsWith('/cursos')}>Cursos</NavLink>
            <NavLink href="/tienda" active={pathname.startsWith('/tienda')}>Tienda</NavLink>
            <NavLink href="/ayuda"  active={pathname.startsWith('/ayuda')}>Ayuda</NavLink>
          </nav>
        </div>

        {/* Columna 2: Barra de búsqueda */}
        <div className="flex justify-center">
          <div className="w-80"><SearchBar /></div>
        </div>

        {/* Columna 3: Botones de usuario */}
        <div className="flex items-center justify-end gap-3">
          {loading ? (
            <div className="inline-flex items-center gap-3" aria-live="polite" aria-busy="true">
              <div className="h-9 w-32 rounded-xl2 border border-default bg-subtle/40" />
              <div className="h-9 w-20 rounded-xl2 border border-default bg-subtle/40" />
              <div className="h-9 w-28 rounded-xl2 border border-default bg-subtle/40" />
            </div>
          ) : me ? (
            <>
              <Link
                href="/mi-cuenta/mi-aprendizaje"
                className="inline-flex items-center gap-2 text-sm rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle"
              >
                <GraduationCap className="size-4" /> Mi aprendizaje
              </Link>

              <CartButton />

              <UserMenu me={me} onLogout={onLogout} />
            </>
          ) : (
            <>
              <Link
                href={`/auth?next=${encodeURIComponent(nextHref)}`}
                className="inline-flex items-center gap-2 text-sm rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle"
              >
                <LogIn className="size-4" /> Ingresar
              </Link>

              <CartButton />

              <Link
                href={`/auth?tab=registro&next=${encodeURIComponent(nextHref)}`}
                className="inline-flex items-center gap-2 text-sm rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle"
              >
                <UserPlus className="size-4" /> Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Versión móvil */}
       <div className="mx-auto px-4 sm:px-6 xl:hidden h-16 flex items-center gap-10">
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

        {/* Móvil */}
        <button
          className="xl:hidden ml-auto inline-flex items-center gap-2 rounded-xl2 border border-default px-3 py-2"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          <Menu className="size-4" />
          Menú
        </button>
      </div>

      {/* CartPanel como portal (siempre sobre el header) */}
      <CartPanelPortal />

      {/* Panel móvil */}
      {open && (
        <MobilePanel
          onClose={() => setOpen(false)}
          me={me}
          loading={loading}
          onLogout={onLogout}
          nextHref={nextHref}
        />
      )}
    </header>
  );
}

/* ─────────────────────────────────────────
   NavLink
─────────────────────────────────────────── */
function NavLink({ href, active, children }:{
  href:string; active?:boolean; children:React.ReactNode
}) {
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

/* ─────────────────────────────────────────
   UserMenu tipo "panel" (estructura Udemy, enlaces propios)
─────────────────────────────────────────── */
function UserMenu({ me, onLogout }:{ me: NonNullable<Me>, onLogout: ()=>void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null!); // TS-safe

  const initials = useMemo(() => getInitials(me?.nombre, me?.email, 2), [me]);
  // Verificar roles con acceso a administración (incluyendo INSTRUCTOR)
  const hasAdminAccess = me?.roles?.includes('ADMIN') || me?.roles?.includes('STAFF') || me?.roles?.includes('INSTRUCTOR');

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => firstItemRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 text-sm rounded-xl2 border border-default px-3 py-1.5 hover:bg-subtle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
      >
        <span
          aria-hidden
          className={[
            'grid size-8 place-items-center rounded-full',
            'bg-[radial-gradient(75%_120%_at_30%_20%,_rgba(255,255,255,.35),_transparent_60%)]',
            'bg-[var(--gold)]/15 text-[var(--gold-dark)] ring-1 ring-[var(--gold)]/40',
            'shadow-[inset_0_1px_0_rgba(255,255,255,.2)] font-semibold text-[12px] tracking-wide',
          ].join(' ')}
          title={me.nombre ?? me.email}
        >
          {initials}
        </span>
        <span className="max-w-[160px] truncate">{me.nombre ?? me.email}</span>
        <ChevronDown className={['size-4 opacity-70 transition-transform', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {/* Panel */}
      <div
        id="user-menu"
        ref={menuRef}
        role="menu"
        aria-label="Menú de cuenta"
        data-state={open ? 'open' : 'closed'}
        className={[
          'absolute right-0 mt-2 w-[320px] rounded-2xl border border-default bg-[var(--bg)] shadow-xl',
          'transition origin-top-right transform-gpu z-50',
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none',
        ].join(' ')}
      >
        {/* Header del panel */}
        <div className="flex items-center gap-3 p-4 border-b border-default/70">
          <span
            className={[
              'grid size-12 place-items-center rounded-full',
              'bg-[radial-gradient(75%_120%_at_30%_20%,_rgba(255,255,255,.35),_transparent_60%)]',
              'bg-[var(--gold)]/15 text-[var(--gold-dark)] ring-1 ring-[var(--gold)]/40',
              'shadow-[inset_0_1px_0_rgba(255,255,255,.2)] font-bold text-sm',
            ].join(' ')}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <div className="font-medium leading-tight truncate">{me.nombre ?? me.email}</div>
            <div className="text-xs text-muted truncate">{me.email}</div>
          </div>
        </div>

        {/* Grupo: enlaces propios */}
        <ul className="py-1 text-sm">
          <MenuItem href="/mi-cuenta/perfil" icon={<User className="size-4" />}>
            Perfil
          </MenuItem>
          <MenuItem href="/mi-cuenta/mi-aprendizaje" icon={<GraduationCap className="size-4" />}>
            Mi Aprendizaje
          </MenuItem>
          <MenuItem href="/mi-cuenta/direcciones" icon={<MapPin className="size-4" />}>
            Direcciones
          </MenuItem>
          <MenuItem href="/mi-cuenta/favoritos" icon={<Heart className="size-4" />}>
            Favoritos
          </MenuItem>
          <MenuItem href="/mi-cuenta/pedidos" icon={<Package className="size-4" />}>
            Pedidos
          </MenuItem>
          <NotificationMenuItem />

          {hasAdminAccess && (
            <MenuItem href="/admin" icon={<LayoutDashboard className="size-4" />}>
              Administración
            </MenuItem>
          )}
        </ul>

        <Separator />

        {/* Salir */}
        <div className="p-2">
          <button
            onClick={onLogout}
            className="w-full inline-flex items-center gap-2 rounded-xl2 px-3 py-2 text-left hover:bg-subtle"
            role="menuitem"
          >
            <LogOut className="size-4" /> Salir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Panel móvil — botón carrito + CTAs
─────────────────────────────────────────── */
function MobilePanel({
  onClose, me, loading, onLogout, nextHref
}: {
  onClose: () => void; me: Me; loading: boolean; onLogout: () => void; nextHref: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const DURATION = 200;
  // Corregido: Verificar correctamente los roles con acceso a administración
  const hasAdminAccess = me?.roles?.includes('ADMIN') || me?.roles?.includes('STAFF'); // Solo roles administrativos

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(() => setShow(true)));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setShow(false);
    setTimeout(onClose, DURATION);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" id="mobile-menu">
      {/* Backdrop con blur */}
      <div 
        className={[
          'fixed inset-0 bg-black/20 backdrop-blur-sm',
          'transition-opacity duration-300',
          show ? 'opacity-100' : 'opacity-0'
        ].join(' ')}
        onClick={close}
      />
      
      <div
        style={{ 
          opacity: show ? 1 : 0, 
          transform: show ? 'translateX(0)' : 'translateX(100%)' 
        }}
        data-state={show ? 'open' : 'closed'}
        className={[
          'fixed inset-y-0 right-0 w-full max-w-sm',
          'bg-gradient-to-br from-white via-white to-neutral-50/80',
          'shadow-2xl border-l border-neutral-200/50',
          'overscroll-contain overflow-y-auto',
          'transform-gpu will-change-transform',
          'transition-[transform,opacity] duration-300 ease-out',
          'motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100',
        ].join(' ')}
      >
        {/* Header mejorado */}
        <div className="sticky top-0 bg-gradient-to-r from-white via-white to-neutral-50/90 backdrop-blur-md border-b border-neutral-200/60 shadow-sm">
          <div className="px-6 py-5 flex items-center justify-between">
            <Link href="/" onClick={close} className="flex items-center group" aria-label="Inicio">
              <Image 
                src="/images/mica_pestanas_logo.svg" 
                alt="Micaela Pestañas" 
                width={180} 
                height={32} 
                className="h-12 w-auto transition-transform duration-200 group-hover:scale-105" 
                priority 
              />
            </Link>

            <button 
              onClick={close} 
              className={[
                'inline-flex items-center justify-center',
                'size-10 rounded-full',
                'bg-neutral-100 hover:bg-neutral-200',
                'border border-neutral-200/60',
                'transition-all duration-200',
                'hover:scale-105 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
              ].join(' ')}
              aria-label="Cerrar menú"
            >
              <X className="size-5 text-neutral-600" />
            </button>
          </div>
        </div>

        {/* Buscador mejorado */}
        <div className="px-6 py-4 bg-gradient-to-r from-neutral-50/50 to-white border-b border-neutral-200/60">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--gold)]/5 to-transparent rounded-xl2 pointer-events-none" />
            <SearchBar />
          </div>
        </div>

        {/* CTAs rediseñados */}
        <div className="px-6 py-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <div className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50 animate-pulse" />
              <div className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50 animate-pulse" />
            </div>
          ) : me ? (
            <div className="space-y-3">
              {/* Carrito prominente */}
              <div className="flex items-center justify-center">
                <CartButton />
              </div>
              
              {/* Botones principales */}
              <Link 
                href="/mi-cuenta" 
                onClick={close} 
                className={[
                  'w-full inline-flex items-center justify-center gap-3',
                  'px-6 py-4 rounded-2xl font-semibold text-base',
                  'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-strong)]',
                  'text-black shadow-lg shadow-[var(--gold)]/25',
                  'hover:shadow-xl hover:shadow-[var(--gold)]/30',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                ].join(' ')}
              >
                <User className="size-5 text-black" /> Mi cuenta
              </Link>
              
              <Link 
                href="/mi-cuenta/mi-aprendizaje" 
                onClick={close} 
                className={[
                  'w-full inline-flex items-center justify-center gap-3',
                  'px-6 py-4 rounded-2xl font-semibold text-base',
                  'bg-white border-2 border-[var(--gold)]/30',
                  'text-neutral-800 hover:bg-[var(--gold)]/5',
                  'hover:border-[var(--gold)] hover:scale-[1.02]',
                  'active:scale-[0.98] transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                ].join(' ')}
              >
                <GraduationCap className="size-5 text-[var(--gold)]" /> Mi Aprendizaje
              </Link>
              
              <Link 
                href="/notificaciones" 
                onClick={close} 
                className={[
                  'w-full inline-flex items-center justify-center gap-3',
                  'px-6 py-4 rounded-2xl font-semibold text-base',
                  'bg-white border-2 border-blue-200',
                  'text-neutral-800 hover:bg-blue-50',
                  'hover:border-blue-400 hover:scale-[1.02]',
                  'active:scale-[0.98] transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-300'
                ].join(' ')}
              >
                <Bell className="size-5" />
                <span>Notificaciones</span>
              </Link>
              
              {hasAdminAccess && (
                <Link
                  href="/admin"
                  onClick={close}
                  className={[
                    'w-full inline-flex items-center justify-center gap-3',
                    'px-6 py-4 rounded-2xl font-medium text-base',
                    'bg-gradient-to-r from-neutral-800 to-neutral-900',
                    'text-white shadow-lg shadow-neutral-900/25',
                    'hover:shadow-xl hover:scale-[1.02]',
                    'active:scale-[0.98] transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-neutral-500'
                  ].join(' ')}
                >
                  <LayoutDashboard className="size-5" /> Administración
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Link 
                href={`/auth?tab=registro&next=${encodeURIComponent(nextHref)}`} 
                onClick={close} 
                className={[
                  'w-full inline-flex items-center justify-center gap-3',
                  'px-6 py-4 rounded-2xl font-semibold text-base',
                  'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-strong)]',
                  'text-black shadow-lg shadow-[var(--gold)]/25',
                  'hover:shadow-xl hover:shadow-[var(--gold)]/30',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                ].join(' ')}
              >
                <UserPlus className="size-5 text-black" /> Crear cuenta
              </Link>
              
              <Link 
                href={`/auth?next=${encodeURIComponent(nextHref)}`} 
                onClick={close} 
                className={[
                  'w-full inline-flex items-center justify-center gap-3',
                  'px-6 py-4 rounded-2xl font-semibold text-base',
                  'bg-white border-2 border-[var(--gold)]/30',
                  'text-neutral-800 hover:bg-[var(--gold)]/5',
                  'hover:border-[var(--gold)] hover:scale-[1.02]',
                  'active:scale-[0.98] transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                ].join(' ')}
              >
                <LogIn className="size-5 text-[var(--gold)]" /> Ingresar
              </Link>
            </div>
          )}
        </div>

        {/* Navegación principal alineada al estilo */}
        <nav className="px-6 py-4" aria-label="Principal">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider px-4 py-2">
              Explorar
            </h3>
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/cursos" 
                  onClick={close} 
                  className={[
                    'flex items-center justify-between',
                    'px-4 py-4 rounded-xl',
                    'text-neutral-700 hover:text-neutral-900',
                    'hover:bg-gradient-to-r hover:from-[var(--gold)]/10 hover:to-transparent',
                    'transition-all duration-200',
                    'group focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] group-hover:bg-[var(--gold)]/20 transition-colors">
                      <GraduationCap className="size-5" />
                    </div>
                    <span className="font-medium text-neutral-800">Cursos</span>
                  </span>
                  <ChevronRight className="size-4 text-[var(--gold)]/60 group-hover:text-[var(--gold)] transition-colors" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/tienda" 
                  onClick={close} 
                  className={[
                    'flex items-center justify-between',
                    'px-4 py-4 rounded-xl',
                    'text-neutral-700 hover:text-neutral-900',
                    'hover:bg-gradient-to-r hover:from-[var(--gold)]/10 hover:to-transparent',
                    'transition-all duration-200',
                    'group focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-[var(--gold)]/10 group-hover:text-[var(--gold)] transition-colors">
                      <ShoppingBag className="size-5" />
                    </div>
                    <span className="font-medium text-neutral-800">Tienda</span>
                  </span>
                  <ChevronRight className="size-4 text-[var(--gold)]/60 group-hover:text-[var(--gold)] transition-colors" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/ayuda" 
                  onClick={close} 
                  className={[
                    'flex items-center justify-between',
                    'px-4 py-4 rounded-xl',
                    'text-neutral-700 hover:text-neutral-900',
                    'hover:bg-gradient-to-r hover:from-[var(--gold)]/10 hover:to-transparent',
                    'transition-all duration-200',
                    'group focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-[var(--gold)]/10 group-hover:text-[var(--gold)] transition-colors">
                      <HelpCircle className="size-5" />
                    </div>
                    <span className="font-medium text-neutral-800">Ayuda</span>
                  </span>
                  <ChevronRight className="size-4 text-[var(--gold)]/60 group-hover:text-[var(--gold)] transition-colors" />
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer alineado al estilo */}
        <div className="mt-auto bg-gradient-to-t from-[var(--gold)]/5 to-transparent border-t border-[var(--gold)]/20">
          <div className="px-6 py-5 space-y-4">
            {/* Enlaces sociales */}
            <div className="flex items-center justify-center">
              <a 
                href="https://instagram.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={[
                  'inline-flex items-center gap-2 px-4 py-2',
                  'rounded-xl text-sm font-semibold',
                  'text-neutral-700 hover:text-[var(--gold)]',
                  'hover:bg-[var(--gold)]/10 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50'
                ].join(' ')}
              >
                <Instagram className="size-4" /> Instagram
              </a>
            </div>
            
            {/* Separador decorativo */}
            <div className="flex items-center justify-center">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)]/60 to-transparent" />
            </div>
            
            {/* Logout o tagline */}
            <div className="flex items-center justify-center">
              {me && !loading ? (
                <button 
                  onClick={() => { onLogout(); close(); }} 
                  className={[
                    'inline-flex items-center gap-2 px-4 py-2',
                    'rounded-xl text-sm font-semibold',
                    'text-neutral-700 hover:text-red-600',
                    'hover:bg-red-50 transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-red-500/50'
                  ].join(' ')}
                >
                  <LogOut className="size-4" /> Salir
                </button>
              ) : (
                <span className="text-xs text-[var(--gold)] font-semibold tracking-wide">
                  Belleza minimalista · Micaela
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   CartPanel → Portal al <body> (sobre el header)
─────────────────────────────────────────── */
function CartPanelPortal() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Portal para garantizar z-index por encima del header
  return createPortal(
    <div className="z-[9999] relative">
      <CartPanel />
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────
   Auxiliares UI
─────────────────────────────────────────── */
function Separator() {
  return <div className="h-px bg-gradient-to-r from-transparent via-default/70 to-transparent my-1" />;
}

function NotificationMenuItem() {
  const { unreadCount } = useUnreadCount();
  
  return (
    <MenuItem 
      href="/mi-cuenta/notificaciones" 
      icon={
        <div className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      }
    >
      Notificaciones
    </MenuItem>
  );
}

function MenuItem({
  href, onClick, icon, children, refEl
}: {
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
  refEl?: React.RefObject<HTMLAnchorElement>;
}) {
  const cls =
    'flex items-center gap-3 px-3 py-2 hover:bg-subtle focus:bg-subtle outline-none rounded-[10px] mx-2';

  if (href) {
    return (
      <li>
        <Link ref={refEl} href={href} className={cls} role="menuitem">
          {icon && <span className="text-muted">{icon}</span>}
          <span className="flex-1">{children}</span>
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button onClick={onClick} className={cls} role="menuitem">
        {icon && <span className="text-muted">{icon}</span>}
        <span className="flex-1">{children}</span>
      </button>
    </li>
  );
}
