import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Toast from './Toast'
import { useToast } from '../hooks/useToast'
import { ToastContext } from '../context/ToastContext'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/transactions', label: 'Transactions', icon: '📋' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/add', label: 'Add Transaction', icon: '➕' },
  { path: '/categories', label: 'Categories', icon: '🏷️' },
  { path: '/recurring', label: 'Recurring', icon: '🔄' },
  { path: '/budgets', label: 'Budgets', icon: '🎯' },
]

const bottomNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/add', label: 'Add', icon: '➕' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

function Layout({ children, household, setHousehold }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { toasts, toast } = useToast()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight">Budget App</p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{household?.name}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — settings + signout */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <NavLink
          to="/settings"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`
          }
        >
          <span className="text-lg">⚙️</span>
          Settings
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition"
        >
          <span className="text-lg">🚪</span>
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 fixed h-full z-10">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-100 z-30 transform transition-transform md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56">

        {/* Mobile topbar */}
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-800 transition text-xl"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-semibold text-gray-800 text-sm">{household?.name}</span>
          </div>
          <div className="w-6" />
        </div>

        {/* Page content — add bottom padding on mobile for tab bar */}
        <ToastContext.Provider value={toast}>
          <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
            {children}
          </main>
        </ToastContext.Provider>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-10">
        <div className="flex">
          {bottomNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

        <Toast toasts={toasts} />
    </div>
  )
}

export default Layout