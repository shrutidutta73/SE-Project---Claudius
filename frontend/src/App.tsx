import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
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
