import { useEffect, useMemo, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Menu, X } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { logoutUser } from '../../api/authApi'
import { cancelAllPendingRequests } from '../../api/axiosClient'
import { getApiError } from '../../api/axiosClient'
import useAuthStore from '../../store/authStore'
import Button from '../ui/Button'

const baseLinks = [
  { to: '/', label: 'Home' },
  { to: '/charities', label: 'Charities' },
  { to: '/how-it-works', label: 'How It Works' },
]

const navLinkStyle = ({ isActive }) => ({
  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
  fontWeight: 600,
  fontSize: 14,
  transition: 'var(--transition)',
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
})

const Navbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.logout)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  const navLinks = useMemo(() => {
    const links = [...baseLinks]
    if (isAuthenticated && user?.is_subscriber) {
      links.push({ to: '/dashboard', label: 'Dashboard' })
    }
    return links
  }, [isAuthenticated, user?.is_subscriber])

  const initials = useMemo(() => {
    const first = user?.first_name?.[0] || user?.email?.[0] || 'U'
    const last = user?.last_name?.[0] || ''
    return `${first}${last}`.toUpperCase()
  }, [user?.email, user?.first_name, user?.last_name])

  const onLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    const refreshToken = localStorage.getItem('refresh_token')

    try {
      if (refreshToken) {
        await logoutUser({ refresh: refreshToken })
      }
    } catch (error) {
      // Local logout should always proceed even if API logout fails.
      getApiError(error)
    } finally {
      cancelAllPendingRequests()
      queryClient.clear()
      clearAuth()
      setMobileOpen(false)
      setUserMenuOpen(false)
      setIsLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  const statusDotColor = user?.is_subscriber
    ? 'var(--color-success)'
    : ['lapsed', 'cancelled'].includes(user?.subscription_status)
      ? 'var(--color-warning)'
      : 'var(--color-text-muted)'

  const statusTooltip = user?.is_subscriber
    ? 'Active Member'
    : user?.subscription_status
      ? `Status: ${user.subscription_status}`
      : 'Member'

  const subscribePulseClass = isAuthenticated && !user?.is_subscriber ? 'subscribe-pulse' : ''

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: 72,
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(10,10,10,0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
      }}
    >
      <div
        className="container"
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <NavLink to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⛳</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)' }}>
            Digital <span style={{ color: 'var(--color-accent)' }}>Heroes</span>
          </span>
        </NavLink>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          className="desktop-nav"
        >
          <div style={{ display: 'none' }} />
        </nav>

        <div className="desktop-nav-links" style={{ display: 'none', alignItems: 'center', gap: 4 }}>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} style={navLinkStyle}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="desktop-actions" style={{ display: 'none', alignItems: 'center', gap: 10 }}>
          {!isAuthenticated ? (
            <>
              <NavLink to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </NavLink>
              <NavLink to="/subscribe" className={subscribePulseClass}>
                <Button variant="primary" size="sm">
                  Subscribe
                </Button>
              </NavLink>
            </>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                style={{
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 10px 4px 4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ position: 'relative', display: 'inline-flex' }} title={statusTooltip}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-accent)',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    {initials}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      right: -1,
                      bottom: -1,
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      border: '1px solid var(--color-surface)',
                      background: statusDotColor,
                    }}
                  />
                </span>
                <ChevronDown size={16} />
              </button>

              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 42,
                    width: 190,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-lg)',
                    overflow: 'hidden',
                  }}
                >
                  <NavLink to="/dashboard" style={{ display: 'block', padding: '10px 12px' }}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/subscribe" style={{ display: 'block', padding: '10px 12px' }}>
                    Subscription
                  </NavLink>
                  <NavLink to="/dashboard/settings" style={{ display: 'block', padding: '10px 12px' }}>
                    Settings
                  </NavLink>
                  <button
                    type="button"
                    onClick={onLogout}
                    disabled={isLoggingOut}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-error)',
                    }}
                  >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle menu"
          className="mobile-menu-btn"
          style={{
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-sm)',
            width: 38,
            height: 38,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="container" style={{ paddingTop: 12, paddingBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} style={navLinkStyle}>
                  {link.label}
                </NavLink>
              ))}

              {!isAuthenticated ? (
                <>
                  <NavLink to="/login">
                    <Button variant="ghost" fullWidth>
                      Login
                    </Button>
                  </NavLink>
                  <NavLink to="/subscribe" className={subscribePulseClass}>
                    <Button variant="primary" fullWidth>
                      Subscribe
                    </Button>
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/dashboard">
                    <Button variant="secondary" fullWidth>
                      Dashboard
                    </Button>
                  </NavLink>
                  <NavLink to="/dashboard/settings">
                    <Button variant="ghost" fullWidth>
                      Settings
                    </Button>
                  </NavLink>
                  <Button variant="danger" fullWidth onClick={onLogout} loading={isLoggingOut}>
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @media (min-width: 960px) {
            .desktop-nav-links,
            .desktop-actions {
              display: inline-flex !important;
            }
            .mobile-menu-btn {
              display: none !important;
            }
          }

          @keyframes navPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(200,245,68,0.4); }
            70% { box-shadow: 0 0 0 8px rgba(200,245,68,0); }
          }

          .subscribe-pulse button {
            animation: navPulse 1.8s infinite;
          }
        `}
      </style>
    </header>
  )
}

export default Navbar
