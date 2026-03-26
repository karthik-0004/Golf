import axios from 'axios'

export const getApiError = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  (typeof error?.response?.data === 'string' ? error.response.data : null) ||
  error?.message ||
  'Something went wrong'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/token/refresh/`,
          { refresh: refreshToken },
        )

        const newAccessToken = refreshResponse.data?.access
        if (!newAccessToken) {
          throw new Error('No access token returned from refresh endpoint.')
        }

        localStorage.setItem('access_token', newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default axiosClient
