import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { login as loginRequest, logout as logoutRequest, refreshSession } from '../services/authApi'
import {
  clearSession,
  getSession,
  loadPersistedSession,
  saveSessionPayload,
} from '../services/authStorage'
import { HttpError } from '../services/httpClient'

const REFRESH_MARGIN_MS = 60_000

export const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isRefreshing: false,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshTimeoutRef = useRef(null)
  const refreshPromiseRef = useRef(null)
  const performRefreshRef = useRef(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [])

  const clearSessionState = useCallback(() => {
    clearRefreshTimer()
    clearSession()
    setUser(null)
  }, [clearRefreshTimer])

  const scheduleRefresh = useCallback(
    (session) => {
      clearRefreshTimer()

      if (!session?.accessTokenExpiresAt) {
        return
      }

      const now = Date.now()

      if (session.refreshTokenExpiresAt && session.refreshTokenExpiresAt <= now) {
        clearSessionState()
        return
      }

      const refreshDelay = session.accessTokenExpiresAt - now - REFRESH_MARGIN_MS

      if (refreshDelay <= 0) {
        if (performRefreshRef.current) {
          performRefreshRef.current().catch((error) => {
            console.error('Automatic session refresh failed', error)
          })
        }
        return
      }

      refreshTimeoutRef.current = window.setTimeout(
        () => {
          if (performRefreshRef.current) {
            performRefreshRef.current().catch((error) => {
              console.error('Automatic session refresh failed', error)
            })
          }
        },
        Math.max(refreshDelay, 1_000),
      )
    },
    [clearRefreshTimer, clearSessionState],
  )

  const applySession = useCallback(
    (payload) => {
      const session = saveSessionPayload(payload)
      setUser(session?.user ?? null)
      scheduleRefresh(session)
      return session
    },
    [scheduleRefresh],
  )

  const performRefresh = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const session = getSession()
    if (!session?.refreshToken) {
      clearSessionState()
      return null
    }

    setIsRefreshing(true)

    refreshPromiseRef.current = refreshSession(session.refreshToken)
      .then((payload) => applySession(payload))
      .catch((error) => {
        clearSessionState()
        throw error
      })
      .finally(() => {
        refreshPromiseRef.current = null
        setIsRefreshing(false)
      })

    return refreshPromiseRef.current
  }, [applySession, clearSessionState])

  useEffect(() => {
    performRefreshRef.current = performRefresh
  }, [performRefresh])

  useEffect(() => {
    const bootstrap = async () => {
      const stored = loadPersistedSession()

      if (!stored?.refreshToken) {
        clearSessionState()
        setIsBootstrapping(false)
        return
      }

      const now = Date.now()
      if (stored.refreshTokenExpiresAt && stored.refreshTokenExpiresAt <= now) {
        clearSessionState()
        setIsBootstrapping(false)
        return
      }

      if (!stored.accessTokenExpiresAt || stored.accessTokenExpiresAt - now <= REFRESH_MARGIN_MS) {
        try {
          await performRefresh()
        } catch (error) {
          console.error('Initial session refresh failed', error)
        }
        setIsBootstrapping(false)
        return
      }

      setUser(stored.user ?? null)
      scheduleRefresh(stored)
      setIsBootstrapping(false)
    }

    bootstrap()

    return () => {
      clearRefreshTimer()
    }
  }, [clearRefreshTimer, clearSessionState, performRefresh, scheduleRefresh])

  const handleLogin = useCallback(
    async (credentials) => {
      const payload = await loginRequest(credentials)
      const session = applySession(payload)
      return session.user
    },
    [applySession],
  )

  const handleLogout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 401)) {
        console.error('Logout request failed', error)
      }
    } finally {
      clearSessionState()
    }
  }, [clearSessionState])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: isBootstrapping,
      isRefreshing,
      login: handleLogin,
      logout: handleLogout,
      refresh: performRefresh,
    }),
    [handleLogin, handleLogout, isBootstrapping, isRefreshing, performRefresh, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
