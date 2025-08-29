// apps/web/src/lib/api-fetch.ts
import { cookies } from 'next/headers';

/** Lee y normaliza la base: sin slash final */
const RAW_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').trim();
const API_BASE = RAW_BASE.replace(/\/+$/, '');

/** Quita slashes iniciales del path */
function normalizePath(p: string) {
  return p.replace(/^\/+/, '');
}

/** Une base + path garantizando 1 sola barra */
function buildUrl(path: string) {
  return `${API_BASE}/${normalizePath(path)}`;
}

type NextRevalidate = { revalidate?: number | false; tags?: string[] };
type FetchInit = RequestInit & { next?: NextRevalidate };

/* ======================= SERVER ======================= */
export async function apiFetchServer<T = unknown>(path: string, init: FetchInit = {}) {
  // En tu proyecto cookies() es async; si no lo fuera, podés quitar el await.
  const store = await cookies();
  const token = store.get('mp_session')?.value;

  const headers = new Headers({ Accept: 'application/json', ...init.headers });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = buildUrl(path);
  const res = await fetch(url, {
    ...init,
    headers,
    cache: init.cache,
    next: init.next, // respeta next.revalidate cuando venga desde Server Components
  });

  if (!res.ok) {
    let body = '';
    try { body = (await res.text()).slice(0, 400).replace(/\s+/g, ' '); } catch {}
    const reqId = res.headers.get('x-request-id') || res.headers.get('x-correlation-id') || '';
    const extra = [url, reqId && `reqId=${reqId}`, body && `body=${body}`].filter(Boolean).join(' — ');
    throw new Error(`API ${res.status} ${res.statusText} — ${extra}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

/* ======================= CLIENT ======================= */
export function apiFetchClient<T = unknown>(path: string, init: RequestInit = {}) {
  const headers = new Headers({ Accept: 'application/json', ...init.headers });
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth:token') : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = buildUrl(path);
  return fetch(url, { ...init, headers, credentials: 'include' })
    .then(async (r) => {
      if (!r.ok) {
        let body = '';
        try { body = (await r.text()).slice(0, 400).replace(/\s+/g, ' '); } catch {}
        throw new Error(`API ${r.status} ${r.statusText} — ${url}${body ? ` — body=${body}` : ''}`);
      }
      if (r.status === 204) return undefined as unknown as T;
      return r.json() as Promise<T>;
    });
}

/* ======================= ADAPTADOR ÚNICO ======================= */
export function apiFetch<T = unknown>(path: string, init: FetchInit = {}) {
  return typeof window === 'undefined'
    ? apiFetchServer<T>(path, init)
    : apiFetchClient<T>(path, init);
}
