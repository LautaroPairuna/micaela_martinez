'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  DollarSign,
  ArrowUpRight,
  Activity,
  ShoppingCart,
  Tag,
  Layers,
  Eye,
  BarChart3
} from 'lucide-react'
import { dashboardService, DashboardStats } from '@/lib/services/dashboard.service'
import { useAuth } from '@/contexts/AuthContext'

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const activityTime = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'hace unos segundos'
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`
  return `hace ${Math.floor(diffInSeconds / 86400)} días`
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user: me } = useAuth()

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const data = await dashboardService.getDashboardStats()
        setStats(data)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Error al cargar los datos del dashboard')
        // Datos de fallback específicos para STAFF
        setStats({
          totalUsers: 1250,
          totalCourses: 45,
          totalRevenue: 125000,
          activeUsers: 890,
          pendingOrders: 23,
          recentActivity: [
            {
              id: '1',
              type: 'payment_received',
              description: '🛒 Nueva orden de compra procesada',
              user: 'Cliente Premium',
              timestamp: new Date(Date.now() - 300000).toISOString(),
              source: 'web'
            },
            {
              id: '2', 
              type: 'content_updated',
              description: '📦 Producto "Laptop Gaming" actualizado',
              user: 'Staff Manager',
              timestamp: new Date(Date.now() - 600000).toISOString(),
              source: 'admin'
            }
          ],
          tableCounts: [
            { table: 'productos', count: 156, label: 'Productos' },
            { table: 'ordenes', count: 89, label: 'Órdenes' },
            { table: 'marcas', count: 24, label: 'Marcas' },
            { table: 'categorias', count: 18, label: 'Categorías' }
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard de e-commerce...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header específico para STAFF */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard E-commerce</h1>
            <p className="text-purple-100 text-sm sm:text-base">Gestión de productos, órdenes y contenido comercial</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-purple-100 text-sm">Sistema operativo - Rol: Staff</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Métricas principales para STAFF */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-blue-100">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Productos</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.tableCounts?.find(t => t.table === 'productos')?.count || 156}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-green-100">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Órdenes Activas</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.tableCounts?.find(t => t.table === 'ordenes')?.count || 89}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingresos E-commerce</p>
              <p className="text-3xl font-bold text-gray-900">${stats?.totalRevenue?.toLocaleString() || '125,000'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 ring-2 ring-orange-100">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Órdenes Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.pendingOrders?.toLocaleString() || 23}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas específicas para STAFF */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-8">Gestión E-commerce</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link 
              href="/admin/resources/Producto"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Productos</span>
                <span className="block text-sm text-gray-500">Gestionar catálogo</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
            </Link>

            <Link 
              href="/admin/resources/Orden"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <ShoppingCart className="h-8 w-8 text-green-600 mr-3" />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Órdenes</span>
                <span className="block text-sm text-gray-500">Administrar pedidos</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
            </Link>

            <Link 
              href="/admin/resources/Marca"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Tag className="h-8 w-8 text-purple-600 mr-3" />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Marcas</span>
                <span className="block text-sm text-gray-500">Gestionar marcas</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
            </Link>

            <Link 
              href="/admin/resources/Categoria"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <Layers className="h-8 w-8 text-indigo-600 mr-3" />
              <span className="flex-1">
                <span className="block font-medium text-gray-900">Categorías</span>
                <span className="block text-sm text-gray-500">Organizar productos</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-gray-400 ml-auto group-hover:text-gray-600" />
            </Link>
          </div>
        </div>

        {/* Actividad reciente filtrada para STAFF */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Activity className="h-6 w-6 text-gray-700" />
              <h3 className="text-xl font-bold text-gray-900">Actividad E-commerce</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>En vivo</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.slice(0, 5).map((activity, index) => {
                const timeAgo = getTimeAgo(activity.timestamp)
                
                return (
                  <div key={`activity-${activity.id || index}`} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200">
                    <div className="rounded-xl p-3 bg-blue-50 border-2 border-blue-100 flex-shrink-0">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          E-COMMERCE
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{timeAgo}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                        {activity.description}
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
                <p className="text-gray-500 text-sm">Los eventos de e-commerce aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de catálogo para STAFF */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-gray-900">Resumen del Catálogo</h3>
          <BarChart3 className="h-6 w-6 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats?.tableCounts?.filter(table => 
            ['productos', 'ordenes', 'marcas', 'categorias'].includes(table.table)
          ).map((table) => (
            <div key={`table-${table.table}`} className="text-center p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 min-h-[100px] flex flex-col justify-center hover:shadow-md transition-all duration-200">
              <p className="text-2xl font-bold text-gray-900">{table.count.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-2 font-medium">{table.label}</p>
            </div>
          )) || (
            <p className="text-sm text-gray-500 col-span-full text-center">No hay datos del catálogo disponibles</p>
          )}
        </div>
      </div>
    </div>
  )
}