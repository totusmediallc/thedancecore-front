import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/subcategories'

export const listSubcategories = async () => get(BASE_PATH)

export const createSubcategory = async (payload) => post(BASE_PATH, payload)

export const updateSubcategory = async (subcategoryId, payload) =>
  patch(`${BASE_PATH}/${subcategoryId}`, payload)

export const deleteSubcategory = async (subcategoryId) => del(`${BASE_PATH}/${subcategoryId}`)

export const getSubcategory = async (subcategoryId) => get(`${BASE_PATH}/${subcategoryId}`)

export default {
  listSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getSubcategory,
}
