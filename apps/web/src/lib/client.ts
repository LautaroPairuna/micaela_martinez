import axios from 'axios';

function computeApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    return apiUrl.replace(/\/+$/, '');
  }
  
  // Fallback para desarrollo local
  const fallback = 'http://localhost:3001';
  console.warn(`[API-CLIENT] NEXT_PUBLIC_API_URL no definido, usando fallback: ${fallback}`);
  return fallback;
}

// Crear instancia de axios con configuración base
export const apiClient = axios.create({
  baseURL: computeApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor para agregar token de autenticación
apiClient.interceptors.request.use((config) => {
  // Si estamos en el cliente, intentamos obtener el token del localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});