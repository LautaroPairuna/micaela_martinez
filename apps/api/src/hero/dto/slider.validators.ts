import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function isValidHref(v: string): boolean {
  const s = (v || '').trim();
  if (!s) return false;

  // permite anchors
  if (s.startsWith('#')) return s.length > 1;

  // permite paths relativos
  if (s.startsWith('/')) return true;

  // permite URLs absolutas
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function IsHref(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isHref',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (value === null || value === undefined) return true; // optional
          if (typeof value !== 'string') return false;
          return isValidHref(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe ser una URL (http/https) o una ruta relativa (ej: /cursos) o un anchor (#contacto).`;
        },
      },
    });
  };
}
