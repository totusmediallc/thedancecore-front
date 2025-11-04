import {
  AUTH_LOGIN_ENDPOINT,
  AUTH_LOGOUT_ENDPOINT,
  AUTH_PROFILE_ENDPOINT,
  AUTH_REFRESH_ENDPOINT,
} from '../config/apiConfig'
import { get, post } from './httpClient'

export const login = (credentials) =>
  post(AUTH_LOGIN_ENDPOINT, credentials, { skipAuth: true, skipAuthRefresh: true })

export const logout = () => post(AUTH_LOGOUT_ENDPOINT, null)

export const fetchProfile = () => get(AUTH_PROFILE_ENDPOINT)

export const refreshSession = (refreshToken) =>
  post(AUTH_REFRESH_ENDPOINT, { refreshToken }, { skipAuth: true, skipAuthRefresh: true })
