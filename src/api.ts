const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080';
const API_KEY: string = import.meta.env.VITE_FLOW_API_KEY || 'change-me-please';

export interface AiConfigPublic {
  provider: string;
  protocol: string;
  baseUrl: string;
  model: string;
  keyHash: string;
  hasKey: boolean;
  updatedAt: string;
}

export interface AiTestResult {
  ok: boolean;
  status: number;
  message: string;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data.error === 'string' ? data.error : `http_${response.status}`;
    throw new Error(message);
  }
  return data;
}

export const getAiConfig = () =>
  request('/ai/config') as unknown as Promise<{ config: AiConfigPublic | null }>;

export const saveAiConfig = (payload: {
  provider: string;
  protocol: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}) =>
  request('/ai/config', { method: 'PUT', body: JSON.stringify(payload) }) as unknown as Promise<{
    ok: boolean;
    config: AiConfigPublic;
  }>;

export const testAiConfig = (payload: {
  provider: string;
  protocol: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
}) =>
  request('/ai/test', { method: 'POST', body: JSON.stringify(payload) }) as unknown as Promise<AiTestResult>;

export const getPersonaConfig = () =>
  request('/persona/config') as unknown as Promise<{ config: Record<string, unknown> | null }>;

export const savePersonaConfig = (payload: unknown) =>
  request('/persona/config', { method: 'PUT', body: JSON.stringify(payload) }) as unknown as Promise<{
    ok: boolean;
  }>;

export const getOfficeHours = () =>
  request('/settings/office-hours') as unknown as Promise<{
    officeHours: { enabled: boolean; startHour: number; endHour: number };
  }>;

export const saveOfficeHours = (payload: {
  enabled: boolean;
  startHour: number;
  endHour: number;
}) =>
  request('/settings/office-hours', { method: 'PUT', body: JSON.stringify(payload) }) as unknown as Promise<{
    ok: boolean;
  }>;
