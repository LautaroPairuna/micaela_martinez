'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategoryChildCounts } from '../hooks/useCategoryChildCounts'

interface Category {
  id: string
  nombre: string
  parentId: string | null
  childrenCount?: number
  hijos?: Category[]
}

interface HierarchicalCategorySelectProps {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  className?: string
}

export function HierarchicalCategorySelect({
  value,
  onChange,
  placeholder = "Seleccionar categoría",
  className
}: HierarchicalCategorySelectProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  
  // Usar el hook para obtener categorías con conteos
  const { categories: rawCategories, loading, error } = useCategoryChildCounts()
  
  // Organizar en estructura jerárquica
  const categories = React.useMemo(() => {
    if (!rawCategories.length) return []
    
    const parentCategories = rawCategories.filter((cat: Category) => !cat.parentId)
    const childCategories = rawCategories.filter((cat: Category) => cat.parentId)
    
    return parentCategories.map((parent: Category) => ({
      ...parent,
      hijos: childCategories.filter((child: Category) => child.parentId === parent.id)
    }))
  }, [rawCategories])

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleSelect = (categoryId: string) => {
    onChange(categoryId === value ? undefined : categoryId)
    setIsOpen(false)
  }

  const getSelectedCategoryName = () => {
    if (!value) return placeholder
    
    for (const parent of categories) {
      if (parent.id === value) return parent.nombre
      if (parent.hijos) {
        const child = parent.hijos.find(c => c.id === value)
        if (child) return `${parent.nombre} > ${child.nombre}`
      }
    }
    return placeholder
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = category.hijos && category.hijos.length > 0
    const isSelected = value === category.id

    return (
      <div key={category.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors",
            level > 0 && "ml-6",
            isSelected && "bg-blue-50 text-blue-700 font-medium"
          )}
          onClick={() => handleSelect(category.id)}
        >
          {/* Botón de expansión */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(category.id)
              }}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          {/* Icono de carpeta */}
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            <div className="w-4 h-4" /> // Espaciador para categorías hijas
          )}
          
          {/* Nombre de la categoría */}
          <span className="flex-1 text-sm">{category.nombre}</span>
          
          {/* Contador de hijos */}
          {hasChildren && category.childrenCount !== undefined && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
              {category.childrenCount}
            </span>
          )}
        </div>
        
        {/* Categorías hijas */}
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 ml-3">
            {category.hijos!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn("relative", className)}>
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
          Cargando categorías...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("relative", className)}>
        <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm">
          Error al cargar categorías
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Botón selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors",
          "flex items-center justify-between text-sm"
        )}
      >
        <span className={cn(
          value ? "text-gray-900" : "text-gray-500"
        )}>
          {getSelectedCategoryName()}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Opción para limpiar selección */}
          <div
            className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm text-gray-500 border-b border-gray-100"
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </div>
          
          {/* Lista de categorías */}
          {categories.length > 0 ? (
            categories.map(category => renderCategory(category))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No hay categorías disponibles
            </div>
          )}
        </div>
      )}
      
      {/* Overlay para cerrar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default HierarchicalCategorySelect