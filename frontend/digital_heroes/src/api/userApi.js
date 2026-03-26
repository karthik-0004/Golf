import axiosClient from './axiosClient'

export const getProfile = () => axiosClient.get('/user/profile/')
export const updateProfile = (data) => axiosClient.put('/user/profile/', data)
export const selectCharity = (data) => axiosClient.post('/user/select-charity/', data)
