import { get } from './httpClient'

const BASE_PATH = '/locations'

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    searchParams.append(key, value)
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export const listStates = async (params = {}) => {
  return get(`${BASE_PATH}/states${buildQuery(params)}`)
}

export const listMunicipalities = async (params = {}) => {
  if (!params.stateId) {
    throw new Error('stateId is required to list municipalities')
  }

  return get(`${BASE_PATH}/municipalities${buildQuery(params)}`)
}

export const listColonies = async (params = {}) => {
  if (!params.municipalityId) {
    throw new Error('municipalityId is required to list colonies')
  }

  return get(`${BASE_PATH}/colonies${buildQuery(params)}`)
}

export default {
  listStates,
  listMunicipalities,
  listColonies,
}
