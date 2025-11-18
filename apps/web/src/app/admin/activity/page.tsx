'use client'

import React, { useEffect, useState } from 'react'
import SystemEventsPanel, { type ActivityItem } from '../components/SystemEventsPanel'
import { useAuth } from '@/contexts/AuthContext'

export default function SystemEventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        const res = await fetch('/api/admin/dashboard/stats')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const arr = Array.isArray(data?.recentActivity) ? data.recentActivity : []
        setEvents(arr as ActivityItem[])
      } catch (e: Error | unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar eventos')
      } finally {
        // noop
      }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Historial de eventos del sistema</h1>
          <p className="text-gray-600 mt-2 text-lg">Eventos de la web y del panel de administración</p>
        </div>
        {user && (
          <div className="text-sm text-gray-500">Sesión: {user.email || user.nombre || 'usuario'}</div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error al cargar datos</h3>
          <p className="text-red-700 mb-4">{error}</p>
        </div>
      )}

      {/* Panel integrado que muestra notificaciones recientes y el listado de actividad */}
      <SystemEventsPanel recentActivity={events} />
    </div>
  )
}