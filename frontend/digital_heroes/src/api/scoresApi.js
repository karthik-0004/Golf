import axiosClient from './axiosClient'

export const getScores = () => axiosClient.get('/scores/')
export const addScore = (data) => axiosClient.post('/scores/', data)
export const updateScore = (id, data) => axiosClient.put(`/scores/${id}/`, data)
export const deleteScore = (id) => axiosClient.delete(`/scores/${id}/`)
