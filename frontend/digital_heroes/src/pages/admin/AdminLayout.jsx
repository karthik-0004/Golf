import { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Star,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { logoutUser } from '../../api/authApi'
import { cancelAllPendingRequests } from '../../api/axiosClient'
import { getApiError } from '../../api/axiosClient'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import useAuthStore from '../../store/authStore'
import './AdminLayout.css'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/draws', label: 'Draws', icon: Trophy },
  { to: '/admin/winners', label: 'Winners', icon: Star },
  { to: '/admin/charities', label: 'Charities', icon: Heart },
]

const routeTitleMap = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/draws': 'Draws',
  '/admin/winners': 'Winners',
  '/admin/charities': 'Charities',
}

const getInitials = (user) => {
  const first = user?.first_name?.trim()?.[0] || ''
  const last = user?.last_name?.trim()?.[0] || ''
  const fallback = user?.username?.trim()?.[0] || user?.email?.trim()?.[0] || 'A'
  return `${first}${last}`.toUpperCase() || fallback.toUpperCase()
}

const SidebarContent = ({ user, onLogout, onNavigate, isLoggingOut }) => {
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Admin User'

  return (
    <>
      <div>
        <div>
          <Link to="/admin/dashboard" className="admin-logo" onClick={onNavigate}>
            <span className="admin-logo-mark">⛳</span>
            <span>DH Admin</span>
          </Link>
          <span className="admin-badge">Admin Panel</span>
        </div>

        <nav className="admin-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="admin-sidebar-bottom">
        <div className="admin-divider" />

        <div className="admin-user-box">
          <p title={fullName}>{fullName}</p>
          <small title={user?.email}>{user?.email || 'No email'}</small>
        </div>

        <Button
          size="sm"
          variant="ghost"
          icon={<LogOut size={14} />}
          onClick={onLogout}
          loading={isLoggingOut}
          fullWidth
        >
          Logout
        </Button>
      </div>
    </>
  )
}

const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const localLogout = useAuthStore((state) => state.logout)

  const initials = useMemo(() => getInitials(user), [user])
  const title = routeTitleMap[location.pathname] || 'Admin'

  useEffect(() => {
    if (isInitialized && (!user || !user.is_staff)) {
      navigate('/dashboard', { replace: true })
    }
  }, [isInitialized, navigate, user])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    const refresh = localStorage.getItem('refresh_token')

    try {
      if (refresh) {
        await logoutUser({ refresh })
      }
    } catch (error) {
      const detail = getApiError(error)
      if (detail) {
        toast(detail, { icon: 'ℹ️' })
      }
    } finally {
      cancelAllPendingRequests()
      queryClient.clear()
      localLogout()
      toast.success('Logged out successfully.')
      setMobileOpen(false)
      setIsLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  if (!isInitialized) {
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

  if (!user?.is_staff) {
    return null
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar admin-desktop-only">
        <SidebarContent user={user} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </aside>

      {mobileOpen ? (
        <motion.div
          className="admin-mobile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setMobileOpen(false)
            }
          }}
        >
          <motion.aside
            className="admin-sidebar admin-sidebar-mobile"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="admin-mobile-toggle"
                aria-label="Close menu"
              >
                <X size={17} />
              </button>
            </div>
            <SidebarContent
              user={user}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
              isLoggingOut={isLoggingOut}
            />
          </motion.aside>
        </motion.div>
      ) : null}

      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="admin-mobile-toggle admin-mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={17} />
            </button>
            <h2 className="admin-topbar-title">{title}</h2>
          </div>

          <div className="admin-topbar-right">
            <Badge variant="info">Admin</Badge>
            <div className="admin-initials">{initials}</div>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
