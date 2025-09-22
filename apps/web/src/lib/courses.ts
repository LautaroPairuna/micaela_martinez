import { apiClient } from './client';

// Función para obtener información de suscripción
export const fetchSubscriptionInfo = async (courseId: string) => {
  const response = await apiClient.get(`/subscription/course/${courseId}`);
  return response.data;
};