import { del, get, post } from './httpClient'

const PERMISSIONS_PATH = '/permissions'
const USERS_PATH = '/users'

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
// Endpoints de Permisos del Sistema
// ==========================================

/**
 * Lista todos los permisos del sistema
 * @param {Object} params - Parámetros de filtrado
 * @param {string} [params.module] - Filtrar por módulo
 * @param {string} [params.search] - Búsqueda por texto
 * @returns {Promise<Array>} Lista de permisos
 */
export const listPermissions = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${PERMISSIONS_PATH}${query}`)
}

/**
 * Lista los módulos disponibles de permisos
 * @returns {Promise<Array<string>>} Lista de nombres de módulos
 */
export const listPermissionModules = async () => {
  return get(`${PERMISSIONS_PATH}/modules`)
}

/**
 * Obtiene los permisos por defecto de un rol
 * @param {string} role - Nombre del rol (admin, academy, teacher, dancer)
 * @returns {Promise<Array>} Lista de permisos del rol
 */
export const getPermissionsByRole = async (role) => {
  return get(`${PERMISSIONS_PATH}/roles/${role}`)
}

// ==========================================
// Endpoints de Permisos de Usuario
// ==========================================

/**
 * Obtiene el detalle de permisos de un usuario
 * Incluye permisos del rol, overrides y permisos efectivos
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Detalle de permisos
 */
export const getUserPermissionsDetail = async (userId) => {
  return get(`${USERS_PATH}/${userId}/permissions-detail`)
}

/**
 * Asigna un permiso a un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Datos del permiso
 * @param {string} payload.permissionId - ID del permiso
 * @param {boolean} payload.granted - Si se otorga o revoca
 * @returns {Promise<Object>}
 */
export const assignPermissionToUser = async (userId, payload) => {
  return post(`${USERS_PATH}/${userId}/permissions`, payload)
}

/**
 * Asigna un permiso a un usuario por código
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Datos del permiso
 * @param {string} payload.permissionCode - Código del permiso
 * @param {boolean} payload.granted - Si se otorga o revoca
 * @returns {Promise<Object>}
 */
export const assignPermissionByCode = async (userId, payload) => {
  return post(`${USERS_PATH}/${userId}/permissions/by-code`, payload)
}

/**
 * Asigna múltiples permisos a un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Datos de los permisos
 * @param {string[]} payload.permissionIds - IDs de los permisos
 * @param {boolean} payload.granted - Si se otorgan o revocan
 * @returns {Promise<Object>}
 */
export const assignBulkPermissions = async (userId, payload) => {
  return post(`${USERS_PATH}/${userId}/permissions/bulk`, payload)
}

/**
 * Sincroniza los permisos de un usuario (establece lista exacta)
 * @param {string} userId - ID del usuario
 * @param {Object} payload - Datos de sincronización
 * @param {string} payload.role - Rol base del usuario
 * @param {string[]} payload.permissionCodes - Códigos de permisos a establecer
 * @returns {Promise<Object>}
 */
export const syncUserPermissions = async (userId, payload) => {
  return post(`${USERS_PATH}/${userId}/permissions/sync`, payload)
}

/**
 * Elimina un override de permiso de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} permissionId - ID del permiso
 * @returns {Promise<Object>}
 */
export const removePermissionOverride = async (userId, permissionId) => {
  return del(`${USERS_PATH}/${userId}/permissions/${permissionId}`)
}

/**
 * Elimina todos los overrides de permisos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>}
 */
export const removeAllPermissionOverrides = async (userId) => {
  return del(`${USERS_PATH}/${userId}/permissions`)
}

export default {
  // Sistema
  listPermissions,
  listPermissionModules,
  getPermissionsByRole,
  // Usuario
  getUserPermissionsDetail,
  assignPermissionToUser,
  assignPermissionByCode,
  assignBulkPermissions,
  syncUserPermissions,
  removePermissionOverride,
  removeAllPermissionOverrides,
}
