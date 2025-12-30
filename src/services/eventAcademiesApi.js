import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/event-academies'

/**
 * Construye query string a partir de parámetros
 */
const buildQueryString = (params = {}) => {
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

// ==========================================
// Listado y consulta
// ==========================================

/**
 * Lista todas las relaciones evento-academia (admin)
 * @param {Object} params - Parámetros de filtrado
 */
export const listEventAcademies = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}${query}`)
}

/**
 * Obtiene los eventos de una academia específica
 * @param {string} academyId - ID de la academia
 * @param {Object} params - Parámetros opcionales
 */
export const getAcademyEvents = async (academyId, params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}/academy/${academyId}${query}`)
}

/**
 * Obtiene las academias de un evento específico
 * @param {string} eventId - ID del evento
 * @param {Object} params - Parámetros opcionales
 */
export const getEventAcademies = async (eventId, params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}/event/${eventId}${query}`)
}

/**
 * Obtiene el detalle de participación de una academia en un evento
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const getEventAcademyDetail = async (academyId, eventId) => {
  return get(`${BASE_PATH}/${academyId}/${eventId}`)
}

// ==========================================
// Gestión de estados
// ==========================================

/**
 * Actualiza el estado de participación
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 * @param {Object} payload - Datos a actualizar
 * @param {string} payload.status - Nuevo estado (accepted, rejected, registered)
 */
export const updateEventAcademyStatus = async (academyId, eventId, payload) => {
  return patch(`${BASE_PATH}/${academyId}/${eventId}/status`, payload)
}

/**
 * Acepta una invitación a evento
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const acceptEventInvitation = async (academyId, eventId) => {
  return updateEventAcademyStatus(academyId, eventId, { status: 'accepted' })
}

/**
 * Rechaza una invitación a evento
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const rejectEventInvitation = async (academyId, eventId) => {
  return updateEventAcademyStatus(academyId, eventId, { status: 'rejected' })
}

/**
 * Marca el registro como completado (enviado por la academia)
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const completeEventRegistration = async (academyId, eventId) => {
  return updateEventAcademyStatus(academyId, eventId, { status: 'registered' })
}

/**
 * Valida/aprueba el registro de una academia (Admin)
 * Cambia el estado de 'registered' a 'completed'
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const validateEventRegistration = async (academyId, eventId) => {
  return updateEventAcademyStatus(academyId, eventId, { status: 'completed' })
}

/**
 * Reactiva el registro de una academia para permitir ediciones (Admin)
 * Cambia el estado de vuelta a 'accepted'
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const reactivateEventRegistration = async (academyId, eventId) => {
  return updateEventAcademyStatus(academyId, eventId, { status: 'accepted' })
}

// ==========================================
// Asignación de academias (Admin)
// ==========================================

/**
 * Asigna una academia a un evento (invitación)
 * @param {Object} payload - Datos de la asignación
 * @param {string} payload.academyId - ID de la academia
 * @param {string} payload.eventId - ID del evento
 */
export const assignAcademyToEvent = async (payload) => {
  return post(BASE_PATH, payload)
}

/**
 * Asigna múltiples academias a un evento
 * @param {Object} payload - Datos de la asignación
 * @param {string} payload.eventId - ID del evento
 * @param {string[]} payload.academyIds - IDs de las academias
 */
export const bulkAssignAcademiesToEvent = async (payload) => {
  return post(`${BASE_PATH}/bulk`, payload)
}

/**
 * Elimina la asignación de una academia a un evento
 * @param {string} academyId - ID de la academia
 * @param {string} eventId - ID del evento
 */
export const removeAcademyFromEvent = async (academyId, eventId) => {
  return del(`${BASE_PATH}/${academyId}/${eventId}`)
}

export default {
  listEventAcademies,
  getAcademyEvents,
  getEventAcademies,
  getEventAcademyDetail,
  updateEventAcademyStatus,
  acceptEventInvitation,
  rejectEventInvitation,
  completeEventRegistration,
  validateEventRegistration,
  reactivateEventRegistration,
  assignAcademyToEvent,
  bulkAssignAcademiesToEvent,
  removeAcademyFromEvent,
}
