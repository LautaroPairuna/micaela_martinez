export function formatCurrency(v: number, currency='ARS', locale='es-AR') {
  // Versión completamente estable para SSR - sin APIs de internacionalización
  if (currency === 'ARS') {
    // Formateo manual para pesos argentinos
    const rounded = Math.round(v);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `$${formatted}`;
  }
  // Fallback simple para otras monedas
  return `${currency} ${Math.round(v)}`;
}
export function cn(...xs: (string | false | undefined | null | Record<string, boolean>)[]) {
  return xs
    .map(x => {
      if (typeof x === 'string') return x;
      if (typeof x === 'object' && x !== null) {
        return Object.entries(x)
          .filter(([, condition]) => condition)
          .map(([className]) => className)
          .join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}
