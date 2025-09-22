'use client';

import { useMemo } from 'react';

// Tipos de roles del sistema
export type UserRole = 'ADMIN' | 'STAFF' | 'INSTRUCTOR' | 'CUSTOMER';

// Secciones disponibles en el dropdown
export type Section =
  | 'usuarios'
  | 'sistema'
  | 'catalogo'
  | 'ordenes'
  | 'cursos'
  | 'interaccion';

const ALL_SECTIONS: readonly Section[] = [
  'usuarios',
  'sistema',
  'catalogo',
  'ordenes',
  'cursos',
  'interaccion',
] as const;

function isSection(value: string): value is Section {
  return (ALL_SECTIONS as readonly string[]).includes(value);
}

// Configuración de permisos por rol
const ROLE_PERMISSIONS = {
  ADMIN: {
    name: 'Admin Supremo',
    description: 'Acceso completo al sistema',
    canAccessAdmin: true,
    permissions: {
      // Gestión de usuarios
      manageUsers: true,
      manageRoles: true,

      // Sistema
      systemConfig: true,
      notifications: true,

      // E-commerce
      manageCatalog: true,
      manageOrders: true,
      manageProducts: true,

      // Cursos
      manageCourses: true,
      manageModules: true,
      manageLessons: true,
      viewEnrollments: true,

      // Interacción
      manageReviews: true,
      manageResponses: true,

      // Operaciones avanzadas
      bulkOperations: true,
      exportData: true,
      auditLogs: true,
    },
  },

  STAFF: {
    name: 'Gestión E-commerce',
    description: 'Manejo de productos y órdenes',
    canAccessAdmin: true,
    permissions: {
      // Gestión de usuarios
      manageUsers: false,
      manageRoles: false,

      // Sistema
      systemConfig: false,
      notifications: false,

      // E-commerce
      manageCatalog: true,
      manageOrders: true,
      manageProducts: true,

      // Cursos
      manageCourses: true,
      manageModules: true,
      manageLessons: true,
      viewEnrollments: true,

      // Interacción
      manageReviews: true,
      manageResponses: true,

      // Operaciones avanzadas
      bulkOperations: false,
      exportData: true,
      auditLogs: false,
    },
  },

  INSTRUCTOR: {
    name: 'Acceso Básico',
    description: 'Solo acceso al dashboard administrativo',
    canAccessAdmin: true,
    permissions: {
      // Gestión de usuarios
      manageUsers: false,
      manageRoles: false,

      // Sistema
      systemConfig: false,
      notifications: false,

      // E-commerce
      manageCatalog: false,
      manageOrders: false,
      manageProducts: false,

      // Cursos - Sin acceso
      manageCourses: false,
      manageModules: false,
      manageLessons: false,
      viewEnrollments: false,

      // Interacción
      manageReviews: false,
      manageResponses: false,

      // Operaciones avanzadas
      bulkOperations: false,
      exportData: false,
      auditLogs: false,
    },
  },

  CUSTOMER: {
    name: 'Usuario Común',
    description: 'Usuario final del sistema',
    canAccessAdmin: false,
    permissions: {
      // Sin permisos administrativos
      manageUsers: false,
      manageRoles: false,
      systemConfig: false,
      notifications: false,
      manageCatalog: false,
      manageOrders: false,
      manageProducts: false,
      manageCourses: false,
      manageModules: false,
      manageLessons: false,
      viewEnrollments: false,
      manageReviews: false,
      manageResponses: false,
      bulkOperations: false,
      exportData: false,
      auditLogs: false,
    },
  },
} as const;

type RolePermissionConfig = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];

// Configuración de dropdowns por rol, tipada con Section
const DROPDOWN_CONFIG: Record<
  UserRole,
  { count: number; sections: Section[] }
> = {
  ADMIN: {
    count: 5,
    sections: ['usuarios', 'sistema', 'catalogo', 'ordenes', 'cursos', 'interaccion'],
  },
  STAFF: {
    count: 4,
    sections: ['catalogo', 'ordenes', 'cursos', 'interaccion'],
  },
  INSTRUCTOR: {
    count: 1,
    sections: ['cursos'],
  },
  CUSTOMER: {
    count: 0,
    sections: [],
  },
};

