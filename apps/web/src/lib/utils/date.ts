/**
 * Formatea una fecha en formato legible en español
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

/**
 * Calcula los días restantes entre la fecha actual y una fecha futura
 */
export function getDaysRemaining(futureDate: Date): number {
  const now = new Date();
  const diffTime = futureDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}