import { API_BASE_URL, API_TIMEOUT, AUTH_REFRESH_ENDPOINT } from '../config/apiConfig'
import { clearSession, getSession, saveSessionPayload } from './authStorage'

export class HttpError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.data = data
  }
}

const buildUrl = (path) => {
  if (!path) {
    return API_BASE_URL
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

const parseResponsePayload = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch (error) {
      console.error('Error parsing JSON response', error)
      return null
    }
  }

  const text = await response.text()
  if (!text) {
    return null
  }
  return { message: text }
}

let refreshPromise = null

const executeRefresh = async () => {
  const session = getSession()
  if (!session?.refreshToken) {
    throw new HttpError('No refresh token available', 401, null)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  let response
  try {
    response = await fetch(buildUrl(AUTH_REFRESH_ENDPOINT), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new HttpError('Refresh token request timed out', 408, null)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  const payload = await parseResponsePayload(response)
  if (!response.ok) {
    throw new HttpError(payload?.message ?? 'Unable to refresh session', response.status, payload)
  }

  saveSessionPayload(payload)
  return payload.accessToken
}

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = executeRefresh()
      .catch((error) => {
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

const withTimeout = async (url, options) => {
  const controller = new AbortController()
  const { timeout, ...rest } = options
  const timeoutId = setTimeout(() => controller.abort(), timeout ?? API_TIMEOUT)

  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new HttpError('Request timed out', 408, null)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const request = async (path, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    skipAuth = false,
    skipAuthRefresh = false,
    retryAttempt = 0,
    timeout = API_TIMEOUT,
  } = options

  const url = buildUrl(path)

  const finalHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  let preparedBody = body
  const isJsonPayload =
    body &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams)

  if (isJsonPayload && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json'
    preparedBody = JSON.stringify(body)
  }

  if (!skipAuth) {
    const session = getSession()
    if (session?.accessToken) {
      const prefix = session.tokenType ?? 'Bearer'
      finalHeaders.Authorization = `${prefix} ${session.accessToken}`
    }
  }

  let response
  try {
    response = await withTimeout(url, {
      method,
      headers: finalHeaders,
      body: preparedBody,
      timeout,
    })
  } catch (error) {
    throw error
  }

  if (response.status === 401 && !skipAuth && !skipAuthRefresh) {
    if (retryAttempt >= 1) {
      clearSession()
      const payload = await parseResponsePayload(response)
      throw new HttpError(payload?.message ?? 'Unauthorized', response.status, payload)
    }

    try {
      await refreshAccessToken()
    } catch (error) {
      clearSession()
      throw error
    }

    return request(path, {
      ...options,
      headers,
      skipAuthRefresh: true,
      retryAttempt: retryAttempt + 1,
    })
  }

  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    throw new HttpError(payload?.message ?? 'Request failed', response.status, payload)
  }

  return payload
}

export const get = (path, options = {}) => request(path, { ...options, method: 'GET' })
export const post = (path, body, options = {}) =>
  request(path, { ...options, method: 'POST', body })
export const patch = (path, body, options = {}) =>
  request(path, { ...options, method: 'PATCH', body })
export const del = (path, options = {}) => request(path, { ...options, method: 'DELETE' })
