// Coloque a URL do seu Railway aqui (sem a barra / no final)
const API_BASE_URL = 'https://asset-flow-system.vercel.app'

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

function getCookie(name: string) {
  return document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=')
}

export async function ensureCsrfCookie() {
  // Adicionado a API_BASE_URL aqui
  await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
    credentials: 'include',
  })
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

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    if (!getCookie('csrftoken')) {
      await ensureCsrfCookie()
    }

    const csrfToken = getCookie('csrftoken')
    if (csrfToken) {
      headers.set('X-CSRFToken', csrfToken)
    }
  }

  // Adicionado a API_BASE_URL aqui também
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
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
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}