import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/academies'

export const listAcademies = async () => {
  return get(BASE_PATH)
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

export default {
  listAcademies,
  createAcademy,
  updateAcademy,
  deleteAcademy,
  getAcademy,
}
