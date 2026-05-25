// A URL definitiva do seu Railway
const API_BASE_URL = 'https://asset-flow-production-17bf.up.railway.app'

// Guardamos o token na memória do Javascript
let savedCsrfToken = ''

type FetchInit = RequestInit & {
  skipJson?: boolean
}

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

// Nova função: Lê o JSON do backend em vez de ler document.cookie
export async function ensureCsrfCookie() {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    credentials: 'include',
  })
  const data = await response.json()
  if (data.csrfToken) {
    savedCsrfToken = data.csrfToken
  }
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export async function apiFetch<T>(path: string, init: FetchInit = {}) {
  const method = init.method ?? 'GET'
  const headers = new Headers(init.headers)
  const body = init.body

  if (!(body instanceof FormData) && body && !headers.has('Content-Type') && !init.skipJson) {
    headers.set('Content-Type', 'application/json')
  }

  // Se for POST/PUT/DELETE, injeta o token da memória
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    if (!savedCsrfToken) {
      await ensureCsrfCookie()
    }
    if (savedCsrfToken) {
      headers.set('X-CSRFToken', savedCsrfToken)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include', // Mantém a sessão viva
    headers,
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'detail' in payload
        ? String(payload.detail)
        : 'Nao foi possivel concluir a requisicao.'

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.') {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}