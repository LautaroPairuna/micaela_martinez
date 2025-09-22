// src/lib/sdk/api.ts
import { apiProxy } from '@/lib/api-proxy';

/** Opciones compatibles con fetch de Next (SSR o cliente) */
export type NextOpts = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

/**
 * Cliente API base que usa el sistema de proxy para comunicarse con el backend
 */
export const api = {
  async get<T>(path: string, opts?: NextOpts): Promise<{ data: T }> {
    const data = await apiProxy<T>(path, { ...opts, method: 'GET' });
    return { data };
  },

  async post<T, B = unknown>(path: string, body?: B, opts?: NextOpts): Promise<{ data: T }> {
    const data = await apiProxy<T>(path, {
      ...opts,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },

  async put<T, B = unknown>(path: string, body?: B, opts?: NextOpts): Promise<{ data: T }> {
    const data = await apiProxy<T>(path, {
      ...opts,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },

  async patch<T, B = unknown>(path: string, body?: B, opts?: NextOpts): Promise<{ data: T }> {
    const data = await apiProxy<T>(path, {
      ...opts,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },

  async delete<T>(path: string, opts?: NextOpts): Promise<{ data: T }> {
    const data = await apiProxy<T>(path, { ...opts, method: 'DELETE' });
    return { data };
  },
};