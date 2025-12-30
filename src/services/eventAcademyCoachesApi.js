import { del, get, post } from './httpClient'

const BASE_PATH = '/event-academy-coaches'

// ==========================================
// Asignación de coaches a eventos de academia
// ==========================================

/**
 * Asigna un coach a una academia en un evento
 * @param {Object} payload - Datos de asignación
 * @param {string} payload.coachId - ID del coach
 * @param {string} payload.academyId - ID de la academia
 * @param {string} payload.eventId - ID del evento
 */
export const assignCoachToEventAcademy = async (payload) => {
  return post(BASE_PATH, payload)
}

/**
 * Asigna múltiples coaches a una academia en un evento
 * @param {Object} payload - Datos de asignación
 * @param {string} payload.academyId - ID de la academia
 * @param {string} payload.eventId - ID del evento
 * @param {string[]} payload.coachIds - IDs de los coaches
 */
export const bulkAssignCoachesToEventAcademy = async (payload) => {
  return post(`${BASE_PATH}/bulk`, payload)
}

/**
 * Obtiene los coaches de una academia en un evento
 * @param {string} eventId - ID del evento
 * @param {string} academyId - ID de la academia
 */
export const getEventAcademyCoaches = async (eventId, academyId) => {
  return get(`${BASE_PATH}/event/${eventId}/academy/${academyId}`)
}

/**
 * Desasigna un coach de una academia en un evento
 * @param {string} coachId - ID del coach
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const removeCoachFromEventAcademy = async (coachId, academyId, eventId) => {
  return del(`${BASE_PATH}/${coachId}/${academyId}/${eventId}`)
}

export default {
  assignCoachToEventAcademy,
  bulkAssignCoachesToEventAcademy,
  getEventAcademyCoaches,
  removeCoachFromEventAcademy,
}
