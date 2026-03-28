import axios from 'axios'

const pendingControllers = new Set()

const attachAbortController = (config) => {
  if (config?.signal) return config

  const controller = new AbortController()
  pendingControllers.add(controller)

  return {
    ...config,
    signal: controller.signal,
    __requestController: controller,
  }
}

const detachAbortController = (config) => {
  const controller = config?.__requestController
  if (controller) {
    pendingControllers.delete(controller)
  }
}

export const cancelAllPendingRequests = (reason = 'Session changed, cancel pending requests.') => {
  pendingControllers.forEach((controller) => controller.abort(reason))
  pendingControllers.clear()
}

const extractErrorMessage = (payload) => {
  if (!payload) return null
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload)) {
    const first = payload.find((item) => typeof item === 'string')
    return first || null
  }
  if (typeof payload === 'object') {
    if (typeof payload.detail === 'string') return payload.detail
    if (typeof payload.message === 'string') return payload.message

    for (const [key, value] of Object.entries(payload)) {
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0]
        if (typeof firstItem === 'string') {
          return key === 'non_field_errors' ? firstItem : `${key}: ${firstItem}`
        }
      }
      const nested = extractErrorMessage(value)
      if (nested) return nested
    }
  }
  return null
}

export const getApiError = (error) =>
  extractErrorMessage(error?.response?.data) ||
  error?.message ||
  'Something went wrong'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

axiosClient.interceptors.request.use(
  (config) => {
    const requestConfig = attachAbortController(config)
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) {
      requestConfig.headers.Authorization = `Bearer ${accessToken}`
    }
    return requestConfig
  },
  (error) => Promise.reject(error),
)

axiosClient.interceptors.response.use(
  (response) => {
    detachAbortController(response?.config)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    detachAbortController(originalRequest)

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
        originalRequest.__requestController = undefined
        originalRequest.signal = undefined
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
