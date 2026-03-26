import { Navigate } from 'react-router-dom'

import useAuthStore from '../../store/authStore'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !user?.is_staff) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
