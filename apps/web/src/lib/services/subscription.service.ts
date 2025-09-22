import { apiProxy } from '@/lib/api-proxy';

export interface SubscriptionInfo {
  isActive: boolean;
  nextPaymentDate: string | null;
  subscriptionId: string | null;
  orderId: string | null;
  frequency: string | null;
  frequencyType: string | null;
  duration: string | null;
  durationType: string | null;
  includedCourses: {
    id: string;
    title: string;
    slug: string;
  }[];
}

/**
 * Obtiene la información de suscripción del usuario actual
 */
export async function getUserSubscriptionInfo(): Promise<SubscriptionInfo> {
  try {
    const response = await apiProxy<SubscriptionInfo>('/api/users/me/subscription', {
      cache: 'no-store',
    });
    
    return response;
  } catch (error) {
    console.error('Error al obtener información de suscripción:', error);
    return {
      isActive: false,
      nextPaymentDate: null,
      subscriptionId: null,
      orderId: null,
      frequency: null,
      frequencyType: null,
      duration: null,
      durationType: null,
      includedCourses: []
    };
  }
}