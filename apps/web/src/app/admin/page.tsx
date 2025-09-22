// src/app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Calendar,
  Eye,
  ArrowUpRight,
  Activity,
  Database,
  BookOpen,
  ShoppingBag,
  UserCheck,
  Settings,
  GraduationCap,
  DollarSign,
  UserPlus,
  ClipboardList
} from 'lucide-react'
import { dashboardService, DashboardStats } from '@/lib/services/dashboard.service'
import { useAuth } from '@/contexts/AuthContext'
import StaffDashboard from './dashboards/StaffDashboard'

// Tipado de los eventos de actividad (alineado con el uso)
type ActivitySource = 'web' | 'admin' | 'system' | string
type ActivityType =
  | 'user_registered'
  | 'course_completed'
  | 'user_activity'
  | 'enrollment'
  | 'payment_received'
  | 'course_created'
  | 'content_updated'
  | 'admin_login'
  | 'system_event'
  | 'order_created'
  | 'order_updated'
  | 'product_created'
  | 'review_created'
  | 'database_sync'
  | 'cache_cleared'
  | string

type ActivityItem = {
  id?: string
  type: ActivityType
  description?: string
  timestamp: string
  user?: string
  source?: ActivitySource
  metadata?: Record<string, unknown>
}

// Función helper para calcular tiempo transcurrido
function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'hace un momento'
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)}d`
  return time.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  // Cargar datos SIEMPRE (evita hooks condicionales)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Obtener datos reales desde la API
        const dashboardStats = await dashboardService.getDashboardStats()
        setStats(dashboardStats)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('No se pudieron cargar las estadísticas del dashboard')
        setUsingFallback(true)
        
        // Fallback con datos básicos
        setStats({
          totalUsers: 0,
          totalCourses: 0,
          totalRevenue: 0,
          activeUsers: 0,
          pendingOrders: 0,
          monthlyRevenue: [0, 0, 0, 0, 0, 0],
          recentActivity: [
            {
              id: '1',
              type: 'system_event',
              description: 'Sistema iniciado en modo offline',
              timestamp: new Date().toISOString(),
              user: 'Sistema',
              source: 'system'
            },
            {
              id: '2',
              type: 'database_sync',
              description: 'Sincronización completada',
              timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
              user: 'Sistema',
              source: 'system'
            },
            {
              id: '3',
              type: 'admin_login',
              description: 'Acceso al panel',
              timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutos atrás
              user: 'Administrador',
              source: 'admin'
            }
          ],
          tableCounts: [
            { table: 'usuario', count: 0, label: 'Usuarios' },
            { table: 'curso', count: 0, label: 'Cursos' },
            { table: 'modulo', count: 0, label: 'Módulos' },
            { table: 'leccion', count: 0, label: 'Lecciones' }
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Ramas de rol seguras (sin hooks condicionales)
  if (user?.rol === 'STAFF') {
    return <StaffDashboard />
  }


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/4 mb-4 sm:mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={`loading-card-${i}`} className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Panel de administración</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar datos</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Bienvenido{user?.nombre ? `, ${user.nombre}` : ''} - Resumen general del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              Última actualización: {new Date().toLocaleTimeString()}
            </div>
            {usingFallback && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                <Database className="h-3 w-3" />
                Modo offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Layout Horizontal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-blue-100">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Usuarios</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-green-100">
              <GraduationCap className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Cursos</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingresos Totales</p>
              <p className="text-3xl font-bold text-gray-900">${stats?.totalRevenue?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-orange-100">
              <UserPlus className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Usuarios Activos</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-yellow-100">
              <ClipboardList className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Órdenes Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.pendingOrders?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-indigo-100">
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Estado del Sistema</p>
              <p className="text-2xl font-bold text-green-600">Operativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-8">Acciones Rápidas</h3>
          <div className="max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              <Link 
                href="/admin/resources/Usuario"
                className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group min-h-[60px] sm:min-h-[72px]"
              >
                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 text-sm sm:text-base truncate">Usuarios</span>
                  <span className="block text-xs sm:text-sm text-gray-500 truncate">Gestionar usuarios del sistema</span>
                </span>
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 ml-2 group-hover:text-gray-600 flex-shrink-0" />
              </Link>

              <Link 
                href="/admin/resources/Curso"
                className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group min-h-[60px] sm:min-h-[72px]"
              >
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 text-sm sm:text-base truncate">Cursos</span>
                  <span className="block text-xs sm:text-sm text-gray-500 truncate">Administrar contenido educativo</span>
                </span>
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 ml-2 group-hover:text-gray-600 flex-shrink-0" />
              </Link>

              <Link 
                href="/admin/resources/Producto"
                className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group min-h-[60px] sm:min-h-[72px]"
              >
                <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 text-sm sm:text-base truncate">Productos</span>
                  <span className="block text-xs sm:text-sm text-gray-500 truncate">Administrar catálogo de productos</span>
                </span>
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 ml-2 group-hover:text-gray-600 flex-shrink-0" />
              </Link>

              <Link 
                href="/admin/resources/Inscripcion"
                className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group min-h-[60px] sm:min-h-[72px]"
              >
                <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 mr-2 sm:mr-3 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 text-sm sm:text-base truncate">Inscripciones</span>
                  <span className="block text-xs sm:text-sm text-gray-500 truncate">Supervisar registros de estudiantes</span>
                </span>
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 ml-2 group-hover:text-gray-600 flex-shrink-0" />
              </Link>

              <Link 
                href="/admin/resources/Orden"
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <ShoppingCart className="h-8 w-8 text-indigo-600 mr-3" />
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">Órdenes</span>
                  <span className="block text-sm text-gray-500">Administrar pedidos y transacciones</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
              </Link>

              <Link 
                href="/admin/resources/Marca"
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <Eye className="h-8 w-8 text-pink-600 mr-3" />
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">Marcas</span>
                  <span className="block text-sm text-gray-500">Supervisar identidades comerciales</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
              </Link>

              <Link 
                href="/admin/resources/Categoria"
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <Calendar className="h-8 w-8 text-teal-600 mr-3" />
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">Categorías</span>
                  <span className="block text-sm text-gray-500">Organizar taxonomía de productos</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
              </Link>

              <Link 
                href="/admin/resources/Modulo"
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <BarChart3 className="h-8 w-8 text-cyan-600 mr-3" />
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">Módulos</span>
                  <span className="block text-sm text-gray-500">Administrar componentes del sistema</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
              </Link>

              <Link 
                href="/admin/resources/Resena"
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <Eye className="h-8 w-8 text-amber-600 mr-3" />
                <span className="flex-1">
                  <span className="block font-medium text-gray-900">Reseñas</span>
                  <span className="block text-sm text-gray-500">Moderar comentarios y valoraciones</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity - Sistema de Eventos Reales */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Activity className="h-6 w-6 text-gray-700" />
              <h3 className="text-xl font-bold text-gray-900">Actividad del Sistema</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>En vivo</span>
              </div>
              <Link 
                href="/admin/activity" 
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all px-3 py-2 rounded-lg hover:bg-blue-50"
              >
                Ver historial
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto space-y-4">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity: ActivityItem, index: number) => {
                // DEBUG opcional
                // console.log('🔍 DEBUG Activity:', activity)

                const getEnhancedActivityMessage = (act: ActivityItem): string => {
                  const baseMessage = act.description || 'Evento del sistema'
                  
                  const isEnhanced =
                    baseMessage.includes('🔧') ||
                    baseMessage.includes('🔄') ||
                    baseMessage.includes('💾') ||
                    baseMessage.includes('⚡') ||
                    baseMessage.includes('🛠️') ||
                    baseMessage.includes('🗑️') ||
                    baseMessage.includes('Nuevo usuario registrado:') ||
                    baseMessage.includes('Nuevo curso creado:') ||
                    baseMessage.includes('Curso actualizado:') ||
                    baseMessage.includes('Producto actualizado:') ||
                    baseMessage.includes('Nueva inscripción') ||
                    baseMessage.includes('Dashboard actualizado')

                  if (isEnhanced) return baseMessage

                  switch (act.type) {
                    case 'user_registered':
                      if (act.user && (act.metadata as Record<string, unknown> | undefined)?.email) {
                        return `👤 Nuevo usuario: ${act.user} (${String((act.metadata as Record<string, unknown>).email)})`
                      }
                      if (act.user) return `👤 Nuevo usuario registrado: ${act.user}`
                      if ((act.metadata as Record<string, unknown> | undefined)?.email) {
                        return `👤 Nuevo usuario registrado: ${String((act.metadata as Record<string, unknown>).email)}`
                      }
                      return `👤 ${baseMessage}`
                    case 'course_completed':
                      return `🎓 Curso completado${act.user ? ` por ${act.user}` : ''}`
                    case 'user_activity':
                      if (baseMessage.includes('inscripción')) return `📚 ${baseMessage}`
                      return `👥 Actividad de usuario${act.user ? ` - ${act.user}` : ''}`
                    case 'enrollment':
                      if ((act.metadata as Record<string, unknown> | undefined)?.cursoTitulo && act.user) {
                        return `📚 ${act.user} se inscribió en "${String((act.metadata as Record<string, unknown>).cursoTitulo)}"`
                      }
                      if (act.user) return `📚 ${act.user} ${baseMessage}`
                      if (
                        (act.metadata as Record<string, unknown> | undefined)?.usuarioId &&
                        (act.metadata as Record<string, unknown> | undefined)?.cursoId
                      ) {
                        const m = act.metadata as Record<string, unknown>
                        return `📚 Usuario ${String(m.usuarioId)} se inscribió al curso ${String(m.cursoId)}`
                      }
                      return `📚 ${baseMessage}`
                    case 'payment_received':
                      return `💰 Pago procesado exitosamente${act.user ? ` de ${act.user}` : ''}`
                    case 'course_created':
                      if ((act.metadata as Record<string, unknown> | undefined)?.titulo) {
                        const isNew = (act.metadata as Record<string, unknown> | undefined)?.isNew === true
                        const action = isNew ? 'Nuevo curso creado' : 'Curso actualizado'
                        return `📖 ${action}: "${String((act.metadata as Record<string, unknown>).titulo)}"`
                      }
                      if ((act.metadata as Record<string, unknown> | undefined)?.isNew === false) {
                        return `📝 Curso actualizado: ${baseMessage}`
                      }
                      return `📖 ${baseMessage}`
                    case 'content_updated':
                      if ((act.metadata as Record<string, unknown> | undefined)?.nombre && (act.metadata as Record<string, unknown> | undefined)?.precio) {
                        const m = act.metadata as Record<string, unknown>
                        return `📝 Producto actualizado: "${String(m.nombre)}" - $${String(m.precio)}`
                      }
                      if ((act.metadata as Record<string, unknown> | undefined)?.nombre) {
                        return `📦 Producto actualizado: "${String((act.metadata as Record<string, unknown>).nombre)}"`
                      }
                      return `📝 ${baseMessage}`
                    case 'admin_login':
                      return `🔐 Administrador ${act.user || 'desconocido'} ha iniciado sesión`
                    case 'system_event':
                      if (baseMessage.includes('offline') || baseMessage.includes('modo offline')) {
                        return '🔧 Sistema iniciado en modo offline - Verificar conexión a base de datos'
                      }
                      if (baseMessage.includes('backup')) return '💾 Respaldo automático del sistema completado'
                      if (baseMessage.includes('maintenance')) return '🛠️ Mantenimiento programado del sistema'
                      if (baseMessage.includes('Dashboard actualizado') || baseMessage.includes('Sistema operativo')) {
                        return '⚡ Dashboard actualizado - Sistema operativo'
                      }
                      return `⚡ ${baseMessage}`
                    case 'order_created':
                      return `🛒 Nueva orden creada${act.user ? ` por ${act.user}` : ''}`
                    case 'order_updated':
                      return `📋 Estado de orden actualizado${act.user ? ` por ${act.user}` : ''}`
                    case 'product_created':
                      return `📦 Nuevo producto agregado al catálogo${act.user ? ` por ${act.user}` : ''}`
                    case 'review_created':
                      return `⭐ Nueva reseña publicada${act.user ? ` por ${act.user}` : ''}`
                    case 'database_sync':
                      return '🔄 Sincronización de base de datos completada'
                    case 'cache_cleared':
                      return '🗑️ Caché del sistema limpiado'
                    default:
                      return baseMessage.includes('Sistema') ? `⚙️ ${baseMessage}` : `📋 ${baseMessage}`
                  }
                }

                const enhancedMessage = getEnhancedActivityMessage(activity)

                const getActivityConfig = (type: ActivityType, source?: ActivitySource) => {
                  const baseConfig = (() => {
                    switch (type) {
                      case 'user_registered': 
                        return { 
                          color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
                          icon: <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Usuario'
                        }
                      case 'course_completed': 
                      case 'user_activity':
                        return { 
                          color: 'bg-blue-100 text-blue-700 border-blue-200', 
                          icon: <GraduationCap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Actividad'
                        }
                      case 'enrollment':
                        return { 
                          color: 'bg-blue-100 text-blue-700 border-blue-200', 
                          icon: <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Inscripción'
                        }
                      case 'payment_received': 
                        return { 
                          color: 'bg-purple-100 text-purple-700 border-purple-200', 
                          icon: <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Pago'
                        }
                      case 'course_created': 
                      case 'content_updated':
                        return { 
                          color: 'bg-orange-100 text-orange-700 border-orange-200', 
                          icon: <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Contenido'
                        }
                      case 'admin_login':
                        return { 
                          color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
                          icon: <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Admin'
                        }
                      case 'system_event':
                      case 'database_sync':
                      case 'cache_cleared':
                        return { 
                          color: 'bg-gray-100 text-gray-700 border-gray-200', 
                          icon: <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Sistema'
                        }
                      case 'order_created':
                      case 'order_updated':
                        return { 
                          color: 'bg-green-100 text-green-700 border-green-200', 
                          icon: <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Orden'
                        }
                      case 'product_created':
                        return { 
                          color: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
                          icon: <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Producto'
                        }
                      case 'review_created':
                        return { 
                          color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
                          icon: <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Reseña'
                        }
                      default: 
                        return { 
                          color: 'bg-gray-100 text-gray-700 border-gray-200', 
                          icon: <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />,
                          label: 'Evento'
                        }
                    }
                  })()
                  
                  const sourceIndicator = source
                    ? ({ web: '🌐', admin: '⚙️', system: '🔧' } as Record<string, string>)[source] ?? ''
                    : ''
                  
                  return {
                    ...baseConfig,
                    sourceIndicator
                  }
                }
                
                const config = getActivityConfig(activity.type, activity.source)
                const timeAgo = getTimeAgo(activity.timestamp)
                 
                return (
                  <div
                    key={`activity-${activity.id || index}`}
                    className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-100 hover:border-gray-200"
                  >
                    <div className={`rounded-xl p-3 border-2 ${config.color} flex-shrink-0`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.color}`}>
                          {config.sourceIndicator} {config.label}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{timeAgo}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                        {enhancedMessage}
                      </p>
                      {activity.user && activity.user !== 'Sistema' && (
                        <p className="text-xs text-gray-600 mt-1 font-medium">por {activity.user}</p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-base font-semibold mb-1">No hay actividad reciente</p>
                <p className="text-gray-500 text-sm">Los eventos del sistema aparecerán aquí en tiempo real</p>
              </div>
            )}
          </div>
        </div>

        {/* Table Counts Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Resumen de Tablas</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {stats?.tableCounts?.length ? (
              stats.tableCounts.map((table) => (
                <div
                  key={`table-${table.table}`}
                  className="text-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 min-h-[100px] flex flex-col justify-center hover:shadow-md transition-all duration-200"
                >
                  <p className="text-2xl font-bold text-gray-900">{table.count.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-2 font-medium">{table.label}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 col-span-full text-center">
                No hay datos de tablas disponibles
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