interface UseRolePermissionsProps {
  userRole?: string | string[];
}

export function useRolePermissions({ userRole }: UseRolePermissionsProps = {}) {
  // Normalizar el rol del usuario
  const normalizedRole = useMemo<UserRole>(() => {
    if (!userRole) return 'CUSTOMER';

    // Si es un array, tomar el rol con mayor prioridad
    if (Array.isArray(userRole)) {
      const roleHierarchy: UserRole[] = ['ADMIN', 'STAFF', 'INSTRUCTOR', 'CUSTOMER'];
      for (const role of roleHierarchy) {
        if (userRole.includes(role)) {
          return role;
        }
      }
      return 'CUSTOMER';
    }

    return (userRole as UserRole) || 'CUSTOMER';
  }, [userRole]);

  // Obtener configuración del rol
  const roleConfig = useMemo<RolePermissionConfig>(() => {
    return ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.CUSTOMER;
  }, [normalizedRole]);

  // Obtener configuración de dropdowns
  const dropdownConfig = useMemo(() => {
    return DROPDOWN_CONFIG[normalizedRole] || DROPDOWN_CONFIG.CUSTOMER;
  }, [normalizedRole]);

  // Funciones de utilidad para verificar permisos
  const hasPermission = useMemo(() => {
    return (permission: keyof typeof ROLE_PERMISSIONS.ADMIN.permissions): boolean => {
      return !!roleConfig.permissions[permission];
    };
  }, [roleConfig]);

  const canAccessSection = useMemo(() => {
    return (section: string): boolean => {
      if (!isSection(section)) return false;
      return dropdownConfig.sections.includes(section);
    };
  }, [dropdownConfig]);

  const hasAnyRole = useMemo(() => {
    return (roles: UserRole[]): boolean => {
      return roles.includes(normalizedRole);
    };
  }, [normalizedRole]);

  // Información del rol actual
  const roleInfo = useMemo(() => {
    return {
      role: normalizedRole,
      name: roleConfig.name,
      description: roleConfig.description,
      canAccessAdmin: roleConfig.canAccessAdmin,
      dropdownCount: dropdownConfig.count,
      availableSections: dropdownConfig.sections,
    };
  }, [normalizedRole, roleConfig, dropdownConfig]);

  // Verificaciones rápidas de rol
  const isAdmin = normalizedRole === 'ADMIN';
  const isStaff = normalizedRole === 'STAFF';
  const isInstructor = normalizedRole === 'INSTRUCTOR';
  const isCustomer = normalizedRole === 'CUSTOMER';

  return {
    // Información del rol
    roleInfo,

    // Verificaciones de rol
    isAdmin,
    isStaff,
    isInstructor,
    isCustomer,

    // Funciones de permisos
    hasPermission,
    canAccessSection,
    hasAnyRole,

    // Configuración de dropdowns
    dropdownCount: dropdownConfig.count,
    availableSections: dropdownConfig.sections,

    // Permisos específicos (para fácil acceso)
    permissions: roleConfig.permissions,

    // Función para verificar si puede acceder a una ruta específica
    canAccessRoute: (requiredRoles: UserRole[]) => {
      return requiredRoles.includes(normalizedRole);
    },

    // Función para obtener el nivel de acceso
    getAccessLevel: () => {
      const levels: Record<UserRole, number> = {
        ADMIN: 4,
        STAFF: 3,
        INSTRUCTOR: 2,
        CUSTOMER: 1,
      };
      return levels[normalizedRole] ?? 1;
    },
  };
}

// Hook simplificado para componentes que solo necesitan verificar permisos básicos
export function useSimplePermissions(userRole?: string | string[]) {
  const { isAdmin, isStaff, isInstructor, isCustomer, canAccessRoute, roleInfo } =
    useRolePermissions({ userRole });

  return {
    isAdmin,
    isStaff,
    isInstructor,
    isCustomer,
    canAccessAdmin: roleInfo.canAccessAdmin,
    canAccessRoute,
    dropdownCount: roleInfo.dropdownCount,
    roleName: roleInfo.name,
  };
}

export default useRolePermissions;
