import { useMemo, useState } from 'react'

import { motion } from 'framer-motion'
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Star,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { logoutUser } from '../../api/authApi'
import { getApiError } from '../../api/axiosClient'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import './DashboardLayout.css'

const sidebarLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/scores', label: 'My Scores', icon: Target },
  { to: '/dashboard/draws', label: 'My Draws', icon: Trophy },
  { to: '/dashboard/winnings', label: 'My Winnings', icon: Star },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  { to: '/charities', label: 'Charities', icon: Heart },
]

const getInitials = (user) => {
  const first = user?.first_name?.trim()?.[0] || ''
  const last = user?.last_name?.trim()?.[0] || ''
  const fallback = user?.username?.trim()?.[0] || user?.email?.trim()?.[0] || 'U'
  return `${first}${last}`.toUpperCase() || fallback.toUpperCase()
}

const SidebarInner = ({ user, onLogout, onNavigate }) => {
  const initials = getInitials(user)
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User'

  return (
    <>
      <div>
        <Link to="/" className="dashboard-logo" onClick={onNavigate}>
          <span className="dashboard-logo-mark">⛳</span>
          <span>DH Golf</span>
        </Link>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `dashboard-nav-link ${isActive ? 'dashboard-nav-link--active' : ''}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="dashboard-sidebar-footer">
        <div className="dashboard-user-row">
          <div className="dashboard-avatar">{initials}</div>
          <div className="dashboard-user-text">
            <p title={fullName}>{fullName}</p>
            <small title={user?.email}>{user?.email || 'No email'}</small>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} icon={<LogOut size={15} />} fullWidth>
          Logout
        </Button>
      </div>
    </>
  )
}

const DashboardLayout = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const localLogout = useAuthStore((state) => state.logout)
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = useMemo(() => getInitials(user), [user])

  const handleLogout = async () => {
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
      localLogout()
      toast.success('Logged out successfully.')
      navigate('/')
      setMobileOpen(false)
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar desktop-only">
        <SidebarInner user={user} onLogout={handleLogout} />
      </aside>

      <header className="dashboard-mobile-topbar mobile-only">
        <Link to="/" className="dashboard-logo">
          <span className="dashboard-logo-mark">⛳</span>
          <span>DH Golf</span>
        </Link>

        <div className="dashboard-mobile-controls">
          <div className="dashboard-avatar dashboard-avatar--sm">{initials}</div>
          <button
            type="button"
            className="dashboard-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open dashboard menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <motion.div
          className="dashboard-drawer-backdrop mobile-only"
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
            className="dashboard-sidebar dashboard-sidebar--mobile"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="dashboard-mobile-close-row">
              <button
                type="button"
                className="dashboard-menu-btn"
                onClick={() => setMobileOpen(false)}
                aria-label="Close dashboard menu"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarInner
              user={user}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
            />
          </motion.aside>
        </motion.div>
      ) : null}

      <main className="dashboard-main">
        <div className="dashboard-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout