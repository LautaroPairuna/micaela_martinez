// src/components/account/AccountSidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User, MapPin, Heart, Package, Edit3, LogOut, Menu, X, GraduationCap, ChevronRight, Bell, Home } from 'lucide-react';
import { logout } from '@/lib/auth';

type Me = { id: string; email: string; nombre?: string | null } | null;

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

export default function AccountSidebar({ me }: { me: Me }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const initials = getInitials(me?.nombre, me?.email, 2);
  const displayName = me?.nombre?.trim() || me?.email?.split('@')[0] || 'Mi cuenta';
  const email = me?.email || '';
  
  const items = [
    { id: 'perfil',        href: '/mi-cuenta/perfil',        label: 'Perfil',        icon: User },
    { id: 'mi-aprendizaje', href: '/mi-cuenta/mi-aprendizaje', label: 'Mi Aprendizaje', icon: GraduationCap },
    { id: 'notificaciones', href: '/mi-cuenta/notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'direcciones',   href: '/mi-cuenta/direcciones',   label: 'Direcciones',   icon: MapPin },
    { id: 'favoritos',     href: '/mi-cuenta/favoritos',     label: 'Favoritos',     icon: Heart },
    { id: 'pedidos',       href: '/mi-cuenta/pedidos',       label: 'Pedidos',       icon: Package },
  ];
  
  const activeId = items.find(it => pathname === it.href || (it.href !== '/mi-cuenta' && pathname.startsWith(it.href)))?.id
    ?? (pathname === '/mi-cuenta' ? 'perfil' : undefined);

  // Cerrar menú móvil cuando cambia la ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Cerrar menú móvil al hacer clic fuera y manejar teclado
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest('[data-mobile-menu]') && !target.closest('[data-menu-trigger]')) {
        setIsMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll del body cuando el menú está abierto
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobileMenuOpen]);

  // Focus management para accesibilidad
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Focus en el primer elemento navegable del menú
      const firstFocusable = document.querySelector('[data-mobile-menu] a, [data-mobile-menu] button') as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isMobileMenuOpen]);

  const SidebarContent = () => (
    <div className="w-full h-full bg-white overflow-hidden grid grid-rows-[auto_minmax(0,1fr)_auto]">
      {/* Profile Header */}
      <div className="p-4 lg:p-6 xl:p-8 border-b border-gray-200">
        <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="relative">
            <span
              aria-hidden
              className="
                grid h-12 w-12 lg:h-16 lg:w-16 place-items-center rounded-full
                bg-[radial-gradient(75%_120%_at_30%_20%,_rgba(255,255,255,.35),_transparent_60%)]
                bg-[var(--gold)]/15 text-[var(--gold)] ring-1 ring-[var(--gold)]/40
                shadow-[inset_0_1px_0_rgba(255,255,255,.2)] font-bold text-sm lg:text-lg tracking-wide
              "
            >
              {initials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">{displayName}</h2>
            <p className="text-gray-600 text-xs lg:text-sm truncate">{email}</p>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] text-xs font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]"></div>
                Cuenta activa
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/mi-cuenta/perfil"
          className="
            inline-flex items-center justify-center gap-2 w-full
            px-4 py-2.5 font-medium text-sm lg:text-base rounded-lg
            bg-[var(--gold)] hover:bg-[var(--gold-dark)]
            text-black transition-colors duration-200
          "
        >
          <Edit3 className="h-4 w-4" />
          Editar Perfil
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-3 lg:p-4 xl:p-6 overflow-y-auto">
        {/* Botón de vuelta a la página principal */}
        <div className="mb-4">
          <Link
            href="/"
            className="
              group relative flex items-center gap-3 px-4 py-3.5 rounded-xl
              transition-all duration-300 ease-out text-sm lg:text-base font-medium
              hover:scale-[1.02] active:scale-[0.98]
              text-gray-700 hover:text-[var(--gold)] hover:bg-[var(--gold)]/5
              border border-transparent hover:border-[var(--gold)]/20
            "
          >
            <div className="
              relative p-2 rounded-lg transition-all duration-300
              bg-gray-100 text-gray-600 group-hover:bg-[var(--gold)]/10 group-hover:text-[var(--gold)]
            ">
              <Home className="h-4 w-4 flex-shrink-0" />
            </div>
            
            <span className="flex-1">Volver al Inicio</span>
            
            {/* Flecha de navegación */}
            <ChevronRight className="
              h-4 w-4 transition-all duration-300
              text-gray-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[var(--gold)]
            " />
            
            {/* Efecto de brillo en hover */}
            <div className="
              absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
              bg-gradient-to-r from-transparent via-white/10 to-transparent
              transition-opacity duration-300
            " />
          </Link>
        </div>

        {/* Separador visual */}
        <div className="border-t border-gray-200 mb-4"></div>

        <ul className="space-y-2">
          {items.map(({ id, href, label, icon: Icon }) => {
            const active = activeId === id;
            return (
              <li key={id}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'group relative flex items-center gap-3 px-4 py-3.5 rounded-xl',
                    'transition-all duration-300 ease-out text-sm lg:text-base font-medium',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    active
                      ? [
                          'text-[var(--gold)] bg-gradient-to-r from-[var(--gold)]/10 to-[var(--gold)]/5',
                          'border border-[var(--gold)]/20 shadow-lg shadow-[var(--gold)]/10'
                        ].join(' ')
                      : [
                          'text-gray-700 hover:text-[var(--gold)] hover:bg-[var(--gold)]/5',
                          'border border-transparent hover:border-[var(--gold)]/20'
                        ].join(' ')
                  ].join(' ')}
                >
                  <div className={[
                    'relative p-2 rounded-lg transition-all duration-300',
                    active 
                      ? 'bg-[var(--gold)]/15 text-[var(--gold)]'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-[var(--gold)]/10 group-hover:text-[var(--gold)]'
                  ].join(' ')}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  </div>
                  
                  <span className="flex-1">{label}</span>
                  
                  {/* Indicador de página activa */}
                  {active && (
                    <div className="w-2 h-2 rounded-full bg-[var(--gold)] shadow-lg shadow-[var(--gold)]/50" />
                  )}
                  
                  {/* Flecha de navegación */}
                  <ChevronRight className={[
                    'h-4 w-4 transition-all duration-300',
                    active 
                      ? 'text-[var(--gold)] opacity-100 translate-x-0'
                      : 'text-gray-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[var(--gold)]'
                  ].join(' ')} />
                  
                  {/* Efecto de brillo en hover */}
                  <div className={[
                    'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100',
                    'bg-gradient-to-r from-transparent via-white/10 to-transparent',
                    'transition-opacity duration-300'
                  ].join(' ')} />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 lg:p-4 xl:p-6 border-t border-[var(--border)]">
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-colors duration-200"
          onClick={async () => {
            await logout();
            window.location.href = '/auth';
          }}
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button - Solo visible en móvil */}
      <div className="lg:hidden fixed top-4 left-3 z-50">
        <button
          data-menu-trigger
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={[
            'group relative p-2 rounded-xl shadow-lg backdrop-blur-sm',
            'bg-gray-900/90 border border-gray-700/50',
            'hover:bg-gray-800 hover:shadow-xl hover:scale-105',
            'active:scale-95 transition-all duration-300 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50',
            isMobileMenuOpen ? 'bg-[var(--gold)] border-[var(--gold)]' : ''
          ].join(' ')}
          aria-label={isMobileMenuOpen ? 'Cerrar menú de cuenta' : 'Abrir menú de cuenta'}
        >
          <div className="relative w-5 h-5">
            <Menu 
              className={[
                'absolute inset-0 w-5 h-5 transition-all duration-300',
                isMobileMenuOpen 
                  ? 'opacity-0 rotate-180 scale-75 text-black' 
                  : 'opacity-100 rotate-0 scale-100 text-white group-hover:text-[var(--gold)]'
              ].join(' ')} 
            />
            <X 
              className={[
                'absolute inset-0 w-5 h-5 transition-all duration-300',
                isMobileMenuOpen 
                  ? 'opacity-100 rotate-0 scale-100 text-black' 
                  : 'opacity-0 rotate-180 scale-75 text-white'
              ].join(' ')} 
            />
          </div>
          
          {/* Indicador de estado activo */}
          <div className={[
            'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full transition-all duration-300',
            'bg-gradient-to-r from-[var(--gold)] to-[var(--gold-strong)]',
            'shadow-lg shadow-[var(--gold)]/30',
            isMobileMenuOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          ].join(' ')} />
        </button>
      </div>

      {/* Desktop Sidebar - Siempre visible en desktop */}
      <div className="hidden lg:block w-full h-full border-r border-[var(--border)]">
        <SidebarContent />
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={[
          'lg:hidden fixed inset-0 z-40 transition-all duration-500 ease-out',
          isMobileMenuOpen 
            ? 'opacity-100 backdrop-blur-sm bg-black/60' 
            : 'opacity-0 pointer-events-none bg-black/0'
        ].join(' ')}
        aria-hidden="true"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div
        data-mobile-menu
        className={[
          'lg:hidden fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw]',
          'transform transition-all duration-500 ease-out',
          'border-r border-[var(--border)] shadow-2xl',
          'bg-white/95 backdrop-blur-xl',
          isMobileMenuOpen 
            ? 'translate-x-0 opacity-100 scale-100' 
            : '-translate-x-full opacity-0 scale-95'
        ].join(' ')}
        style={{
          transformOrigin: 'left center'
        }}
      >
        <div className="relative h-full">
          {/* Gradiente decorativo */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--gold)] via-[var(--gold-strong)] to-[var(--gold)]" />
          
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Header - Muestra info del usuario cuando el menú está cerrado */}
      <div className={[
        'lg:hidden bg-white/95 backdrop-blur-xl border-b border-[var(--border)]',
        'px-4 py-4 transition-all duration-300',
        isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      ].join(' ')}>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span
                aria-hidden
                className="
                  grid h-9 w-9 place-items-center rounded-full
                  bg-gradient-to-br from-[var(--gold)] to-[var(--gold-strong)]
                  text-black font-bold text-sm shadow-lg shadow-[var(--gold)]/25
                "
              >
                {initials}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div className="text-center">
              <h2 className="font-semibold text-gray-900 text-sm">{displayName}</h2>
              <p className="text-gray-600 text-xs">{email}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}