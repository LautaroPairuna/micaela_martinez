'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminApi } from '@/lib/sdk/adminApi'
import useSWR from 'swr'

interface HierarchicalRecord {
  id: string
  nombre?: string
  titulo?: string
  contenido?: string
  parentId: string | null
  childrenCount?: number
  hijos?: HierarchicalRecord[]
}

interface HierarchicalSelectProps {
  tableName: string
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  className?: string
  displayField?: string // Campo a mostrar (nombre, titulo, contenido, etc.)
}

export function HierarchicalSelect({
  tableName,
  value,
  onChange,
  placeholder = "Seleccionar elemento",
  className,
  displayField = 'nombre'
}: HierarchicalSelectProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  
  // Obtener datos de la tabla
  const { data: response, error, isLoading } = useSWR(
    `admin-hierarchical-${tableName}`,
    () => adminApi.getTableData(tableName, { page: 1, limit: 1000 })
  )
  
  const records = (response?.data || []) as HierarchicalRecord[]
  
  // Organizar en estructura jerárquica
  const hierarchicalData = useMemo(() => {
    if (!records.length) return []
    
    const parentRecords = records.filter((record: HierarchicalRecord) => !record.parentId)
    const childRecords = records.filter((record: HierarchicalRecord) => record.parentId)
    
    return parentRecords.map((parent: HierarchicalRecord): HierarchicalRecord => ({
      ...parent,
      // Filtramos los hijos que pertenecen específicamente a este padre
      hijos: childRecords.filter((child: HierarchicalRecord) => child.parentId === parent.id)
    }))
  }, [records])

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const handleSelect = (itemId: string) => {
    onChange(itemId === value ? undefined : itemId)
    setIsOpen(false)
  }

  const getDisplayValue = (record: HierarchicalRecord) => {
    return record[displayField as keyof HierarchicalRecord] as string || record.id
  }

  const getSelectedItemName = () => {
    if (!value) return placeholder
    
    for (const parent of hierarchicalData) {
      if (parent.id === value) return getDisplayValue(parent)
      if (parent.hijos) {
        const child = parent.hijos.find((c: HierarchicalRecord) => c.id === value)
        if (child) return `${getDisplayValue(parent)} > ${getDisplayValue(child)}`
      }
    }
    return placeholder
  }

  const getIcon = (tableName: string, hasChildren: boolean, isExpanded: boolean) => {
    switch (tableName) {
      case 'Categoria':
        return hasChildren ? (isExpanded ? FolderOpen : Folder) : Folder
      case 'ResenaRespuesta':
        return FileText
      default:
        return hasChildren ? (isExpanded ? FolderOpen : Folder) : Folder
    }
  }

  const renderItem = (item: HierarchicalRecord, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.hijos && item.hijos.length > 0
    const isSelected = value === item.id
    const IconComponent = getIcon(tableName, !!hasChildren, isExpanded)

    return (
      <div key={item.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors",
            level > 0 && "ml-6",
            isSelected && "bg-blue-50 text-blue-700 font-medium"
          )}
          onClick={() => handleSelect(item.id)}
        >
          {/* Botón de expansión */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(item.id)
              }}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          
          {/* Icono del elemento */}
          <IconComponent className={cn(
            "h-4 w-4",
            isSelected ? "text-blue-600" : "text-gray-500"
          )} />
          
          {/* Nombre del elemento */}
          <span className="flex-1 text-sm">
            {getDisplayValue(item)}
          </span>
          
          {/* Contador de hijos */}
          {hasChildren && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {item.hijos?.length || 0}
            </span>
          )}
        </div>
        
        {/* Elementos hijos */}
        {isExpanded && hasChildren && (
          <div className="border-l border-gray-200 ml-3">
            {item.hijos?.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn(
        "w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500",
        className
      )}>
        Cargando...
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn(
        "w-full px-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-600",
        className
      )}>
        Error al cargar datos
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Selector principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium text-left flex items-center justify-between bg-white"
      >
        <span className={cn(
          "truncate",
          !value && "text-gray-500"
        )}>
          {getSelectedItemName()}
        </span>
        <ChevronDown className={cn(
          "h-5 w-5 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {hierarchicalData.length > 0 ? (
            <div className="py-2">
              {hierarchicalData.map((item: HierarchicalRecord) => renderItem(item))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No hay elementos disponibles
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

export default HierarchicalSelect