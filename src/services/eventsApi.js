import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/events'

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || Number.isNaN(value)) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          searchParams.append(key, entry)
        }
      })
      return
    }

    searchParams.append(key, value)
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

const buildFormData = (payload = {}) => {
  const formData = new FormData()

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (key === 'banner') {
      if (value instanceof File || value instanceof Blob) {
        formData.append('banner', value, value.name ?? 'banner')
      }
      return
    }

    if (key === 'data') {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      if (serialized) {
        formData.append('data', serialized)
      }
      return
    }

    formData.append(key, value)
  })

  return formData
}

export const listEvents = async (params = {}) => {
  return get(`${BASE_PATH}${buildQuery(params)}`)
}

export const getEvent = async (eventId) => {
  return get(`${BASE_PATH}/${eventId}`)
}

export const createEvent = async (payload) => {
  return post(BASE_PATH, buildFormData(payload))
}

export const updateEvent = async (eventId, payload) => {
  return patch(`${BASE_PATH}/${eventId}`, buildFormData(payload))
}

export const deleteEvent = async (eventId) => {
  return del(`${BASE_PATH}/${eventId}`)
}

export default {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
}
