'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard,
  Settings,
  ChevronDown,
  FileText,
  Shield,
  Package,
  Tag,
  Layers,
  Image,
  Camera,
  ShoppingBag,
  LogOut
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  children?: MenuItem[];
  parentTable?: string;
  parentKey?: string;
}

interface AdminSidebarProps {
  userRole?: string;
  currentPath?: string;
  onLogout?: () => void;
  onMobileClose?: () => void;
  className?: string;
}

// Configuración de menús por rol específico
type UserRoleType = 'ADMIN' | 'STAFF' | 'INSTRUCTOR' | 'CUSTOMER';

// Mapeo de roles a nombres descriptivos
const ROLE_DESCRIPTIONS = {
  ADMIN: 'Admin Supremo',        // Manejo supremo del admin
  STAFF: 'Gestión E-commerce',   // Manejo de ecommerce
  INSTRUCTOR: 'Acceso Básico',   // Solo dashboard, sin dropdowns
  CUSTOMER: 'Usuario Común'      // Usuario común y corriente
} as const;

// Estructura de menú organizada por categorías con roles específicos
const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
    roles: ['ADMIN', 'STAFF', 'INSTRUCTOR'] // Usuario común no accede al admin
  },
  
  // === SECCIÓN ADMIN SUPREMO ===
  {
    id: 'usuarios',
    label: 'Gestión de Usuarios',
    icon: Shield,
    roles: ['ADMIN'], // Solo admin supremo
    children: [
      { id: 'Usuario', label: 'Usuarios', icon: Shield, href: '/admin/resources/Usuario', roles: ['ADMIN'] },
      { id: 'Role', label: 'Roles y Permisos', icon: Settings, href: '/admin/resources/Role', roles: ['ADMIN'] },
    ]
  },
  {
    id: 'sistema',
    label: 'Configuración del Sistema',
    icon: Settings,
    roles: ['ADMIN'], // Solo admin supremo
    children: [
      { id: 'Slider', label: 'Slider Principal', icon: Image, href: '/admin/resources/Slider', roles: ['ADMIN'] },
      { id: 'Notificacion', label: 'Notificaciones', icon: Settings, href: '/admin/resources/Notificacion', roles: ['ADMIN'] },
    ]
  },
  
  // === SECCIÓN E-COMMERCE (STAFF) ===
  {
    id: 'catalogo',
    label: 'Catálogo de Productos',
    icon: Package,
    roles: ['ADMIN', 'STAFF'], // Admin supremo + gestión ecommerce
    children: [
      { id: 'Marca', label: 'Marcas', icon: Tag, href: '/admin/resources/Marca', roles: ['ADMIN', 'STAFF'] },
      { id: 'Categoria', label: 'Categorías', icon: Layers, href: '/admin/resources/Categoria', roles: ['ADMIN', 'STAFF'] },
      { id: 'Producto', label: 'Productos', icon: Package, href: '/admin/resources/Producto', roles: ['ADMIN', 'STAFF'] },
      { id: 'ProductoImagen', label: 'Imágenes de Productos', icon: Camera, href: '/admin/resources/ProductoImagen', roles: ['ADMIN', 'STAFF'] },
    ]
  },
  {
    id: 'ordenes',
    label: 'Gestión de Órdenes',
    icon: ShoppingBag,
    roles: ['ADMIN', 'STAFF'], // Admin supremo + gestión ecommerce
    children: [
      { id: 'Orden', label: 'Órdenes de Compra', icon: ShoppingBag, href: '/admin/resources/Orden', roles: ['ADMIN', 'STAFF'] },
      { id: 'Direccion', label: 'Direcciones de Envío', icon: Settings, href: '/admin/resources/Direccion', roles: ['ADMIN', 'STAFF'] },
    ]
  },
  
  // === SECCIÓN CURSOS (SOLO ADMIN Y STAFF) ===
  {
    id: 'cursos',
    label: 'Gestión de Cursos',
    icon: FileText,
    roles: ['ADMIN', 'STAFF'], // Solo admin supremo + gestión ecommerce
    children: [
      { id: 'Curso', label: 'Cursos', icon: FileText, href: '/admin/resources/Curso', roles: ['ADMIN', 'STAFF'] },
      { id: 'Modulo', label: 'Módulos', icon: Layers, href: '/admin/resources/Modulo', roles: ['ADMIN', 'STAFF'], parentTable: 'Curso', parentKey: 'curso_id' },
      { id: 'Leccion', label: 'Lecciones', icon: FileText, href: '/admin/resources/Leccion', roles: ['ADMIN', 'STAFF'], parentTable: 'Modulo', parentKey: 'modulo_id' },
      { id: 'Inscripcion', label: 'Inscripciones', icon: Shield, href: '/admin/resources/Inscripcion', roles: ['ADMIN', 'STAFF'], parentTable: 'Curso', parentKey: 'curso_id' }, // Solo admin y staff ven inscripciones
    ]
  },
  
  // === SECCIÓN INTERACCIÓN (COMPARTIDA) ===
  {
    id: 'interaccion',
    label: 'Interacción y Reseñas',
    icon: FileText,
    roles: ['ADMIN', 'STAFF'], // Admin supremo + gestión ecommerce
    children: [
      { id: 'Resena', label: 'Todas las Reseñas', icon: FileText, href: '/admin/resources/Resena', roles: ['ADMIN', 'STAFF'] },
      { id: 'ResenaRespuesta', label: 'Respuestas a Reseñas', icon: FileText, href: '/admin/resources/ResenaRespuesta', roles: ['ADMIN', 'STAFF'] },
    ]
  }
];

