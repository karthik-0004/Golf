import { lazy, Suspense, useEffect } from 'react'

import { motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/layout/Layout'
import ProtectedRoute from './components/protected/ProtectedRoute'
import useAuthStore from './store/authStore'
import useAuth from './hooks/useAuth'
import Spinner from './components/ui/Spinner'

// Lazy load all page components for faster initial load
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const AdminCharitiesPage = lazy(() => import('./pages/admin/AdminCharitiesPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminDrawsPage = lazy(() => import('./pages/admin/AdminDrawsPage'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminWinnersPage = lazy(() => import('./pages/admin/AdminWinnersPage'))
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const MyDrawsPage = lazy(() => import('./pages/dashboard/MyDrawsPage'))
const MyWinningsPage = lazy(() => import('./pages/dashboard/MyWinningsPage'))
const ScoresPage = lazy(() => import('./pages/dashboard/ScoresPage'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const CharitiesPage = lazy(() => import('./pages/public/CharitiesPage'))
const CharityDetailPage = lazy(() => import('./pages/public/CharityDetailPage'))
const HomePage = lazy(() => import('./pages/public/HomePage'))
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage'))
const SubscribePage = lazy(() => import('./pages/public/SubscribePage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

[
  ['admin-analytics'],
  ['admin-draws'],
  ['admin-draws-list'],
  ['admin-winners'],
  ['admin-users'],
  ['admin-user-detail'],
  ['admin-user-scores'],
  ['admin-charities'],
].forEach((queryKey) => {
  queryClient.setQueryDefaults(queryKey, {
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
})

// Minimal full-page loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-primary)',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <Spinner size="lg" />
      <p
        style={{
          marginTop: 16,
          color: 'var(--color-text-secondary)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Loading...
      </p>
    </div>
  </div>
)

const withLayout = (component) => <Layout>{component}</Layout>
const withTransition = (component) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    {component}
  </motion.div>
)

function App() {
  useAuth()

  useEffect(() => {
    useAuthStore.getState().initializeAuth()
    // Remove the initial loading screen from index.html once the app has mounted
    const loader = document.getElementById('initial-loader')
    if (loader) {
      loader.style.opacity = '0'
      loader.style.transition = 'opacity 0.3s ease'
      setTimeout(() => loader.remove(), 300)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={withTransition(withLayout(<HomePage />))} />
            <Route path="/charities" element={withTransition(withLayout(<CharitiesPage />))} />
            <Route path="/charities/:slug" element={withTransition(withLayout(<CharityDetailPage />))} />
            <Route path="/how-it-works" element={withTransition(withLayout(<HowItWorksPage />))} />
            <Route path="/subscribe" element={withTransition(withLayout(<SubscribePage />))} />
            <Route path="/login" element={withTransition(<LoginPage />)} />
            <Route path="/register" element={withTransition(<RegisterPage />)} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={withTransition(<DashboardPage />)} />
              <Route path="scores" element={withTransition(<ScoresPage />)} />
              <Route path="draws" element={withTransition(<MyDrawsPage />)} />
              <Route path="winnings" element={withTransition(<MyWinningsPage />)} />
              <Route path="settings" element={withTransition(<SettingsPage />)} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={withTransition(<AdminDashboardPage />)} />
              <Route path="users" element={withTransition(<AdminUsersPage />)} />
              <Route path="draws" element={withTransition(<AdminDrawsPage />)} />
              <Route path="winners" element={withTransition(<AdminWinnersPage />)} />
              <Route path="charities" element={withTransition(<AdminCharitiesPage />)} />
            </Route>

            <Route path="*" element={withTransition(withLayout(<NotFoundPage />))} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
