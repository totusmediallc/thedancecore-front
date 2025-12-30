import { del, get, patch, post } from './httpClient'

const ORDERS_PATH = '/orders'
const ORDER_ITEMS_PATH = '/order-items'

// ==========================================
// CRUD de Pedidos (Orders)
// ==========================================

/**
 * Obtiene o crea un pedido para una academia en un evento
 * @param {Object} payload - Datos del pedido
 * @param {string} payload.eventId - ID del evento
 * @param {string} payload.academyId - ID de la academia
 */
export const findOrCreateOrder = async (payload) => {
  return post(`${ORDERS_PATH}/find-or-create`, payload)
}

/**
 * Obtiene el pedido de una academia en un evento
 * @param {string} eventId - ID del evento
 * @param {string} academyId - ID de la academia
 */
export const getEventAcademyOrder = async (eventId, academyId) => {
  return get(`${ORDERS_PATH}/event/${eventId}/academy/${academyId}`)
}

/**
 * Actualiza un pedido
 * @param {string} orderId - ID del pedido
 * @param {Object} payload - Datos a actualizar
 */
export const updateOrder = async (orderId, payload) => {
  return patch(`${ORDERS_PATH}/${orderId}`, payload)
}

/**
 * Obtiene un pedido por ID
 * @param {string} orderId - ID del pedido
 */
export const getOrder = async (orderId) => {
  return get(`${ORDERS_PATH}/${orderId}`)
}

// ==========================================
// CRUD de Items de Pedido
// ==========================================

/**
 * Agrega un ítem al pedido
 * @param {Object} payload - Datos del ítem
 * @param {string} payload.orderId - ID del pedido
 * @param {string} payload.tshirtTypeId - ID del tipo de playera
 * @param {string} payload.sizeId - ID de la talla
 * @param {number} payload.quantity - Cantidad
 * @param {string} [payload.notes] - Notas opcionales
 */
export const addOrderItem = async (payload) => {
  return post(ORDER_ITEMS_PATH, payload)
}

/**
 * Obtiene los ítems de un pedido
 * @param {string} orderId - ID del pedido
 */
export const getOrderItems = async (orderId) => {
  return get(`${ORDER_ITEMS_PATH}/order/${orderId}`)
}

/**
 * Actualiza un ítem del pedido
 * @param {string} itemId - ID del ítem
 * @param {Object} payload - Datos a actualizar
 */
export const updateOrderItem = async (itemId, payload) => {
  return patch(`${ORDER_ITEMS_PATH}/${itemId}`, payload)
}

/**
 * Elimina un ítem del pedido
 * @param {string} itemId - ID del ítem
 */
export const deleteOrderItem = async (itemId) => {
  return del(`${ORDER_ITEMS_PATH}/${itemId}`)
}

export default {
  findOrCreateOrder,
  getEventAcademyOrder,
  updateOrder,
  getOrder,
  addOrderItem,
  getOrderItems,
  updateOrderItem,
  deleteOrderItem,
}
