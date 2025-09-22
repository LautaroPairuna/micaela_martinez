// src/lib/sdk/ordersApi.ts
import { api } from './api';

// Tipos locales que coinciden con los del backend
export enum TipoItemOrden {
  CURSO = 'CURSO',
  PRODUCTO = 'PRODUCTO'
}

export enum EstadoOrden {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  CUMPLIDO = 'CUMPLIDO',
  CANCELADO = 'CANCELADO',
  REEMBOLSADO = 'REEMBOLSADO'
}

export interface OrderItem {
  tipo: TipoItemOrden;
  refId: string;
  titulo: string;
  cantidad: number;
  precioUnitario: number;
}

export interface OrderAddress {
  nombre: string;
  telefono?: string;
  etiqueta?: string;
  calle: string;
  numero?: string;
  pisoDepto?: string;
  ciudad: string;
  provincia: string;
  cp: string;
  pais?: string;
}

export interface CreateOrderRequest {
  items: OrderItem[];
  direccionEnvio: OrderAddress;
  direccionFacturacion?: OrderAddress;
  metodoPago?: string;
  metodoEnvio?: string;
  costoEnvio?: number;
}

export interface Order {
  id: string;
  usuarioId: string;
  estado: EstadoOrden;
  total: number;
  referenciaPago?: string;
  direccionEnvioId: string;
  direccionFacturacionId: string;
  creadoEn: string;
  actualizadoEn: string;
  items: OrderItem[];
  direccionEnvio: OrderAddress;
  direccionFacturacion: OrderAddress;
}

export interface MercadoPagoPaymentData {
  token: string;
  paymentMethodId: string;
  email?: string;
  identificationType?: string;
  identificationNumber?: string;
}

export interface MercadoPagoSubscriptionData extends MercadoPagoPaymentData {
  frequency: number;
  frequencyType: 'days' | 'months';
}

// Crear una nueva orden
export async function createOrder(orderData: CreateOrderRequest): Promise<Order> {
  const response = await api.post<Order>('/orders', orderData);
  return response.data;
}

// Obtener órdenes del usuario
export async function getUserOrders(): Promise<Order[]> {
  const response = await api.get<Order[]>('/orders');
  return response.data;
}

// Obtener una orden específica
export async function getOrderById(orderId: string): Promise<Order> {
  const response = await api.get<Order>(`/orders/${orderId}`);
  return response.data;
}

// Actualizar estado de una orden
export async function updateOrderStatus(
  orderId: string,
  estado: EstadoOrden,
  referenciaPago?: string
): Promise<Order> {
  const response = await api.post<Order>(`/orders/${orderId}/status`, {
    estado,
    referenciaPago,
  });
  return response.data;
}

// Procesar pago con MercadoPago
export async function processMercadoPagoPayment(
  orderId: string,
  paymentData: MercadoPagoPaymentData
): Promise<Order> {
  const response = await api.post<Order>(`/orders/${orderId}/payment/mercadopago`, paymentData);
  return response.data;
}

// Crear suscripción con MercadoPago
export async function createSubscription(
  orderId: string,
  subscriptionData: MercadoPagoSubscriptionData
): Promise<Order> {
  const response = await api.post<Order>(`/orders/${orderId}/subscription/mercadopago`, subscriptionData);
  return response.data;
}

// Interfaces para tipos específicos
export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export interface MercadoPagoPreferenceRequest {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  payer?: {
    email?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
}

export interface RefundResponse {
  id: string;
  status: string;
  amount: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<EstadoOrden, number>;
  recentOrders: Order[];
}

// Obtener métodos de pago disponibles
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await api.get<PaymentMethod[]>('/payment/methods');
  return response.data;
}

// Crear preferencia de MercadoPago (para Checkout Pro)
export async function createMercadoPagoPreference(
  preferenceData: MercadoPagoPreferenceRequest
): Promise<MercadoPagoPreference> {
  console.log('=== SDK: Iniciando llamada a createMercadoPagoPreference ===');
  console.log('SDK preferenceData:', JSON.stringify(preferenceData, null, 2));

  try {
    console.log('=== SDK: Realizando POST a /payment/mercadopago/preference ===');
    const response = await api.post<MercadoPagoPreference, MercadoPagoPreferenceRequest>(
      '/payment/mercadopago/preference',
      preferenceData
    );

    console.log('=== SDK: Respuesta recibida del backend ===');
    return response.data;
  } catch (error) {
    console.error('=== SDK: Error en createMercadoPagoPreference ===');
    console.error('SDK error:', error);
    throw error;
  }
}

// Webhook de MercadoPago (para uso interno)
export async function handleMercadoPagoWebhook(
  notificationData: Record<string, unknown>
): Promise<void> {
  await api.post<void, Record<string, unknown>>('/payment/mercadopago/webhook', notificationData);
}

// Reembolsar pago
export async function refundPayment(
  orderId: string,
  amount?: number
): Promise<RefundResponse> {
  const response = await api.post<RefundResponse, { amount?: number }>(
    `/orders/${orderId}/refund`,
    { amount }
  );
  return response.data;
}

// Cancelar orden
export async function cancelOrder(orderId: string): Promise<Order> {
  return await updateOrderStatus(orderId, EstadoOrden.CANCELADO);
}

// Marcar orden como cumplida
export async function fulfillOrder(orderId: string): Promise<Order> {
  return await updateOrderStatus(orderId, EstadoOrden.CUMPLIDO);
}

// ==== Cancelar suscripción (sin `any`) ====
export interface CancelSubscriptionResponse {
  success: boolean;
  orderId: string;
  status?: 'canceled' | 'cancelled' | 'error' | string;
  message?: string;
  canceledAt?: string;
}

export async function cancelSubscription(orderId: string): Promise<CancelSubscriptionResponse> {
  const response = await api.post<CancelSubscriptionResponse>(
    `/orders/${orderId}/subscription/cancel`
  );
  return response.data;
}

// Obtener estadísticas de órdenes (para admin)
export async function getOrderStats(): Promise<OrderStats> {
  const response = await api.get<OrderStats>('/orders/stats');
  return response.data;
}

// Exportar órdenes (para admin)
export async function exportOrders(
  startDate?: string,
  endDate?: string,
  format: 'csv' | 'xlsx' = 'csv'
): Promise<Blob> {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  params.set('format', format);

  const queryString = params.toString();
  const path = `/orders/export${queryString ? `?${queryString}` : ''}`;

  // Para blobs, usamos fetch directamente
  const response = await fetch(`/api${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.blob();
}
