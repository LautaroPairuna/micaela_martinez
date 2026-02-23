
/**
 * Utilidades para cálculo y manejo de precios y descuentos.
 */

export interface PricingData {
  precio: number;
  descuento?: number | null;
}

export interface CalculatedPrice {
  /** Precio final a pagar (con descuento aplicado si existe) */
  final: number;
  /** Precio original/base (solo si hay descuento, para mostrar tachado) */
  original?: number;
  /** Porcentaje de descuento aplicado */
  discountPercentage: number;
  /** Indica si hay un descuento activo */
  hasDiscount: boolean;
  /** Monto ahorrado (diferencia entre original y final) */
  savings: number;
}

/**
 * Calcula el precio final basado en un precio base y un porcentaje de descuento.
 * @param price Precio base del producto
 * @param discount Porcentaje de descuento (0-100)
 */
export function calculatePrice(price: number, discount: number | null | undefined): CalculatedPrice {
  const discountVal = discount || 0;
  const hasDiscount = discountVal > 0;
  
  if (!hasDiscount) {
    return {
      final: price,
      original: undefined,
      discountPercentage: 0,
      hasDiscount: false,
      savings: 0
    };
  }

  // Cálculo: precio * (1 - descuento/100)
  const final = Math.round(price * (1 - discountVal / 100));
  const savings = price - final;

  return {
    final,
    original: price,
    discountPercentage: discountVal,
    hasDiscount: true,
    savings
  };
}

/**
 * Formatea un precio a moneda local (ARS por defecto).
 * Wrapper ligero sobre Intl.NumberFormat para consistencia.
 */
export function formatPrice(amount: number, currency = 'ARS', locale = 'es-AR'): string {
  // Misma lógica que formatCurrency en format.ts para mantener consistencia visual
  // pero centralizada aquí para el dominio de precios
  if (currency === 'ARS') {
    const rounded = Math.round(amount);
    return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }
  
  return new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency,
    maximumFractionDigits: 0 
  }).format(amount);
}
