const apiBase = import.meta.env.VITE_API_URL || '/api'

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : Array.isArray(body.message) ? body.message.join(', ') : 'Something went wrong'
    throw new Error(message)
  }
  return body as T
}