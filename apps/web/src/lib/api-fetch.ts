// apps/web/src/lib/api-fetch.ts
import { cookies } from 'next/headers';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// === SERVER ===
export async function apiFetchServer(path: string, init: RequestInit = {}) {
  // En tu proyecto cookies() es Promise -> await obligatorio.
  const store = await cookies();
  const token = store.get('mp_session')?.value;

  const headers = new Headers({ Accept: 'application/json', ...init.headers });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers,
    // Permití que el caller decida la estrategia de cache:
    cache: init.cache,
    next: init.next, // respeta next.revalidate cuando venga desde Server Components
  });

  if (!res.ok) {
    let snippet = '';
    try { snippet = (await res.text()).slice(0, 200).replace(/\s+/g, ' '); } catch {}
    throw new Error(`API ${res.status} ${res.statusText}${snippet ? ` — ${snippet}` : ''}`);
  }
  return res.json();
}

// === CLIENT ===
export function apiFetchClient(path: string, init: RequestInit = {}) {
  const headers = new Headers({ Accept: 'application/json', ...init.headers });
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth:token') : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${API}${path}`, { ...init, headers, credentials: 'include' })
    .then(async (r) => (r.ok ? r.json() : Promise.reject(await r.text())));
}

// === ADAPTADOR ÚNICO ===
export function apiFetch(path: string, init: RequestInit = {}) {
  return typeof window === 'undefined'
    ? apiFetchServer(path, init)
    : apiFetchClient(path, init);
}
