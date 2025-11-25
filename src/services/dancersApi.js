import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/dancers'

export const listDancers = async () => get(BASE_PATH)

export const createDancer = async (payload) => post(BASE_PATH, payload)

export const updateDancer = async (dancerId, payload) => patch(`${BASE_PATH}/${dancerId}`, payload)

export const deleteDancer = async (dancerId) => del(`${BASE_PATH}/${dancerId}`)

export const getDancer = async (dancerId) => get(`${BASE_PATH}/${dancerId}`)

export default {
  listDancers,
  createDancer,
  updateDancer,
  deleteDancer,
  getDancer,
}
