export function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}
