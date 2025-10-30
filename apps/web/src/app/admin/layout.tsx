// D:\wamp64\www\mica_pestanas\apps\web\src\app\admin\layout.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, ChevronRight, BarChart3, Clock, ShieldAlert, Shield } from 'lucide-react'
import { AdminSidebar } from './resources/[tableName]/components/AdminSidebar'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { CrudUpdatesProvider } from '@/contexts/CrudUpdatesContext'

type AdminUser = {
  id?: string
  email?: string
  nombre?: string | null
  avatar?: string | null
  roles?: string[]
}

// Layout de administración con sidebar organizado
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <CrudUpdatesProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </CrudUpdatesProvider>
    </SidebarProvider>
  )
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  /* ---------------- hooks SIEMPRE al inicio ---------------- */
  const router = useRouter()
  const rawPath = usePathname() ?? ''
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { isOpen: mobileOpen, toggle: toggleMobileOpen, close: closeMobileOpen } = useSidebar()
  
  /* ---------------- verificación de autenticación ---------- */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const userData: AdminUser = await response.json()
          if (userData.roles?.includes('ADMIN') || userData.roles?.includes('STAFF') || userData.roles?.includes('INSTRUCTOR')) {
            setUser(userData)
          } else {
            router.replace('/auth?redirect=/admin')
            return
          }
        } else {
          setLoading(false)
          // No hacer redirect automático cuando no hay token
          return
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        setLoading(false)
        // No hacer redirect automático en caso de error
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Derivados
  const avatarUrl = user?.avatar ?? '/avatar-placeholder.svg'
  const displayName = user?.nombre ?? user?.email ?? 'Usuario'

  /* ---------------- pantalla de carga ---------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-400 border-opacity-75 mx-auto mb-4" />
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-gray-300 font-medium">Verificando sesión…</span>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse animation-delay-200"></div>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- pantalla de error de autenticación ---------------------- */
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 relative overflow-hidden">
        {/* Efectos de fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent)] pointer-events-none" />
        
        <div className="relative z-10 text-center max-w-md mx-auto px-6">
          {/* Icono de acceso denegado */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-12 h-12 text-red-400" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Acceso Denegado
          </h1>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Necesitas iniciar sesión con una cuenta autorizada para acceder al panel de administración.
          </p>
          
          <Link 
            href="/auth?redirect=/admin"
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <LogOut className="w-5 h-5" />
            Iniciar Sesión
          </Link>
          
          {/* Indicador de estado */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Acceso Restringido</span>
          </div>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      // 1. Invalidar cache de autenticación ANTES de limpiar localStorage
      const { authCache } = await import('@/lib/auth-cache');
      authCache.invalidateAll();
      
      // Usar el endpoint estandar para borrar cookie de sesión
      await fetch('/api/session', { method: 'DELETE', credentials: 'include' })
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      router.replace('/')
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 text-gray-800 backdrop-blur-sm">
      {/* ---------- Barra móvil mejorada ----------------------------- */}
      <div className="md:hidden flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 text-white p-4 shadow-xl border-b border-gray-700">
        <button 
          onClick={toggleMobileOpen} 
          aria-label="Toggle menu" 
          className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
        >
          {mobileOpen ? 
            <X className="h-6 w-6 transition-transform group-hover:scale-110"/> : 
            <Menu className="h-6 w-6 transition-transform group-hover:scale-110"/>
          }
        </button>
        
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Admin Panel</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={avatarUrl ?? '/avatar-placeholder.svg'} 
            alt="Avatar" 
            className="h-8 w-8 rounded-full object-cover border-2 border-blue-400/50 hover:border-blue-400 transition-colors" 
          />
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="p-2 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all duration-200 group"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:scale-110"/>
          </button>
        </div>
      </div>

      {/* ---------- Sidebar con AdminSidebar Component --------------------------------- */}
      <AdminSidebar 
        userRole={user?.roles?.[0] || 'ADMIN'}
        currentPath={rawPath}
        onLogout={handleLogout}
        onMobileClose={closeMobileOpen}
        className={`
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 transition-transform duration-200
        `}
      />

      {/* ---------- Contenido principal ---------------------- */}
      <main className="flex-1 flex flex-col overflow-auto">
        <header className="hidden md:flex items-center justify-between bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-200/50 px-8 py-4 shadow-lg backdrop-blur-sm relative overflow-hidden">
          {/* Efectos de fondo del header */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-purple-50/30 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
          
          {/* Título de la página con breadcrumb mejorado */}
          <div className="flex items-center gap-6 relative z-10">
            {/* Botón toggle del sidebar */}
            <button 
              onClick={toggleMobileOpen} 
              aria-label="Toggle sidebar" 
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
            >
              <Menu className="h-5 w-5 text-gray-600 transition-transform group-hover:scale-110"/>
            </button>
            
            {/* Breadcrumb dinámico */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/admin" className="hover:text-blue-600 transition-colors font-medium">
                Admin
              </Link>
              {rawPath !== '/admin' && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-700 font-medium">
                    {rawPath.split('/').pop()?.replace(/([A-Z])/g, ' $1').trim() || 'Página'}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  {rawPath === '/admin' ? 'Dashboard' : rawPath.split('/').pop()?.replace(/([A-Z])/g, ' $1').trim() || 'Admin'}
                </h1>
                <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse block"></span>
                  Panel de Administración
                </p>
              </div>
            </div>
          </div>
          
          {/* Centro - Fecha */}
          <div className="hidden xl:flex items-center gap-3 relative z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50 shadow-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </span>
            </div>
          </div>
          
          {/* Usuario y acciones */}
          <div className="flex items-center gap-4 relative z-10">
            {/* Perfil de usuario */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="text-right">
                <span className="block text-sm font-semibold text-gray-900">¡Hola, {displayName}!</span>
                <div className="flex items-center gap-2">
                  <span className="block text-xs text-gray-500">{user?.roles?.[0] || 'ADMIN'}</span>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="h-11 w-11 rounded-full object-cover border-2 border-blue-400/50 shadow-lg group-hover:border-blue-500 transition-all duration-200" 
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
              </div>
            </div>
            
            {/* Botón de logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group border border-transparent hover:border-red-200 shadow-sm hover:shadow-md"
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-6" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* === CONTENIDO PRINCIPAL === */}
        <div className="flex-1 relative overflow-auto backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.05),transparent)] opacity-60 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.05),transparent)] opacity-60 backdrop-blur-sm" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.02)_50%,transparent_75%)] bg-[length:60px_60px] backdrop-blur-sm" />
          </div>

          <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 backdrop-blur-sm">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/30 p-4 md:p-6 min-h-[calc(100vh-12rem)]">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
