import { API_BASE_URL } from '../constants/config';
import type { Formula } from '../types/formula.types';
const endpoint = `${API_BASE_URL}/v1/api/formula`;
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${endpoint}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) throw new Error(`${response.status}: ${typeof body === 'string' ? body : 'El servidor rechazo la solicitud.'}`);
  return body as T;
}
export const getFormulas = () => request<Formula[]>('');
export const createFormula = (formula: Formula) => request<Formula>('', { method: 'POST', body: JSON.stringify(formula) });
export const updateFormula = (id: string, formula: Formula) => request<Formula>(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(formula) });
export const deleteFormula = (id: string) => request<Formula>(`/delete/${encodeURIComponent(id)}`, { method: 'PATCH' });
export const restoreFormula = (id: string) => request<Formula>(`/restore/${encodeURIComponent(id)}`, { method: 'PATCH' });
