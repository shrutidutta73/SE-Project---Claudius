import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import AppLayout from './layouts/AppLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import POSPage from './pages/POSPage'
import InventoryPage from './pages/InventoryPage'
import StaffPage from './pages/StaffPage'
import ProcurementPage from './pages/ProcurementPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import { useAuthStore } from './store/roleStore'
import { api, clearToken } from './lib/api'
import type { User } from './types'

// Gate that rehydrates the auth store from localStorage BEFORE children render.
// Without this, a refresh briefly renders with currentUser === null, which makes
// AppLayout's redirect-to-login effect fire before the session is restored.
function SessionGate({ children }: { children: ReactNode }) {
  const login  = useAuthStore(s => s.login)
  const logout = useAuthStore(s => s.logout)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    const token  = localStorage.getItem('sb_token')
    const cached = localStorage.getItem('sb_user')

    if (token && cached) {
      try { login(JSON.parse(cached) as User) } catch { /* corrupt cache — ignore */ }
      // Verify the token in the background. If the server rejects it we sign
      // out, but until we know, we optimistically render the app signed in.
      api.get<User[]>('/users').catch(() => {
        clearToken()
        localStorage.removeItem('sb_user')
        logout()
      })
    }

    setRestored(true)
  }, [login, logout])

  if (!restored) return null
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionGate>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/register"  element={<RegisterPage />} />
          <Route path="/pos"          element={<AppLayout><POSPage /></AppLayout>} />
          <Route path="/inventory"    element={<AppLayout><InventoryPage /></AppLayout>} />
          <Route path="/staff"        element={<AppLayout><StaffPage /></AppLayout>} />
          <Route path="/procurement"  element={<AppLayout><ProcurementPage /></AppLayout>} />
          <Route path="/dashboard"    element={<AppLayout><DashboardPage /></AppLayout>} />
          <Route path="/settings"     element={<AppLayout><SettingsPage /></AppLayout>} />
        </Routes>
      </SessionGate>
    </BrowserRouter>
  )
}
