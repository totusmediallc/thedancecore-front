export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/$/, '')
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 15000)

export const AUTH_REFRESH_ENDPOINT = '/auth/refresh'
export const AUTH_LOGIN_ENDPOINT = '/auth/login'
export const AUTH_LOGOUT_ENDPOINT = '/auth/logout'
export const AUTH_PROFILE_ENDPOINT = '/auth/profile'
