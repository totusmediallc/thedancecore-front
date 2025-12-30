import { get } from './httpClient'

// ==========================================
// Catálogos para pedidos de playeras
// ==========================================

/**
 * Obtiene los tipos de playera disponibles
 */
export const listTshirtTypes = async () => {
  return get('/tshirt-types')
}

/**
 * Obtiene las tallas disponibles
 */
export const listSizes = async () => {
  return get('/sizes')
}

/**
 * Obtiene las escalas de tallas
 */
export const listSizeScales = async () => {
  return get('/size-scales')
}

export default {
  listTshirtTypes,
  listSizes,
  listSizeScales,
}
