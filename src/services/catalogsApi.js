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
 * Obtiene las escalas de tallas (con sus tallas incluidas si el backend lo soporta)
 */
export const listSizeScales = async () => {
  return get('/size-scales')
}

/**
 * Obtiene los grupos de audiencia
 */
export const listAudienceGroups = async () => {
  return get('/audience-groups')
}

/**
 * Obtiene las tallas agrupadas por escala
 * Hace fetch de escalas y tallas, luego las agrupa
 */
export const getSizesGroupedByScale = async () => {
  const [scales, sizes] = await Promise.all([
    listSizeScales(),
    listSizes(),
  ])
  
  const scalesData = scales?.data || scales || []
  const sizesData = sizes?.data || sizes || []
  
  // Agrupar tallas por escala
  return scalesData.map((scale) => ({
    ...scale,
    sizes: sizesData
      .filter((size) => size.sizeScaleId === scale.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
  }))
}

export default {
  listTshirtTypes,
  listSizes,
  listSizeScales,
  listAudienceGroups,
  getSizesGroupedByScale,
}
