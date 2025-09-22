'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileText, Users, MessageSquare, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminApi } from '@/lib/sdk/adminApi'
import useSWR from 'swr'

// ===== Tipos base =====
type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>

// Interfaz genérica para registros jerárquicos
export interface HierarchicalRecord {
  id: string
  parentId?: string | null
  parent_id?: string | null
  childrenCount?: number
  hijos?: HierarchicalRecord[]
  children?: HierarchicalRecord[]
  // Campos adicionales dinámicos
  [key: string]: unknown
}

// Configuración de iconos por tabla
export interface TableIconConfig {
  hasChildren: {
    expanded: IconType
    collapsed: IconType
  }
  noChildren: IconType
}

// Configuración predeterminada de iconos por tabla
const DEFAULT_ICON_CONFIG: Record<string, TableIconConfig> = {
  Categoria: {
    hasChildren: { expanded: FolderOpen, collapsed: Folder },
    noChildren: Folder
  },
  ResenaRespuesta: {
    hasChildren: { expanded: MessageSquare, collapsed: MessageSquare },
    noChildren: MessageSquare
  },
  Usuario: {
    hasChildren: { expanded: Users, collapsed: Users },
    noChildren: Users
  },
  Tag: {
    hasChildren: { expanded: Tag, collapsed: Tag },
    noChildren: Tag
  },
  Modulo: {
    hasChildren: { expanded: FolderOpen, collapsed: Folder },
    noChildren: FileText
  },
  default: {
    hasChildren: { expanded: FolderOpen, collapsed: Folder },
    noChildren: Folder
  }
}

// Configuración de campos de visualización por tabla
const DEFAULT_DISPLAY_FIELDS: Record<string, string[]> = {
  Categoria: ['nombre', 'titulo', 'id'],
  ResenaRespuesta: ['contenido', 'titulo', 'nombre', 'id'],
  Usuario: ['nombre', 'email', 'username', 'id'],
  Tag: ['nombre', 'titulo', 'label', 'id'],
  Modulo: ['titulo', 'nombre', 'id'],
  default: ['nombre', 'titulo', 'label', 'name', 'id']
}

export interface GenericHierarchicalSelectProps {
  tableName: string
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  className?: string
  displayFields?: string[] // Campos a intentar mostrar en orden de prioridad
  iconConfig?: TableIconConfig // Configuración personalizada de iconos
  maxHeight?: string // Altura máxima del dropdown
  showChildrenCount?: boolean // Mostrar contador de hijos
  allowClear?: boolean // Permitir limpiar selección
  disabled?: boolean
  searchable?: boolean // Funcionalidad de búsqueda (futuro)
}

