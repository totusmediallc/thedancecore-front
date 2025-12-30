import { get } from './httpClient'

const BASE_PATH = '/academy-event-registration'

// ==========================================
// Resumen y estadísticas de registro
// ==========================================

/**
 * Obtiene el resumen completo del registro de una academia en un evento
 * @param {string} eventId - ID del evento
 * @param {string} academyId - ID de la academia
 */
export const getRegistrationSummary = async (eventId, academyId) => {
  return get(`${BASE_PATH}/event/${eventId}/academy/${academyId}/summary`)
}

/**
 * Obtiene solo las estadísticas (conteos) del registro
 * @param {string} eventId - ID del evento
 * @param {string} academyId - ID de la academia
 */
export const getRegistrationStats = async (eventId, academyId) => {
  return get(`${BASE_PATH}/event/${eventId}/academy/${academyId}/stats`)
}

export default {
  getRegistrationSummary,
  getRegistrationStats,
}
