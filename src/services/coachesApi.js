import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/coaches'

/**
 * Construye query string a partir de parámetros
 */
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

/**
 * Lista profesores con filtros opcionales
 * @param {Object} params - Parámetros de filtrado
 * @param {number} [params.page] - Página
 * @param {number} [params.limit] - Registros por página
 * @param {string} [params.search] - Búsqueda por nombre, teléfono o correo
 * @param {string} [params.academyId] - Filtrar por academia
 */
export const listCoaches = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}${query}`)
}

/**
 * Crea un nuevo profesor
 * @param {Object} payload - Datos del profesor
 * @param {string} payload.name - Nombre completo
 * @param {string} payload.phone - Teléfono
 * @param {string} payload.mail - Correo electrónico
 * @param {string} payload.academyId - ID de la academia
 */
export const createCoach = async (payload) => post(BASE_PATH, payload)

/**
 * Actualiza un profesor existente
 * @param {string} coachId - ID del profesor
 * @param {Object} payload - Datos a actualizar
 */
export const updateCoach = async (coachId, payload) => patch(`${BASE_PATH}/${coachId}`, payload)

/**
 * Elimina un profesor
 * @param {string} coachId - ID del profesor
 */
export const deleteCoach = async (coachId) => del(`${BASE_PATH}/${coachId}`)

/**
 * Obtiene un profesor por ID
 * @param {string} coachId - ID del profesor
 */
export const getCoach = async (coachId) => get(`${BASE_PATH}/${coachId}`)

export default {
  listCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoach,
}
