// src/lib/api.ts
import { apiFetch } from './api-fetch';

function toQS(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v != null && qs.set(k, String(v)));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function getProducts(params: Record<string, string | number | undefined> = {}) {
  return apiFetch(`/catalog/productos${toQS(params)}`, { next: { revalidate: 60 } });
}
export async function getProductFacets(params: Record<string, string | number | undefined> = {}) {
  return apiFetch(`/catalog/productos/filtros${toQS(params)}`, { next: { revalidate: 300 } });
}
export async function getProductBySlug(slug: string) {
  return apiFetch(`/catalog/productos/${slug}`, { next: { revalidate: 120 } });
}

// Cursos
export async function getCourses(params: Record<string, string | number | undefined> = {}) {
  return apiFetch(`/catalog/cursos${toQS(params)}`, { next: { revalidate: 60 } });
}
export async function getCourseFacets(params: Record<string, string | number | undefined> = {}) {
  return apiFetch(`/catalog/cursos/filtros${toQS(params)}`, { next: { revalidate: 300 } });
}
export async function getCourseBySlug(slug: string) {
  return apiFetch(`/catalog/cursos/${slug}`, { next: { revalidate: 120 } });
}
