import { useEffect, useMemo } from 'react'

import { getProfile } from '../api/userApi'
import useAuthStore from '../store/authStore'
import { getApiError } from '../api/axiosClient'

const useAuth = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    let cancelled = false

    const verifyAuth = async () => {
      if (!isAuthenticated) return
      try {
        const response = await getProfile()
        if (!cancelled) {
          setUser(response.data)
        }
      } catch (error) {
        if (error?.response?.status === 401 && !cancelled) {
          logout()
        } else {
          getApiError(error)
        }
      }
    }

    verifyAuth()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, logout, setUser])

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
    }),
    [
      isAuthenticated,
      isLoading,
      login,
      logout,
      user,
    ],
  )
}

export default useAuth
