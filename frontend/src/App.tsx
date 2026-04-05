import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

// Restore session from localStorage token on app load
function SessionRestorer() {
  const login  = useAuthStore(s => s.login)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('sb_token')
    if (!token) { setReady(true); return }

    api.get<User[]>('/users')
      .then(() => {
        // Token is valid — restore user from localStorage cache
        const cached = localStorage.getItem('sb_user')
        if (cached) {
          try { login(JSON.parse(cached) as User) } catch { /* ignore */ }
        }
      })
      .catch(() => {
        // Token expired or invalid — clear it
        clearToken()
        localStorage.removeItem('sb_user')
      })
      .finally(() => setReady(true))
  }, [login])

  if (!ready) return null
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionRestorer />
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
    </BrowserRouter>
  )
}
