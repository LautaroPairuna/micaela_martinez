'use client'
import React, { memo } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

type ModalP = {
  title: string
  onClose: () => void
  children: React.ReactNode
}
export const Modal = memo(function Modal({ title, onClose, children }: ModalP) {
  return createPortal(
    <div className="fixed inset-0 left-0 md:left-80 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-200">
        <header className="flex justify-between items-center px-8 py-5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/80">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
})
