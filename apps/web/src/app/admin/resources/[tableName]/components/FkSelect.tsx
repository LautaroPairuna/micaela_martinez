'use client'
import React from 'react'
import { useCatalog } from '../hooks/useCatalog'
import { fkConfig } from '../config'

type FkCfg = { resource: string; labelKey: string; fieldLabel: string }
type FkSelectP = {
  col: string
  value: string
  fixed: boolean
  onChange: (v: string) => void
}

// Normalizadores para admitir tanto camelCase como snake_case
function toCamelFK(key: string): string {
  if (!key) return key
  if (!key.includes('_')) return key
  return key
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    .replace(/Id$/, 'Id')
}
function toSnakeFK(key: string): string {
  if (!key) return key
  if (key.includes('_')) return key.toLowerCase()
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/_i_d$/, '_id')
    .toLowerCase()
}

export function FkSelect({ col, value, fixed, onChange }: FkSelectP) {
  // Intentar resolver config por camelCase primero y luego por snake_case
  const camelKey = toCamelFK(col)
  const snakeKey = toSnakeFK(col)
  const cfg: FkCfg | undefined = (fkConfig as Record<string, FkCfg>)[camelKey] || (fkConfig as Record<string, FkCfg>)[snakeKey]

  // Hook SIEMPRE llamado (clave vacía => SWR no fetch)
  const { options, isLoading } = useCatalog(cfg?.resource ?? '')
  const safeOptions = Array.isArray(options) ? options : []

  const fixedLabel =
    safeOptions.find((o: { id: string | number }) => String(o.id) === String(value))?.[
      cfg?.labelKey as string
    ] ?? (value || '')

  if (!cfg) {
    return (
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
      />
    )
  }

  if (fixed) {
    return (
      <>
        <input type="hidden" name={col} value={value ?? ''} />
        <input
          disabled
          value={fixedLabel}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 shadow-sm"
        />
      </>
    )
  }

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-gray-900 shadow-sm"
    >
      <option value="" disabled={isLoading}>
        {isLoading ? 'Cargando…' : '— Selecciona —'}
      </option>
      {safeOptions.map((o: Record<string, unknown>) => (
        <option key={String(o.id)} value={String(o.id)}>
          {String(o[cfg.labelKey])}
        </option>
      ))}
    </select>
  )
}
