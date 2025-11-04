import { getJwtExpiration } from '../utils/jwt'

const STORAGE_KEY = 'thedancecore.auth.session'

let inMemorySession = null

const persistInMemory = (session) => {
  inMemorySession = session
}

const readFromStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw)
  } catch (error) {
    console.error('Unable to parse persisted auth session', error)
    return null
  }
}

export const loadPersistedSession = () => {
  const stored = readFromStorage()
  if (stored) {
    persistInMemory(stored)
  }
  return stored
}

export const getSession = () => {
  if (inMemorySession) {
    return inMemorySession
  }
  return loadPersistedSession()
}

export const saveSessionPayload = (payload) => {
  if (!payload) {
    return null
  }

  const { accessToken, refreshToken, user, tokenType, expiresIn } = payload
  const accessTokenExpiresAt = getJwtExpiration(accessToken)
  const refreshTokenExpiresAt = getJwtExpiration(refreshToken)

  const session = {
    user,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    tokenType: tokenType ?? 'Bearer',
    expiresIn,
  }

  persistInMemory(session)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch (error) {
      console.error('Unable to store auth session', error)
    }
  }

  return session
}

export const clearSession = () => {
  persistInMemory(null)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Unable to clear auth session', error)
    }
  }
}
