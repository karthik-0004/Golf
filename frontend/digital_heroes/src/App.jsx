import { useEffect } from 'react'

import { motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/layout/Layout'
import ProtectedRoute from './components/protected/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AdminCharitiesPage from './pages/admin/AdminCharitiesPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminDrawsPage from './pages/admin/AdminDrawsPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminWinnersPage from './pages/admin/AdminWinnersPage'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardPage from './pages/dashboard/DashboardPage'
import MyDrawsPage from './pages/dashboard/MyDrawsPage'
import MyWinningsPage from './pages/dashboard/MyWinningsPage'
import ScoresPage from './pages/dashboard/ScoresPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import CharitiesPage from './pages/public/CharitiesPage'
import CharityDetailPage from './pages/public/CharityDetailPage'
import HomePage from './pages/public/HomePage'
import HowItWorksPage from './pages/public/HowItWorksPage'
import SubscribePage from './pages/public/SubscribePage'
import useAuthStore from './store/authStore'

const queryClient = new QueryClient()

const withLayout = (component) => <Layout>{component}</Layout>
const withTransition = (component) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {component}
  </motion.div>
)

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