export function GenericHierarchicalSelect({
  tableName,
  value,
  onChange,
  placeholder = 'Seleccionar elemento',
  className,
  displayFields,
  iconConfig,
  maxHeight = '20rem',
  showChildrenCount = true,
  allowClear = true,
  disabled = false,
  searchable = false
}: GenericHierarchicalSelectProps) {
  // evitar warning de prop no usada (por ahora es futura)
  void searchable

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  
  // Obtener configuración de campos de visualización
  const resolvedDisplayFields = displayFields ||
    DEFAULT_DISPLAY_FIELDS[tableName] ||
    DEFAULT_DISPLAY_FIELDS.default
  
  // Obtener configuración de iconos
  const resolvedIconConfig = iconConfig ||
    DEFAULT_ICON_CONFIG[tableName] ||
    DEFAULT_ICON_CONFIG.default
  
  // Obtener datos de la tabla
  const { data: response, error, isLoading } = useSWR<{ data: HierarchicalRecord[] }>(
    `admin-hierarchical-${tableName}`,
    () => adminApi.getTableData(tableName, { page: 1, limit: 1000 }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // Cache por 30 segundos
    }
  )

  // Normalizar records en un useMemo para estabilizar dependencias
  const records = useMemo<HierarchicalRecord[]>(
    () => (response?.data ?? []),
    [response]
  )
  
  // Detectar campo de parentId dinámicamente
  const getParentIdField = (record: HierarchicalRecord): 'parentId' | 'parent_id' | null => {
    if (record.parentId !== undefined) return 'parentId'
    if (record.parent_id !== undefined) return 'parent_id'
    return null
  }
  
  // Detectar campo de hijos dinámicamente
  const getChildrenField = (record: HierarchicalRecord): 'hijos' | 'children' => {
    if (record.hijos !== undefined) return 'hijos'
    if (record.children !== undefined) return 'children'
    return 'hijos' // default
  }
  
  // Organizar en estructura jerárquica
  const hierarchicalData = useMemo<HierarchicalRecord[]>(() => {
    if (!records.length) return []
    
    // Detectar el campo de parentId del primer registro
    const parentIdField = getParentIdField(records[0])
    if (!parentIdField) return records // Si no hay campo parent, devolver todos como raíz
    
    const parentRecords = records.filter((record) => 
      !record[parentIdField] || record[parentIdField] === null
    )
    const childRecords = records.filter((record) => 
      record[parentIdField] && record[parentIdField] !== null
    )
    
    const buildHierarchy = (parentId: string): HierarchicalRecord[] => {
      return childRecords
        .filter((child) => child[parentIdField] === parentId)
        .map((child) => ({
          ...child,
          [getChildrenField(child)]: buildHierarchy(child.id)
        }))
    }
    
    return parentRecords.map((parent) => ({
      ...parent,
      [getChildrenField(parent)]: buildHierarchy(parent.id)
    }))
  }, [records])

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) newExpanded.delete(itemId)
    else newExpanded.add(itemId)
    setExpandedItems(newExpanded)
  }

  const handleSelect = (itemId: string) => {
    if (disabled) return
    
    if (allowClear && itemId === value) {
      onChange(undefined)
    } else {
      onChange(itemId)
    }
    setIsOpen(false)
  }

  const getDisplayValue = (record: HierarchicalRecord): string => {
    // Intentar campos en orden de prioridad
    for (const field of resolvedDisplayFields) {
      const v = record[field]
      if (typeof v === 'string' && v.trim()) {
        return v.trim()
      }
    }
    return record.id || 'Sin nombre'
  }

  const getSelectedItemName = (): string => {
    if (!value) return placeholder
    
    const findRecord = (items: HierarchicalRecord[], path: string[] = []): string | null => {
      for (const item of items) {
        if (item.id === value) {
          const currentPath = [...path, getDisplayValue(item)]
          return currentPath.join(' > ')
        }
        
        const childrenField = getChildrenField(item)
        const children = (item[childrenField] as HierarchicalRecord[] | undefined) ?? []
        if (children.length > 0) {
          const result = findRecord(children, [...path, getDisplayValue(item)])
          if (result) return result
        }
      }
      return null
    }
    
    return findRecord(hierarchicalData) || placeholder
  }

  const getIcon = (item: HierarchicalRecord, isExpanded: boolean): IconType => {
    const childrenField = getChildrenField(item)
    const hasChildren = ((item[childrenField] as HierarchicalRecord[] | undefined) ?? []).length > 0
    
    if (hasChildren) {
      return isExpanded ? resolvedIconConfig.hasChildren.expanded : resolvedIconConfig.hasChildren.collapsed
    }
    return resolvedIconConfig.noChildren
  }

  const renderItem = (item: HierarchicalRecord, level = 0): React.ReactNode => {
    const isExpanded = expandedItems.has(item.id)
    const childrenField = getChildrenField(item)
    const children = (item[childrenField] as HierarchicalRecord[] | undefined) ?? []
    const hasChildren = children.length > 0
    const isSelected = value === item.id
    const IconComponent = getIcon(item, isExpanded)

    return (
      <div key={item.id} className="w-full">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors',
            level > 0 && 'ml-6',
            isSelected && 'bg-blue-50 text-blue-700 font-medium',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => handleSelect(item.id)}
        >
          {/* Botón de expansión */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) toggleExpanded(item.id)
              }}
              className={cn(
                'p-0.5 hover:bg-gray-200 rounded transition-colors',
                disabled && 'cursor-not-allowed'
              )}
              disabled={disabled}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
          
          {/* Icono del elemento */}
          <IconComponent
            className={cn('h-4 w-4', isSelected ? 'text-blue-600' : 'text-gray-500')}
          />
          
          {/* Nombre del elemento */}
          <span className="flex-1 text-sm truncate">
            {getDisplayValue(item)}
          </span>
          
          {/* Contador de hijos */}
          {showChildrenCount && hasChildren && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {children.length}
            </span>
          )}
        </div>
        
        {/* Elementos hijos */}
        {isExpanded && hasChildren && (
          <div className="border-l border-gray-200 ml-3">
            {children.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          'w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
          Cargando...
        </div>
      </div>
    )
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return (
      <div
        className={cn(
          'w-full px-4 py-3 border border-red-300 rounded-xl bg-red-50 text-red-600',
          className
        )}
      >
        Error al cargar datos: {msg}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Selector principal */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 font-medium text-left flex items-center justify-between bg-white',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
        )}
      >
        <span className={cn('truncate flex-1', !value && 'text-gray-500')}>
          {getSelectedItemName()}
        </span>
        
        <div className="flex items-center gap-2">
          {/* Botón de limpiar */}
          {allowClear && value && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Limpiar selección"
            >
              <span className="text-gray-400 text-sm">×</span>
            </button>
          )}
          
          <ChevronDown
            className={cn('h-5 w-5 text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </div>
      </button>
      
      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-y-auto"
          style={{ maxHeight }}
        >
          {hierarchicalData.length > 0 ? (
            <div className="py-2">
              {hierarchicalData.map((item) => renderItem(item))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">No hay elementos disponibles</div>
          )}
        </div>
      )}
      
      {/* Overlay para cerrar */}
      {isOpen && !disabled && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  )
}

export default GenericHierarchicalSelect
