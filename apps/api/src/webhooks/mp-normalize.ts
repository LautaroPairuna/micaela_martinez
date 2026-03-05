export function normalizeEventType(raw: string) {
  const t = String(raw || '').trim().toLowerCase();

  // MP puede mandar "payment.updated", "payment.created"
  if (t.startsWith('payment')) return 'payment';

  // Suscripciones
  if (t.startsWith('subscription_preapproval')) return 'subscription_preapproval';
  if (t.startsWith('subscription_authorized_payment')) return 'subscription_authorized_payment';
  if (t.startsWith('subscription_payment')) return 'subscription_payment';
  if (t.startsWith('subscription_status_update')) return 'subscription_status_update';

  return t || 'unknown';
}

export function normalizeDataId(raw: unknown) {
  // MP a veces envía alfanum; normalizamos minúsculas por firma/idempotencia
  return String(raw || '').trim().toLowerCase();
}