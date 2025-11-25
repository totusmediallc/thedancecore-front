import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/coaches'

export const listCoaches = async () => get(BASE_PATH)

export const createCoach = async (payload) => post(BASE_PATH, payload)

export const updateCoach = async (coachId, payload) => patch(`${BASE_PATH}/${coachId}`, payload)

export const deleteCoach = async (coachId) => del(`${BASE_PATH}/${coachId}`)

export const getCoach = async (coachId) => get(`${BASE_PATH}/${coachId}`)

export default {
  listCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  getCoach,
}
