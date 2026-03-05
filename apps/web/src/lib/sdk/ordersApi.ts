// src/lib/sdk/ordersApi.ts
import { api } from './api';

// Tipos locales alineados con el backend
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
  id: number;
  tipo: TipoItemOrden;
  refId: number;
  titulo: string;
  cantidad: number;
  precioUnitario: number;
}

export interface OrderAddress {
  id?: number;
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

// DTO para crear orden (alineado con backend CreateOrderDto)
export interface CreateOrderRequest {
  source?: 'cart';
  mode?: 'COURSES_ONLY' | 'PRODUCTS_ONLY';
  direccionEnvioId?: number;
  direccionFacturacionId?: number;
  metadatos?: unknown;
}

export interface Order {
  id: number;
  usuarioId: number;
  estado: EstadoOrden;
  total: string; // Decimal viene como string
  moneda: string;
  referenciaPago?: string;
  creadoEn: string;
  actualizadoEn: string;
  items: OrderItem[];
  direccionEnvio?: OrderAddress;
  direccionFacturacion?: OrderAddress;
}

// DTO para pagos (alineado con backend PayOrderDto)
export interface MercadoPagoPaymentData {
  token: string;
  payment_method_id: string;
  issuer_id: number;
  installments: number;
  payer_email: string;
  payer_identification?: { type: string; number: string };
  device_session_id?: string;
  attemptId: string;
}

// DTO para suscripciones (alineado con backend SubscribeOrderDto)
export interface MercadoPagoSubscriptionData {
  card_token_id: string;
  payer_email: string;
  payer_identification?: { type: string; number: string };
  device_session_id?: string;
  frequency: number;
  frequency_type: 'days' | 'months';
  attemptId: string;
}

// Crear una nueva orden (desde carrito)
export async function createOrder(orderData: CreateOrderRequest): Promise<Order> {
  const response = await api.post<Order>('/orders', orderData);
  return response.data;
}

// Obtener órdenes del usuario
export async function getUserOrders(): Promise<Order[]> {
  const response = await api.get<Order[]>('/orders/me');
  return response.data;
}

// Obtener una orden específica
export async function getOrderById(orderId: number | string): Promise<Order> {
  const response = await api.get<Order>(`/orders/${orderId}`);
  return response.data;
}

// Actualizar estado de una orden (Admin/Interno)
export async function updateOrderStatus(
  orderId: number | string,
  estado: EstadoOrden,
  referenciaPago?: string
): Promise<Order> {
  const response = await api.post<Order>(`/orders/${orderId}/status`, {
    estado,
    referenciaPago,
  });
  return response.data;
}

// Procesar pago ONE_OFF con MercadoPago
export async function processMercadoPagoPayment(
  orderId: number | string,
  paymentData: MercadoPagoPaymentData
): Promise<Order> {
  const response = await api.post<Order>(`/orders/${orderId}/pay`, paymentData);
  return response.data;
}

// Procesar suscripción con MercadoPago
export async function createSubscription(
  orderId: number | string,
  subscriptionData: MercadoPagoSubscriptionData
): Promise<Order> {
  const response = await api.post<Order>(`/orders/${orderId}/subscribe`, subscriptionData);
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
  // console.log('=== SDK: Iniciando llamada a createMercadoPagoPreference ===');
  try {
    const response = await api.post<MercadoPagoPreference, MercadoPagoPreferenceRequest>(
      '/payment/mercadopago/preference',
      preferenceData
    );
    return response.data;
  } catch (error) {
    console.error('=== SDK: Error en createMercadoPagoPreference ===', error);
    throw error;
  }
}

// Reembolsar pago
export async function refundPayment(
  orderId: number | string,
  amount?: number
): Promise<RefundResponse> {
  const response = await api.post<RefundResponse, { amount?: number }>(
    `/orders/${orderId}/refund`,
    { amount }
  );
  return response.data;
}

// Cancelar orden
export async function cancelOrder(orderId: number | string): Promise<Order> {
  return await updateOrderStatus(orderId, EstadoOrden.CANCELADO);
}

// Marcar orden como cumplida
export async function fulfillOrder(orderId: number | string): Promise<Order> {
  return await updateOrderStatus(orderId, EstadoOrden.CUMPLIDO);
}

// ==== Cancelar suscripción ====
export interface CancelSubscriptionResponse {
  success: boolean;
  orderId: string;
  status?: string;
  message?: string;
}

export async function cancelSubscription(orderId: number | string): Promise<CancelSubscriptionResponse> {
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

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${path}`, {
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
