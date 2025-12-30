import { del, get, post } from './httpClient'

const BASE_PATH = '/choreography-dancers'

// ==========================================
// Asignación de bailarines a coreografías
// ==========================================

/**
 * Asigna un bailarín a una coreografía
 * @param {Object} payload - Datos de asignación
 * @param {string} payload.dancerId - ID del bailarín
 * @param {string} payload.choreographyId - ID de la coreografía
 */
export const assignDancerToChoreography = async (payload) => {
  return post(BASE_PATH, payload)
}

/**
 * Asigna múltiples bailarines a una coreografía
 * @param {Object} payload - Datos de asignación
 * @param {string} payload.choreographyId - ID de la coreografía
 * @param {string[]} payload.dancerIds - IDs de los bailarines
 */
export const bulkAssignDancersToChoreography = async (payload) => {
  return post(`${BASE_PATH}/bulk`, payload)
}

/**
 * Obtiene los bailarines de una coreografía
 * @param {string} choreographyId - ID de la coreografía
 */
export const getChoreographyDancers = async (choreographyId) => {
  return get(`${BASE_PATH}/choreography/${choreographyId}`)
}

/**
 * Desasigna un bailarín de una coreografía
 * @param {string} dancerId - ID del bailarín
 * @param {string} choreographyId - ID de la coreografía
 */
export const removeDancerFromChoreography = async (dancerId, choreographyId) => {
  return del(`${BASE_PATH}/${dancerId}/${choreographyId}`)
}

export default {
  assignDancerToChoreography,
  bulkAssignDancersToChoreography,
  getChoreographyDancers,
  removeDancerFromChoreography,
}
