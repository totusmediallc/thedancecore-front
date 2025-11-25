import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/categories'

export const listCategories = async () => get(BASE_PATH)

export const createCategory = async (payload) => post(BASE_PATH, payload)

export const updateCategory = async (categoryId, payload) =>
  patch(`${BASE_PATH}/${categoryId}`, payload)

export const deleteCategory = async (categoryId) => del(`${BASE_PATH}/${categoryId}`)

export const getCategory = async (categoryId) => get(`${BASE_PATH}/${categoryId}`)

export default {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
}
