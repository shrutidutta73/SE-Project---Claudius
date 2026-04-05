const BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:3001/api'

export function getToken(): string | null {
  return localStorage.getItem('sb_token')
}

export function setToken(token: string): void {
  localStorage.setItem('sb_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('sb_token')
  localStorage.removeItem('sb_user')
}

export function cacheUser(user: object): void {
  localStorage.setItem('sb_user', JSON.stringify(user))
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`)
  return data as T
}

export const api = {
  post:  <T>(path: string, body: unknown, auth = true) => request<T>('POST',   path, body, auth),
  get:   <T>(path: string)                              => request<T>('GET',    path, undefined, true),
  patch: <T>(path: string, body: unknown)               => request<T>('PATCH',  path, body, true),
  del:   <T>(path: string)                              => request<T>('DELETE', path, undefined, true),
}
