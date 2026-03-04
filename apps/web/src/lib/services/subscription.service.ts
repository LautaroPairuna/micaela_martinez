import { apiProxy } from '@/lib/api-proxy';

export interface SubscriptionItem {
  isActive: boolean;
  orderId: string | number;
  subscriptionId: string | null;
  startDate: string;
  nextPaymentDate: string | null;
  frequency: number;
  frequencyType: string;
  daysLeft: number | null;
  hoursLeft: number | null;
}

export interface SubscriptionInfo {
  isActive: boolean;
  subscriptions: SubscriptionItem[];
  includedCourses: {
    id: string;
    title: string;
    slug: string;
    portadaUrl?: string;
  }[];
}

/**
 * Obtiene la información de suscripción del usuario actual
 */
export async function getUserSubscriptionInfo(): Promise<SubscriptionInfo> {
  try {
    const response = await apiProxy<SubscriptionInfo>('/subscription/me', {
      cache: 'no-store',
    });
    
    return response;
  } catch (error) {
    console.error('Error al obtener información de suscripción:', error);
    return {
      isActive: false,
      subscriptions: [],
      includedCourses: []
    };
  }
}