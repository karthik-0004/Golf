import axiosClient from './axiosClient'

export const getCharities = (search) => axiosClient.get('/charities/', { params: { search } })
export const getCharityDetail = (slug) => axiosClient.get(`/charities/${slug}/`)
