import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/choreographies'

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

// ==========================================
// CRUD de Coreografías
// ==========================================

/**
 * Lista coreografías con filtros opcionales
 * @param {Object} params - Parámetros de filtrado
 */
export const listChoreographies = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}${query}`)
}

/**
 * Crea una nueva coreografía
 * @param {Object} payload - Datos de la coreografía
 * @param {string} payload.name - Nombre de la coreografía
 * @param {string} payload.academyId - UUID de la academia
 * @param {string} payload.eventId - UUID del evento
 * @param {string} payload.musicGenreId - UUID del género musical
 * @param {string} payload.categoryId - UUID de la categoría
 * @param {string} [payload.subcategoryId] - UUID de subcategoría (opcional)
 */
export const createChoreography = async (payload) => {
  return post(BASE_PATH, payload)
}

/**
 * Obtiene una coreografía por ID
 * @param {string} choreographyId - ID de la coreografía
 */
export const getChoreography = async (choreographyId) => {
  return get(`${BASE_PATH}/${choreographyId}`)
}

/**
 * Actualiza una coreografía
 * @param {string} choreographyId - ID de la coreografía
 * @param {Object} payload - Datos a actualizar
 */
export const updateChoreography = async (choreographyId, payload) => {
  return patch(`${BASE_PATH}/${choreographyId}`, payload)
}

/**
 * Elimina una coreografía
 * @param {string} choreographyId - ID de la coreografía
 */
export const deleteChoreography = async (choreographyId) => {
  return del(`${BASE_PATH}/${choreographyId}`)
}

// ==========================================
// Consultas específicas
// ==========================================

/**
 * Obtiene las coreografías de una academia en un evento
 * @param {string} eventId - ID del evento
 * @param {string} academyId - ID de la academia
 */
export const getEventAcademyChoreographies = async (eventId, academyId) => {
  return get(`${BASE_PATH}/event/${eventId}/academy/${academyId}`)
}

export default {
  listChoreographies,
  createChoreography,
  getChoreography,
  updateChoreography,
  deleteChoreography,
  getEventAcademyChoreographies,
}
