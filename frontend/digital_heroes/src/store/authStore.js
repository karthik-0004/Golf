import { create } from 'zustand'

const normalizeUser = (userData) => {
  if (!userData) return null
  return {
    ...userData,
    is_staff: Boolean(userData.is_staff),
  }
}

const useAuthStore = create((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token') || null,
  isAuthenticated: Boolean(localStorage.getItem('access_token')),
  isLoading: false,
  isInitialized: false,

  login: (userData, accessToken, refreshToken) => {
    const normalizedUser = normalizeUser(userData)

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(normalizedUser))

    set({
      user: normalizedUser,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    })
  },

  setUser: (userData) => {
    const normalizedUser = normalizeUser(userData)
    localStorage.setItem('user', JSON.stringify(normalizedUser))
    set({ user: normalizedUser })
  },

  initializeAuth: () => {
    const accessToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')
    let parsedUser = null

    if (savedUser) {
      try {
        parsedUser = normalizeUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }

    set({
      accessToken: accessToken || null,
      isAuthenticated: Boolean(accessToken),
      user: parsedUser,
      isLoading: false,
      isInitialized: true,
    })
  },
}))

export default useAuthStore
