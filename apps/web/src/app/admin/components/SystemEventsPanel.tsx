'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { Activity, Bell, BookOpen, DollarSign, Eye, Package, ShoppingBag, Settings, UserPlus, GraduationCap } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

// Tipos locales (alineados con admin/page.tsx)
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

export type ActivityItem = {
  id?: string
  type: ActivityType
  description?: string
  timestamp: string
  user?: string
  source?: ActivitySource
  metadata?: Record<string, unknown>
}

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

export default function SystemEventsPanel({ recentActivity }: { recentActivity: ActivityItem[] }) {
  const { notifications, unreadCount, loading, error } = useNotifications()

  const systemNotifications = useMemo(
    () => notifications.filter(n => n.tipo === 'SISTEMA').slice(0, 5),
    [notifications]
  )

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
        if ((act.metadata as Record<string, unknown> | undefined)?.usuarioId && (act.metadata as Record<string, unknown> | undefined)?.cursoId) {
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

  const getActivityConfig = (type: ActivityType, source?: ActivitySource) => {
    const baseConfig = (() => {
      switch (type) {
        case 'user_registered':
          return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Usuario' }
        case 'course_completed':
        case 'user_activity':
          return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <GraduationCap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Actividad' }
        case 'enrollment':
          return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Inscripción' }
        case 'payment_received':
          return { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Pago' }
        case 'course_created':
        case 'content_updated':
          return { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Contenido' }
        case 'admin_login':
          return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Admin' }
        case 'system_event':
        case 'database_sync':
        case 'cache_cleared':
          return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Sistema' }
        case 'order_created':
        case 'order_updated':
          return { color: 'bg-green-100 text-green-700 border-green-200', icon: <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Orden' }
        case 'product_created':
          return { color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Producto' }
        case 'review_created':
          return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Reseña' }
        default:
          return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5" />, label: 'Evento' }
      }
    })()

    const sourceIndicator = source ? ({ web: '🌐', admin: '⚙️', system: '🔧' } as Record<string, string>)[source] ?? '' : ''
    return { ...baseConfig, sourceIndicator }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Header igual que el panel original de Actividad */}
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
          <Link href="/admin/activity" className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all px-3 py-2 rounded-lg hover:bg-blue-50">
            Ver historial
            {/* Arrow icon inline to avoid import duplication */}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9-9m0 0H8m8 0v8" /></svg>
          </Link>
        </div>
      </div>

      {/* Bloque superior: Últimas notificaciones del sistema (estilo unificado y badge Admin) */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          {/* Subtítulo reducido para evitar doble título prominente dentro de la card */}
          <div className="text-sm">
            <div className="font-semibold text-gray-900">Últimas notificaciones</div>
            <div className="text-gray-600">Eventos administrativos y del sistema</div>
          </div>
          <div className="ml-auto text-xs text-gray-600">{unreadCount} sin leer</div>
        </div>
        {loading && <div className="text-sm text-gray-600">Cargando…</div>}
        {error && <div className="text-sm text-red-600">Error: {error}</div>}
        <div className="space-y-4">
          {systemNotifications.length === 0 ? (
            <div className="text-sm text-gray-600">No hay notificaciones de sistema.</div>
          ) : (
            systemNotifications.map((n) => {
              const time = n.creadoEn || n.fecha
              const timeAgo = time ? getTimeAgo(String(time)) : ''
              const actorName = (n.metadata as Record<string, unknown>)?.actorName as string | undefined
              const resourceName = (n.metadata as Record<string, unknown>)?.resourceName as string | undefined
              const title = n.titulo || 'Actividad del sistema'
              const message = n.mensaje || [actorName, title, resourceName].filter(Boolean).join(' ')
              const source = ((n.metadata as Record<string, unknown>)?.source as string) || 'admin'

              const color = 'bg-indigo-100 text-indigo-700 border-indigo-200'
              const icon = <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              const label = 'Admin'
              const sourceIndicator = ({ web: '🌐', admin: '⚙️', system: '🔧' } as Record<string, string>)[source] ?? '⚙️'

              return (
                <div key={n.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-100 hover:border-gray-200">
                  <div className={`rounded-xl p-3 border-2 ${color} flex-shrink-0`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${color}`}>
                        {sourceIndicator} {label}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{timeAgo}</span>
                    </div>
                    {/* Mensaje principal sin duplicar el título de la card */}
                    <p className="text-sm font-semibold text-gray-900 leading-relaxed">{message}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Lista de actividad (igual que el panel original) */}
      <div className="max-h-[600px] overflow-y-auto space-y-4">
        {recentActivity && recentActivity.length > 0 ? (
          recentActivity.map((activity: ActivityItem, index: number) => {
            const enhancedMessage = getEnhancedActivityMessage(activity)
            const config = getActivityConfig(activity.type, activity.source)
            const timeAgo = getTimeAgo(activity.timestamp)
            return (
              <div key={`activity-${activity.id || index}`} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-100 hover:border-gray-200">
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
                  <p className="text-sm font-semibold text-gray-900 leading-relaxed">{enhancedMessage}</p>
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
  )
}