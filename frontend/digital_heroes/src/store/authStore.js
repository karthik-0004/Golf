import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token') || null,
  isAuthenticated: Boolean(localStorage.getItem('access_token')),
  isLoading: false,

  login: (userData, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))

    set({
      user: userData,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
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
    })
  },

  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    set({ user: userData })
  },

  initializeAuth: () => {
    const accessToken = localStorage.getItem('access_token')
    const savedUser = localStorage.getItem('user')

    set({
      accessToken: accessToken || null,
      isAuthenticated: Boolean(accessToken),
      user: savedUser ? JSON.parse(savedUser) : null,
      isLoading: false,
    })
  },
}))

export default useAuthStore
