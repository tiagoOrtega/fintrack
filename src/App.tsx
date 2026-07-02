import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth, { AuthedStoreProvider } from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Investments from './pages/Investments'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Banks from './pages/Banks'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AuthedStoreProvider>
                  <Layout />
                </AuthedStoreProvider>
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="investments" element={<Investments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            {/* /banks/callback is handled inside Banks.tsx via useSearchParams */}
            <Route path="banks" element={<Banks />} />
            <Route path="banks/callback" element={<Banks />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
