import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * CUID regex pattern: starts with 'c' followed by 24 alphanumeric characters
 * Ejemplo: c1234567890abcdef1234567
 */
const CUID_REGEX = /^c[a-z0-9]{24}$/;

/**
 * Validador personalizado para CUIDs (Collision-resistant Unique Identifiers)
 * Usado por Prisma con @default(cuid())
 */
export function IsCUID(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCUID',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} debe ser un CUID válido (formato: c + 24 caracteres alfanuméricos)`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return CUID_REGEX.test(value);
        },
      },
    });
  };
}

/**
 * Función utilitaria para validar CUIDs manualmente
 */
export function isValidCUID(value: string): boolean {
  return typeof value === 'string' && CUID_REGEX.test(value);
}

/**
 * Función utilitaria para validar múltiples CUIDs
 */
export function areValidCUIDs(values: string[]): boolean {
  return values.every((value) => isValidCUID(value));
}
