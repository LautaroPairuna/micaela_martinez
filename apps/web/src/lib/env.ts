export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';

export const UPLOAD_CONCURRENCY = Number(process.env.NEXT_PUBLIC_UPLOAD_CONCURRENCY || '3');

export const metadataBase = new URL(APP_URL);
