import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/users'

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, item)
        }
      })
      return
    }

    searchParams.append(key, value)
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export const listUsers = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}${query}`)
}

export const createUser = async (payload) => {
  return post(BASE_PATH, payload)
}

export const updateUser = async (userId, payload) => {
  return patch(`${BASE_PATH}/${userId}`, payload)
}

export const deleteUser = async (userId) => {
  return del(`${BASE_PATH}/${userId}`)
}

export const getUser = async (userId) => {
  return get(`${BASE_PATH}/${userId}`)
}

export default {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUser,
}
