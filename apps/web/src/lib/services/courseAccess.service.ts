import { apiProxy } from '@/lib/api-proxy';
import { getUserSubscriptionInfo } from './subscription.service';

/**
 * Verifica si un usuario tiene acceso a un curso específico
 * El acceso puede ser por inscripción directa o por suscripción activa
 */
export async function checkCourseAccess(courseId: string): Promise<{
  hasAccess: boolean;
  accessType: 'enrollment' | 'subscription' | null;
  subscriptionActive?: boolean;
}> {
  try {
    // Verificar inscripción directa
    const enrollmentCheck = await apiProxy<{ enrolled: boolean }>(`/courses/${courseId}/enrollment-check`, {
      cache: 'no-store',
    });
    
    if (enrollmentCheck.enrolled) {
      return {
        hasAccess: true,
        accessType: 'enrollment'
      };
    }
    
    // Verificar suscripción activa
    const subscription = await getUserSubscriptionInfo();
    
    if (subscription.isActive) {
      return {
        hasAccess: true,
        accessType: 'subscription',
        subscriptionActive: true
      };
    }
    
    return {
      hasAccess: false,
      accessType: null,
      subscriptionActive: false
    };
  } catch (error) {
    console.error('Error al verificar acceso al curso:', error);
    return {
      hasAccess: false,
      accessType: null
    };
  }
}