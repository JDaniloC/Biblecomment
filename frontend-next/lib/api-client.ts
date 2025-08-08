export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333';

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { authenticated?: boolean }
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  if (options?.authenticated) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : undefined;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers, cache: init?.cache ?? 'no-store' });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}
