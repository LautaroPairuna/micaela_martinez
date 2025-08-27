const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const TOKEN_KEY = 'auth:token'; // opcional (cache cliente)

function setTokenLS(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}
function clearTokenLS() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json(); // espera { token, expiresIn? }
  if (data?.token) {
    setTokenLS(data.token);
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token, maxAge: data.expiresIn }),
    });
  }
  return data;
}

export async function register(payload: { email: string; password: string; nombre: string }) {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json(); // puede devolver { token } o nada
  if (data?.token) {
    setTokenLS(data.token);
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token, maxAge: data.expiresIn }),
    });
  }
  return data;
}

export async function logout() {
  clearTokenLS();
  await fetch('/api/session', { method: 'DELETE' });
}
