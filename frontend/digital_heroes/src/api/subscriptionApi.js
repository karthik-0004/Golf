import axiosClient from './axiosClient'

export const getPlans = () => axiosClient.get('/subscription/plans/')
export const createCheckout = (data) => axiosClient.post('/subscription/checkout/', data)
export const cancelSubscription = () => axiosClient.post('/subscription/cancel/')
export const getSubscriptionStatus = () => axiosClient.get('/subscription/status/')
