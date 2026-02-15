import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtUser } from '../../auth/types/jwt-user';

// Decorator para definir roles requeridos
export const Roles = (...roles: string[]) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      'roles',
      roles,
      descriptor ? descriptor.value : target,
    );
  };
};

// Tipo para request con usuario autenticado
interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos del metadata
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Obtener usuario de la request
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Si no hay usuario autenticado, denegar acceso
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Verificar si el usuario tiene al menos uno de los roles requeridos
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Roles requeridos: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

// Helper function para verificar roles específicos
export const hasRole = (
  userRoles: string[],
  requiredRoles: string[],
): boolean => {
  return requiredRoles.some((role) => userRoles.includes(role));
};

// Helper function para verificar si es admin
export const isAdmin = (userRoles: string[]): boolean => {
  return userRoles.includes('ADMIN');
};

// Helper function para verificar si es staff
export const isStaff = (userRoles: string[]): boolean => {
  return userRoles.includes('STAFF') || userRoles.includes('ADMIN');
};

// Exportar el tipo para uso en otros archivos
export type AuthenticatedUser = JwtUser;
