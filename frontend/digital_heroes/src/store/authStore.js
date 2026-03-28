import { create } from 'zustand'

const STORAGE_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  user: 'user',
}

const normalizeUser = (userData) => {
  if (!userData) return null
  return {
    ...userData,
    is_staff: Boolean(userData.is_staff),
  }
}

const getInitialAuthState = () => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: true,
})

const useAuthStore = create((set) => ({
  ...getInitialAuthState(),
  isInitialized: false,

  login: (userData, accessToken, refreshToken) => {
    const normalizedUser = normalizeUser(userData)

    localStorage.setItem(STORAGE_KEYS.access, accessToken)
    localStorage.setItem(STORAGE_KEYS.refresh, refreshToken)
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser))

    set({
      user: normalizedUser,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.access)
    localStorage.removeItem(STORAGE_KEYS.refresh)
    localStorage.removeItem(STORAGE_KEYS.user)
    set(getInitialAuthState())
  },

  setUser: (userData) => {
    const normalizedUser = normalizeUser(userData)
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser))
    set({ user: normalizedUser })
  },

  initializeAuth: () => {
    const snapshot = {
      accessToken: localStorage.getItem(STORAGE_KEYS.access),
      savedUser: localStorage.getItem(STORAGE_KEYS.user),
    }

    let parsedUser = null

    if (snapshot.savedUser) {
      try {
        parsedUser = normalizeUser(JSON.parse(snapshot.savedUser))
      } catch {
        localStorage.removeItem(STORAGE_KEYS.user)
      }
    }

    set({
      accessToken: snapshot.accessToken || null,
      isAuthenticated: Boolean(snapshot.accessToken),
      user: parsedUser,
      isLoading: false,
      isInitialized: true,
    })
  },
}))

export default useAuthStore
