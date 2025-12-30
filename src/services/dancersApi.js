import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/dancers'

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
 * Lista bailarines con filtros opcionales
 * @param {Object} params - Parámetros de filtrado
 * @param {number} [params.page] - Página
 * @param {number} [params.limit] - Registros por página
 * @param {string} [params.search] - Búsqueda por nombre, email o CURP
 * @param {string} [params.academyId] - Filtrar por academia
 */
export const listDancers = async (params = {}) => {
  const query = buildQueryString(params)
  return get(`${BASE_PATH}${query}`)
}

/**
 * Crea un nuevo bailarín o vincula uno existente (por CURP)
 * @param {Object} payload - Datos del bailarín
 * @param {string} payload.name - Nombre completo
 * @param {string} [payload.email] - Correo electrónico
 * @param {string} [payload.phone] - Teléfono
 * @param {string} payload.birthDate - Fecha de nacimiento (ISO)
 * @param {string} payload.curp - CURP único
 * @param {string} payload.academyId - ID de la academia
 * @returns {Promise<{dancer: Dancer, wasLinked: boolean, message: string}>}
 */
export const createOrLinkDancer = async (payload) => post(`${BASE_PATH}/create-or-link`, payload)

/**
 * Crea un nuevo bailarín
 * @param {Object} payload - Datos del bailarín
 * @param {string} payload.name - Nombre completo
 * @param {string} [payload.email] - Correo electrónico
 * @param {string} [payload.phone] - Teléfono
 * @param {string} payload.birthDate - Fecha de nacimiento (ISO)
 * @param {string} payload.curp - CURP único
 * @param {string} payload.academyId - ID de la academia (usa create-or-link)
 * @param {string[]} [payload.academyIds] - IDs de academias asociadas (create normal)
 */
export const createDancer = async (payload) => {
  // Si viene academyId, usar create-or-link
  if (payload.academyId) {
    return createOrLinkDancer(payload)
  }
  return post(BASE_PATH, payload)
}

/**
 * Actualiza un bailarín existente
 * @param {string} dancerId - ID del bailarín
 * @param {Object} payload - Datos a actualizar
 */
export const updateDancer = async (dancerId, payload) => patch(`${BASE_PATH}/${dancerId}`, payload)

/**
 * Elimina un bailarín
 * @param {string} dancerId - ID del bailarín
 */
export const deleteDancer = async (dancerId) => del(`${BASE_PATH}/${dancerId}`)

/**
 * Obtiene un bailarín por ID
 * @param {string} dancerId - ID del bailarín
 */
export const getDancer = async (dancerId) => get(`${BASE_PATH}/${dancerId}`)

/**
 * Vincula un bailarín existente a una academia
 * @param {string} dancerId - ID del bailarín
 * @param {string} academyId - ID de la academia
 */
export const linkDancerToAcademy = async (dancerId, academyId) => {
  return post(`${BASE_PATH}/${dancerId}/link/${academyId}`)
}

/**
 * Desvincula un bailarín de una academia (NO lo elimina del sistema)
 * @param {string} dancerId - ID del bailarín
 * @param {string} academyId - ID de la academia
 */
export const unlinkDancerFromAcademy = async (dancerId, academyId) => {
  return del(`${BASE_PATH}/${dancerId}/unlink/${academyId}`)
}

export default {
  listDancers,
  createDancer,
  createOrLinkDancer,
  updateDancer,
  deleteDancer,
  getDancer,
  linkDancerToAcademy,
  unlinkDancerFromAcademy,
}