// Función para obtener menús filtrados por rol
const getMenuItemsForRole = (userRole: string): MenuItem[] => {
  return menuItems.filter(item => item.roles.includes(userRole));
};

// Función para contar dropdowns disponibles por rol
const getDropdownCountForRole = (userRole: string): number => {
  return getMenuItemsForRole(userRole).filter(item => item.children && item.children.length > 0).length;
};

export function AdminSidebar({ 
  userRole = 'ADMIN', 
  currentPath, 
  onLogout, 
  onMobileClose, 
  className = '' 
}: AdminSidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['usuarios', 'catalogo', 'cursos', 'Curso', 'Modulo']));

  // ⚠️ Llamar SIEMPRE a los hooks y luego decidir qué valor usar
  const pathnameFromHook = usePathname();
  const pathname = currentPath ?? pathnameFromHook;
  const searchParams = useSearchParams();
  
  // Obtener menús filtrados por rol del usuario
  const userMenuItems = getMenuItemsForRole(userRole);
  const dropdownCount = getDropdownCountForRole(userRole);
  const roleDescription = ROLE_DESCRIPTIONS[userRole as UserRoleType] || 'Rol Desconocido';

  // Función para construir URL con filtros
  const buildFilteredUrl = (item: MenuItem, parentId?: string) => {
    if (!item.href) return '#';
    
    // Si tiene tabla padre y clave foránea, y hay un ID de padre disponible
    if (item.parentTable && item.parentKey && parentId) {
      const url = new URL(item.href, window.location.origin);
      const filters = { [item.parentKey]: parentId };
      url.searchParams.set('filters', JSON.stringify(filters));
      return url.pathname + url.search;
    }
    
    return item.href;
  };

  // Función para verificar si un elemento tiene filtros aplicados
  const hasActiveFilters = (item: MenuItem) => {
    const currentTableName = pathname.split('/').pop();
    if (currentTableName !== item.id) return false;
    
    try {
      const filtersParam = searchParams.get('filters');
      if (filtersParam) {
        const filters = JSON.parse(filtersParam);
        return Object.keys(filters).length > 0;
      }
    } catch {
      // Ignorar errores de parsing
    }
    
    return false;
  };

  // Función para obtener el ID del padre desde la URL actual
  const getParentIdFromUrl = (parentTable: string) => {
    const currentTableName = pathname.split('/').pop();
    
    // Si estamos en la tabla padre, intentar obtener filtros existentes
    if (currentTableName === parentTable) {
      try {
        const filtersParam = searchParams.get('filters');
        if (filtersParam) {
          const filters = JSON.parse(filtersParam);
          // Buscar cualquier ID que pueda ser del padre
          const possibleKeys = ['id', `${parentTable.toLowerCase()}_id`, 'curso_id', 'modulo_id', 'producto_id', 'usuario_id'];
          for (const key of possibleKeys) {
            if (filters[key]) {
              return filters[key];
            }
          }
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
    
    // Si no encontramos nada, retornar null (navegación normal)
    return null;
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const isMenuExpanded = (menuId: string) => expandedMenus.has(menuId);

  const hasPermission = (roles: string[]) => {
    return roles.includes(userRole);
  };

  const isActiveMenuItem = (item: MenuItem): boolean => {
    if (item.href && pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child => {
        if (child.href && pathname === child.href) return true;
        if (child.children) {
          return child.children.some(grandchild => grandchild.href && pathname === grandchild.href);
        }
        return false;
      });
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem) => {
    if (!hasPermission(item.roles)) return null;

    const Icon = item.icon;
    const isExpanded = isMenuExpanded(item.id);
    const isActive = isActiveMenuItem(item);

    if (item.children) {
      return (
        <div key={item.id} className="mb-1">
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
              isActive
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-100 border-l-4 border-blue-400'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center">
              <Icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${
                isActive ? 'text-blue-300' : 'text-gray-400'
              }`} />
              <span className="truncate">{item.label}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} />
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="ml-4 mt-1 space-y-1 border-l border-gray-600/50 pl-4">
              {item.children.map(child => {
                if (!hasPermission(child.roles)) return null;
                
                const ChildIcon = child.icon;
                const isChildActive = pathname === child.href;
                const isChildExpanded = isMenuExpanded(child.id);
                
                // Si el hijo tiene sus propios hijos (como Curso -> Módulo)
                if (child.children) {
                  return (
                    <div key={child.id} className="mb-1">
                      <button
                        onClick={() => toggleMenu(child.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-200 group ${
                          isChildActive
                            ? 'bg-blue-500/30 text-blue-100 font-medium'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <ChildIcon className={`w-4 h-4 mr-3 transition-transform group-hover:scale-110 ${
                            isChildActive ? 'text-blue-300' : 'text-gray-500'
                          }`} />
                          <span className="truncate">{child.label}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                          isChildExpanded ? 'rotate-180' : ''
                        }`} />
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isChildExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="ml-4 mt-1 space-y-1 border-l border-gray-600/30 pl-4">
                          {child.children.map(grandchild => {
                            if (!hasPermission(grandchild.roles)) return null;
                            
                            const GrandchildIcon = grandchild.icon;
                            const isGrandchildActive = pathname === grandchild.href;
                            
                            // Para nietos (como Lecciones), usar el ID del padre (Módulo) si está disponible
                            const grandchildUrl = buildFilteredUrl(grandchild, getParentIdFromUrl(grandchild.parentTable || ''));
                            const grandchildHasFilters = hasActiveFilters(grandchild);
                            
                            return (
                              <Link
                                key={grandchild.id}
                                href={grandchildUrl}
                                onClick={onMobileClose}
                                className={`flex items-center justify-between px-3 py-2 text-xs rounded-md transition-all duration-200 group ${
                                  isGrandchildActive
                                    ? 'bg-blue-500/40 text-blue-100 font-medium'
                                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center">
                                  <GrandchildIcon className={`w-3 h-3 mr-2 transition-transform group-hover:scale-110 ${
                                    isGrandchildActive ? 'text-blue-300' : 'text-gray-600'
                                  }`} />
                                  <span className="truncate">{grandchild.label}</span>
                                </div>
                                {grandchildHasFilters && (
                                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Filtros aplicados" />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Hijo simple sin nietos - usar filtro si tiene parentTable
                const childUrl = buildFilteredUrl(child, getParentIdFromUrl(child.parentTable || ''));
                const childHasFilters = hasActiveFilters(child);
                
                return (
                  <Link
                    key={child.id}
                    href={childUrl}
                    onClick={onMobileClose}
                    className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all duration-200 group ${
                      isChildActive
                        ? 'bg-blue-500/30 text-blue-100 font-medium'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center">
                      <ChildIcon className={`w-4 h-4 mr-3 transition-transform group-hover:scale-110 ${
                        isChildActive ? 'text-blue-300' : 'text-gray-500'
                      }`} />
                      <span className="truncate">{child.label}</span>
                    </div>
                    {childHasFilters && (
                      <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Filtros aplicados" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Elemento de menú simple (sin hijos)
    return (
      <Link
        key={item.id}
        href={item.href!}
        onClick={onMobileClose}
        className={`flex items-center px-3 py-2.5 mb-1 text-sm font-medium rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-100 border-l-4 border-blue-400'
            : 'text-gray-300 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${
          isActive ? 'text-blue-300' : 'text-gray-400'
        }`} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className={`w-80 bg-gradient-to-b from-gray-900 to-gray-800 h-screen border-r border-gray-700 fixed inset-y-0 left-0 z-20 md:static flex flex-col ${className}`}>
      {/* Header del sidebar */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Admin Panel</h2>
            <p className="text-gray-400 text-xs">{roleDescription}</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <span>Dropdowns disponibles: {dropdownCount}</span>
        </div>
      </div>

      {/* Navegación principal - área scrolleable */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          {userMenuItems.map(renderMenuItem)}
        </nav>
      </div>

      {/* Footer del sidebar - pegado al fondo */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex-shrink-0">
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center px-3 py-2.5 mb-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-red-500/20 hover:text-red-300 group"
          >
            <LogOut className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
            <span>Cerrar Sesión</span>
          </button>
        )}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Sistema Activo</span>
        </div>
      </div>
    </aside>
  );
}
