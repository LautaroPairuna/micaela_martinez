import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format duration in seconds to human readable format
 * Shows only minutes and seconds if less than 1 hour
 */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '0 min';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  // Si es menos de una hora, mostrar solo minutos
  if (hours === 0) {
    if (minutes === 0) {
      return `${remainingSeconds} seg`;
    }
    return remainingSeconds > 0 ? `${minutes} min ${remainingSeconds} seg` : `${minutes} min`;
  }
  
  // Si es una hora o más, mostrar horas y minutos
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a cryptographically secure random ID
 * Uses crypto.randomUUID() when available, falls back to secure alternative
 */
export function generateId(): string {
  // Usar crypto.randomUUID() si está disponible (Node.js 14.17+ y navegadores modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback seguro usando crypto.getRandomValues()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Convertir a formato UUID v4
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      '4' + hex.slice(13, 16), // Versión 4
      ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20), // Variant bits
      hex.slice(20, 32)
    ].join('-');
  }
  
  // Último recurso: timestamp + random (menos seguro pero único)
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Generate a short, URL-safe ID (para casos donde UUID completo es muy largo)
 */
export function generateShortId(length: number = 12): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }
  
  // Fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a nanoid-style ID (alternativa moderna a UUID)
 */
export function generateNanoId(size: number = 21): string {
  const alphabet = '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    let id = '';
    const mask = (2 << (Math.log(alphabet.length - 1) / Math.LN2)) - 1;
    const step = -~(1.6 * mask * size / alphabet.length);
    
    while (true) {
      const bytes = crypto.getRandomValues(new Uint8Array(step));
      let i = step;
      while (i--) {
        id += alphabet[bytes[i] & mask] || '';
        if (id.length === size) return id;
      }
    }
  }
  
  // Fallback simple
  let result = '';
  for (let i = 0; i < size; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}