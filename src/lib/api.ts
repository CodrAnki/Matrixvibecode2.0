/**
 * Centralized API client. Every request/response passes through here so auth headers,
 * error shape, and the base URL are handled in exactly one place.
 *
 * Auth: the backend sets an httpOnly cookie on login/register, so `credentials: 'include'`
 * is enough to stay signed in across reloads. We ALSO keep the JWT in memory (not
 * localStorage — never store credentials there) as a fallback bearer token for
 * environments where third-party cookies are restricted.
 */
const REQUEST_TIMEOUT_MS = 30_000
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

let memoryToken: string | null = null
export function setAuthToken(token: string | null) {
  memoryToken = token
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  // A hung or unreachable server must end in a friendly error, not an eternal spinner.
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'AbortError'
    throw new ApiError(0, timedOut ? 'The server took too long to respond. Please try again.' : 'Could not reach the server. Check your connection and try again.', 'NETWORK')
  } finally {
    window.clearTimeout(timeout)
  }

  let data: unknown = null
  try { data = await res.json() } catch { /* no body */ }

  if (!res.ok) {
    const body = data as { message?: string; code?: string } | null
    const message = body?.message ?? (res.status === 429 ? 'Too many requests. Please wait a moment and try again.' : `Request failed (${res.status})`)
    throw new ApiError(res.status, message, body?.code)
  }
  return data as T
}
