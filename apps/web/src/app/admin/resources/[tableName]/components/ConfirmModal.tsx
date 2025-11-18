'use client'
import React, { memo } from 'react'
import { Modal } from './Modal'
import type { Row } from '../types'

type ConfirmP = {
  items: Row[]
  onConfirm: () => void
  onCancel: () => void
}

function getItemLabel(row: Row): string {
  // Evita `any`: leemos la propiedad de forma segura
  const rec = row as Record<string, unknown>
  
  // Campos comunes que podrían contener nombres descriptivos
  for (const field of ['nombre', 'titulo', 'descripcion', 'name', 'title', 'label', 'producto']) {
    if (typeof rec[field] === 'string' && rec[field]) {
      return `${String(rec[field])} (ID: ${rec['id']})`
    }
  }
  
  // Si no encontramos nada, usamos el ID
  return `ID: ${String(rec['id'])}`
}

export const ConfirmModal = memo(function ConfirmModal({
  items, onConfirm, onCancel,
}: ConfirmP) {
  // Obtenemos el nombre del recurso de la URL
  const resourceName = typeof window !== 'undefined' 
    ? window.location.pathname.split('/').pop() || 'registro'
    : 'registro';
    
  return (
    <Modal title={`Eliminar ${items.length} ${resourceName}${items.length > 1 ? 's' : ''}`} onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-gray-700">
          ¿Estás seguro de que deseas eliminar {items.length === 1 ? 'este registro' : `estos ${items.length} registros`}?
        </p>
        <p className="text-gray-700">Esta acción no se puede deshacer.</p>

        <ul className="mt-4 space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50">
          {items.map(it => (
            <li key={String(it.id)} className="text-sm text-gray-700 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
              {getItemLabel(it)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-lg shadow-red-600/25"
        >
          Eliminar registros
        </button>
      </div>
    </Modal>
  )
})
