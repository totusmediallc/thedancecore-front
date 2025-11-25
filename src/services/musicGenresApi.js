import { del, get, patch, post } from './httpClient'

const BASE_PATH = '/music-genres'

export const listMusicGenres = async () => get(BASE_PATH)

export const createMusicGenre = async (payload) => post(BASE_PATH, payload)

export const updateMusicGenre = async (genreId, payload) => patch(`${BASE_PATH}/${genreId}`, payload)

export const deleteMusicGenre = async (genreId) => del(`${BASE_PATH}/${genreId}`)

export const getMusicGenre = async (genreId) => get(`${BASE_PATH}/${genreId}`)

export default {
  listMusicGenres,
  createMusicGenre,
  updateMusicGenre,
  deleteMusicGenre,
  getMusicGenre,
}
