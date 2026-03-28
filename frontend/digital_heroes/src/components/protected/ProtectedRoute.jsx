import { useEffect, useState } from 'react'

import { Navigate } from 'react-router-dom'

import useAuthStore from '../../store/authStore'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const [initTimedOut, setInitTimedOut] = useState(false)

  useEffect(() => {
    if (isInitialized) {
      setInitTimedOut(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setInitTimedOut(true)
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [isInitialized])

  if (!isInitialized) {
    if (initTimedOut) {
      return <Navigate to="/login" replace />
    }

    return (
      <div
        style={{
          background: '#0A0A0A',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#C8F544',
          fontSize: '18px',
        }}
      >
        Loading...
      </div>
    )
  }

  if (adminOnly) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (!user?.is_staff) {
      return <Navigate to="/dashboard" replace />
    }

    return children
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.is_staff) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
