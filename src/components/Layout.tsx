import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  BarChart2,
  Settings,
  Wallet,
  Landmark,
} from 'lucide-react'
import { useStoreCtx } from '../context/StoreContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/investments', label: 'Investments', icon: TrendingUp },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/banks', label: 'Banks', icon: Landmark },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const { connectedBanks } = useStoreCtx()
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <Wallet className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg tracking-tight text-gray-900">FinTrack</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {to === '/banks' && connectedBanks.length > 0 && (
                <span className="text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-medium">
                  {connectedBanks.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-100 text-xs text-gray-400">
          FinTrack v1.0 · Data local
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
