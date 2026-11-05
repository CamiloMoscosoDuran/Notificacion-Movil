import { API_BASE_URL } from '../constants/config';
import type { Client, ClientPayload } from '../types/client.types';

const endpoint = `${API_BASE_URL}/v1/api/customer`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const message = typeof body === 'string'
      ? body
      : body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
          ? body.detail
          : 'El servidor rechazó la solicitud.';
    throw new Error(`${response.status}: ${message}`);
  }
  return body as T;
}

function payload(form: ClientPayload) {
  const phone = Array.isArray(form.phone)
    ? form.phone.map((v) => v.trim()).filter(Boolean)
    : String(form.phone).split(',').map((v) => v.trim()).filter(Boolean);
  const email = form.email?.trim() ?? '';

  return {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    document_type: form.documentType.trim(),
    document_number: form.documentNumber.trim(),
    phone,
    ...(email ? { email } : {}),
    registration_date: form.registrationDate,
    status: form.status ?? true,
    farm_plot: [{
      farm_name: form.farmName?.trim() ?? '',
      hectareas: Number(form.hectareas) || 0,
      type_crop: form.typeCrop?.trim() ?? '',
    }],
    address: {
      department: form.department?.trim() ?? '',
      province: form.province?.trim() ?? '',
      district: form.district?.trim() ?? '',
      especifics: {
        settlement_type: form.settlementType?.trim() ?? '',
        settlement_name: form.settlementName?.trim() ?? '',
        street_type: form.streetType?.trim() ?? '',
        street_name: form.streetName?.trim() ?? '',
        reference: form.reference?.trim() ?? '',
      },
    },
  };
}

export const clientService = {
  listAll: () => request<Client[]>(''),
  create: (form: ClientPayload) => request<Client>('', { method: 'POST', body: JSON.stringify(payload(form)) }),
  update: (id: string, form: ClientPayload) => request<Client>(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload(form)) }),
  remove: (id: string) => request<Client>(`/delete/${encodeURIComponent(id)}`, { method: 'PATCH' }),
  restore: (id: string) => request<Client>(`/restore/${encodeURIComponent(id)}`, { method: 'PATCH' }),
};
