import { API_BASE_URL } from '../constants/config';
import type { Insumo, InsumoForm } from '../types/insumo.types';

const endpoint = `${API_BASE_URL}/v1/api/supply`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const message = typeof body === 'string' ? body : 'El servidor rechazo la solicitud.';
    throw new Error(`${response.status}: ${message}`);
  }
  return body as T;
}

function toPayload(form: InsumoForm) {
  return {
    ...(form.id.trim() ? { id: form.id.trim() } : {}),
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim() || 'General',
    inventory: {
      current_stock: Number(form.currentStock),
      minimum_stock: Number(form.minimumStock),
      expiration_date: form.expirationDate,
    },
    unit: form.unit.trim(),
    location: form.location.trim(),
    status: form.status ?? true,
  };
}

export const insumoService = {
  list: () => request<Insumo[]>(''),
  create: (form: InsumoForm) =>
    request<Insumo>('', { method: 'POST', body: JSON.stringify(toPayload(form)) }),
  update: (form: InsumoForm) =>
    request<Insumo>(`/${encodeURIComponent(form.id.trim())}`, {
      method: 'PUT',
      body: JSON.stringify(toPayload(form)),
    }),
  remove: (id: string) => request<Insumo>(`/delete/${encodeURIComponent(id)}`, { method: 'PATCH' }),
  restore: (id: string) => request<Insumo>(`/restore/${encodeURIComponent(id)}`, { method: 'PATCH' }),
};