export const apiBase = import.meta.env.VITE_API_BASE ?? "/api/v1";

export interface ApiOptions {
  token?: string | null;
  formData?: boolean;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, { token, formData, headers: customHeaders }: ApiOptions = {}) {
  const headers: Record<string, string> = customHeaders ? { ...customHeaders } : formData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json() as Promise<T>;
}
