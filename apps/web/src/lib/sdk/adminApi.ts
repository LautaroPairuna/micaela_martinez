// src/lib/sdk/adminApi.ts

/**
 * Cliente API para operaciones administrativas
 * Utiliza autenticación por token JWT
 */
class AdminApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private cookieHeader: string | null = null;

  constructor() {
    // Configurar baseUrl según el entorno
    if (typeof window !== 'undefined') {
      // Cliente: usar URLs relativas
      this.baseUrl = '/api';
    } else {
      // Servidor: usar URL absoluta
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000';
      this.baseUrl = `${protocol}://${host}/api`;
    }

    // Intentar obtener token del localStorage si estamos en el cliente
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * Configura las cookies para solicitudes del servidor y extrae el token
   */
  setCookieHeader(cookieHeader: string) {
    console.log('🍪 [DEBUG] setCookieHeader llamado con:', cookieHeader);
    this.cookieHeader = cookieHeader;
    console.log('🍪 [DEBUG] cookieHeader almacenado:', this.cookieHeader);
    
    // Extraer token de las cookies si estamos en el servidor
    if (typeof window === 'undefined' && cookieHeader) {
      const tokenMatch = cookieHeader.match(/mp_session=([^;]+)/);
      if (tokenMatch) {
        this.token = tokenMatch[1];
        console.log('🍪 [DEBUG] Token extraído de cookies:', this.token ? 'presente' : 'ausente');
      } else {
        console.warn('⚠️ [DEBUG] No se encontró mp_session en las cookies');
      }
    }
  }

  /**
   * Configura el token de autenticación
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Limpia el token de autenticación
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Obtiene los headers con autenticación
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // El proxy maneja la autenticación via cookies automáticamente
    // Solo agregamos Authorization header si tenemos token explícito
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Serializa params tolerando `unknown`, arrays, Date y objetos (JSON)
   */
  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';
    const qs = new URLSearchParams();

    const toStr = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    };

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          qs.append(key, toStr(item));
        }
      } else {
        qs.append(key, toStr(value));
      }
    }

    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  /**
   * Realiza una petición HTTP al API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Construir URL correctamente
    let url: string;
    
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      // URL absoluta, usar tal como está
      url = endpoint;
    } else if (typeof window !== 'undefined') {
      // Cliente: usar URLs relativas
      if (endpoint.startsWith('/api')) {
        url = endpoint;
      } else {
        url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      }
    } else {
      // Servidor: siempre construir URL absoluta
      const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
      url = `${this.baseUrl}${cleanEndpoint.startsWith('/') ? cleanEndpoint : '/' + cleanEndpoint}`;
    }
    
    console.log(`[AdminApiClient] Construyendo URL: baseUrl="${this.baseUrl}", endpoint="${endpoint}", final="${url}"`);

    const fetchOptions: RequestInit = {
      ...options,
      credentials: 'include', // Importante para cookies de autenticación
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    // En el servidor, agregar cookies manualmente si están disponibles
    if (typeof window === 'undefined' && this.cookieHeader) {
      console.log('🍪 [DEBUG] Agregando cookie header a la request:', this.cookieHeader);
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Cookie': this.cookieHeader
      };
    } else if (typeof window === 'undefined') {
      console.warn('⚠️ [DEBUG] En servidor pero no hay cookieHeader disponible');
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorMessage = `API Error ${response.status}`;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = (errorData && (errorData.error || errorData.message)) || errorMessage;
        } else {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
      } catch {
        // Ignorar errores de parseo y mantener mensaje por defecto
      }
      throw new Error(errorMessage);
    }

    // Manejar posibles respuestas vacías (204 No Content)
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    // Si no es JSON, devolvemos texto
    const text = await response.text();
    return text as unknown as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * PUT request
   */
  async put<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * PATCH request
   */
  async patch<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ─────────────────────────────────────────────────────────────
  // Métodos específicos para operaciones administrativas
  // ─────────────────────────────────────────────────────────────

  /**
   * Obtiene todos los registros de una tabla
   */
  async getTableData<T>(
    tableName: string,
    params?: Record<string, unknown>
  ): Promise<PaginatedResponse<T>> {
    const queryString = this.buildQueryString(params);
    return this.get<PaginatedResponse<T>>(
      `/admin/tables/${tableName}/records${queryString}`
    );
  }

  /**
   * Obtiene un registro específico por ID
   */
  async getRecord<T>(
    tableName: string,
    id: string | number
  ): Promise<AdminApiResponse<T>> {
    return this.get<AdminApiResponse<T>>(
      `/admin/tables/${tableName}/records/${id}`
    );
  }

  /**
   * Crea un nuevo registro
   */
  async createRecord<T, B = unknown>(
    tableName: string,
    data: B
  ): Promise<AdminApiResponse<T>> {
    return this.post<AdminApiResponse<T>, B>(
      `/admin/tables/${tableName}/records`,
      data
    );
  }

  /**
   * Actualiza un registro existente
   */
  async updateRecord<T, B = unknown>(
    tableName: string,
    id: string | number,
    data: B
  ): Promise<AdminApiResponse<T>> {
    return this.put<AdminApiResponse<T>, B>(
      `/admin/tables/${tableName}/records/${id}`,
      data
    );
  }

  /**
   * Elimina un registro
   */
  async deleteRecord<T>(
    tableName: string,
    id: string | number
  ): Promise<AdminApiResponse<T>> {
    return this.delete<AdminApiResponse<T>>(
      `/admin/tables/${tableName}/records/${id}`
    );
  }

  /**
   * Obtiene el esquema/metadatos de una tabla
   */
  async getTableSchema(tableName: string): Promise<Record<string, unknown>> {
    return this.get(`/admin/tables/${tableName}/metadata`);
  }

  /**
   * Obtiene la lista de tablas disponibles
   */
  async getAvailableTables(): Promise<Record<string, unknown>[]> {
    return this.get<Record<string, unknown>[]>('/admin/tables');
  }

  /**
   * Obtiene estadísticas del dashboard
   * (alineado con el endpoint usado por el servicio)
   */
  async getDashboardStats(): Promise<Record<string, unknown>> {
    return this.get('/admin/dashboard/stats');
  }

  /**
   * Obtiene opciones para campos select de una tabla
   */
  async getSelectOptions(tableName: string): Promise<Record<string, unknown>[]> {
    return this.get<Record<string, unknown>[]>(`/admin/tables/${tableName}/options`);
  }

  /**
   * Obtiene múltiples conteos de tablas hijas en una sola solicitud (batch)
   */
  async getBatchCounts(requests: Array<{
    parentTable: string;
    parentId: string | number;
    childTable: string;
    foreignKey: string;
  }>): Promise<{
    counts: Record<string, Record<string, number>>;
    errors?: Array<{
      parentId: string | number;
      childTable: string;
      error: string;
    }>;
  }> {
    return this.post('/admin/batch/counts', { requests });
  }
}

// Exportar la clase para poder crear instancias
export { AdminApiClient };

// Instancia singleton para uso general
export const adminApi = new AdminApiClient();

// Tipos para las respuestas comunes
export interface AdminApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  // Compatibilidad con backends que exponen estos campos en raíz
  total?: number;
  page?: number;
  limit?: number;
}
