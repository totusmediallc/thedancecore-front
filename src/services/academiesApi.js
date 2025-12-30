import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/academies'

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
// CRUD Básico de Academias
// ==========================================

export const listAcademies = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}${query}`)
}

export const createAcademy = async (payload) => {
  return post(BASE_PATH, payload)
}

export const updateAcademy = async (academyId, payload) => {
  return patch(`${BASE_PATH}/${academyId}`, payload)
}

export const deleteAcademy = async (academyId) => {
  return del(`${BASE_PATH}/${academyId}`)
}

export const getAcademy = async (academyId) => {
  return get(`${BASE_PATH}/${academyId}`)
}

// ==========================================
// Academia con Usuario
// ==========================================

/**
 * Crear academia con usuario administrador
 * @param {Object} payload - Datos de la academia y usuario
 * @param {string} payload.name - Nombre de la academia
 * @param {string} payload.contactPhoneNumber - Teléfono de contacto
 * @param {string} payload.mail - Correo de la academia
 * @param {string} [payload.web] - Sitio web
 * @param {number} payload.colonyId - ID de la colonia
 * @param {string} payload.googlemaps - Enlace de Google Maps
 * @param {string} [payload.logo] - URL del logo
 * @param {Object} payload.adminUser - Datos del usuario administrador
 * @param {string} payload.adminUser.email - Email del usuario
 * @param {string} payload.adminUser.password - Contraseña
 * @param {string} payload.adminUser.firstName - Nombre
 * @param {string} [payload.adminUser.lastName] - Apellido
 */
export const createAcademyWithUser = async (payload) => {
  return post(`${BASE_PATH}/with-user`, payload)
}

/**
 * Obtener academia con sus usuarios
 * @param {string} academyId - ID de la academia
 */
export const getAcademyWithUsers = async (academyId) => {
  return get(`${BASE_PATH}/${academyId}/with-users`)
}

// ==========================================
// Gestión de Usuarios de Academia
// ==========================================

/**
 * Listar usuarios de una academia
 * @param {string} academyId - ID de la academia
 * @param {Object} [params] - Parámetros de filtrado
 * @param {number} [params.page] - Página
 * @param {number} [params.limit] - Registros por página
 * @param {string} [params.search] - Búsqueda
 * @param {string} [params.role] - Filtrar por rol
 * @param {boolean} [params.isActive] - Filtrar por estado
 */
export const listAcademyUsers = async (academyId, params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}/${academyId}/users${query}`)
}

/**
 * Obtener estadísticas de usuarios de una academia
 * @param {string} academyId - ID de la academia
 */
export const getAcademyUsersStats = async (academyId) => {
  return get(`${BASE_PATH}/${academyId}/users/stats`)
}

/**
 * Crear usuario en una academia
 * @param {string} academyId - ID de la academia
 * @param {Object} payload - Datos del usuario
 * @param {string} payload.email - Email
 * @param {string} payload.password - Contraseña
 * @param {string} payload.firstName - Nombre
 * @param {string} [payload.lastName] - Apellido
 * @param {string} payload.role - Rol (academy, teacher, dancer)
 * @param {boolean} [payload.isActive] - Estado activo
 */
export const createAcademyUser = async (academyId, payload) => {
  return post(`${BASE_PATH}/${academyId}/users`, payload)
}

/**
 * Obtener detalle de un usuario de academia
 * @param {string} academyId - ID de la academia
 * @param {string} userId - ID del usuario
 */
export const getAcademyUser = async (academyId, userId) => {
  return get(`${BASE_PATH}/${academyId}/users/${userId}`)
}

/**
 * Actualizar usuario de una academia
 * @param {string} academyId - ID de la academia
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Datos a actualizar
 */
export const updateAcademyUser = async (academyId, userId, payload) => {
  return patch(`${BASE_PATH}/${academyId}/users/${userId}`, payload)
}

/**
 * Activar un usuario de academia
 * @param {string} academyId - ID de la academia
 * @param {string} userId - ID del usuario
 */
export const activateAcademyUser = async (academyId, userId) => {
  return patch(`${BASE_PATH}/${academyId}/users/${userId}/activate`)
}

/**
 * Desactivar un usuario de academia
 * @param {string} academyId - ID de la academia
 * @param {string} userId - ID del usuario
 */
export const deactivateAcademyUser = async (academyId, userId) => {
  return patch(`${BASE_PATH}/${academyId}/users/${userId}/deactivate`)
}

/**
 * Resetear contraseña de un usuario de academia
 * @param {string} academyId - ID de la academia
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Nueva contraseña
 * @param {string} payload.password - Nueva contraseña
 */
export const resetAcademyUserPassword = async (academyId, userId, payload) => {
  return post(`${BASE_PATH}/${academyId}/users/${userId}/reset-password`, payload)
}

/**
 * Eliminar permanentemente un usuario de academia
 * @param {string} academyId - ID de la academia
 * @param {string} userId - ID del usuario
 */
export const deleteAcademyUser = async (academyId, userId) => {
  return del(`${BASE_PATH}/${academyId}/users/${userId}`)
}

/**
 * Transferir usuario a otra academia
 * @param {string} academyId - ID de la academia actual
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Datos de transferencia
 * @param {string} payload.newAcademyId - ID de la nueva academia
 */
export const transferAcademyUser = async (academyId, userId, payload) => {
  return post(`${BASE_PATH}/${academyId}/users/${userId}/transfer`, payload)
}

export default {
  // CRUD básico
  listAcademies,
  createAcademy,
  updateAcademy,
  deleteAcademy,
  getAcademy,
  // Con usuario
  createAcademyWithUser,
  getAcademyWithUsers,
  // Gestión de usuarios de academia
  listAcademyUsers,
  getAcademyUsersStats,
  createAcademyUser,
  getAcademyUser,
  updateAcademyUser,
  activateAcademyUser,
  deactivateAcademyUser,
  resetAcademyUserPassword,
  deleteAcademyUser,
  transferAcademyUser,
}
