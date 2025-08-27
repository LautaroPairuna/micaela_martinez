export function formatCurrency(v: number, currency='ARS', locale='es-AR') {
  return new Intl.NumberFormat(locale, { style:'currency', currency }).format(v);
}
export function cn(...xs: (string|false|undefined|null)[]) {
  return xs.filter(Boolean).join(' ');
}
