import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Toast from './Toast'
import { useToast } from '../hooks/useToast'
import { ToastContext } from '../context/ToastContext'

// ─── SVG Icons ───────────────────────────────────────────────
const Icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  transactions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  analytics: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4"/></svg>,
  categories: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  recurring: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  budgets: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>,
  signout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  logo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7"/></svg>,
  chevronUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 15l7-7 7 7"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4"/></svg>,
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { path: '/transactions', label: 'Transactions', icon: Icons.transactions },
  { path: '/analytics', label: 'Analytics', icon: Icons.analytics },
  { path: '/add', label: 'Add Transaction', icon: Icons.add },
  { path: '/categories', label: 'Categories', icon: Icons.categories },
  { path: '/recurring', label: 'Recurring', icon: Icons.recurring },
  { path: '/budgets', label: 'Budgets', icon: Icons.budgets },
]

const bottomNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { path: '/add', label: 'Add', icon: Icons.add },
  { path: '/settings', label: 'Settings', icon: Icons.settings },
]

function Layout({ children, household, setHousehold, households, switchHousehold }) {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [householdMenuOpen, setHouseholdMenuOpen] = useState(false)
  const { toasts, toast } = useToast()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Household switcher */}
      <div className="px-3 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <button
            onClick={() => setHouseholdMenuOpen(!householdMenuOpen)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg transition hover:opacity-80"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
              <span className="w-4 h-4 text-white">{Icons.logo}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-sm leading-tight truncate" style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--primary)' }}>
                Budget App
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{household?.name}</p>
            </div>
            <span className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>
              {householdMenuOpen ? Icons.chevronUp : Icons.chevronDown}
            </span>
          </button>

          {householdMenuOpen && (
            <div className="absolute top-full left-0 right-0 rounded-lg shadow-lg z-50 mt-1 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {households?.map(h => (
                <button
                  key={h.id}
                  onClick={() => { switchHousehold(h); setHouseholdMenuOpen(false); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition"
                  style={{
                    background: h.id === household?.id ? 'var(--primary-light)' : 'transparent',
                    color: h.id === household?.id ? 'var(--primary)' : 'var(--text)',
                    fontWeight: h.id === household?.id ? '500' : '400'
                  }}
                >
                  <span className="w-4 h-4" style={{ color: 'var(--text-muted)' }}>{Icons.home}</span>
                  <span className="truncate">{h.name}</span>
                  {h.id === household?.id && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => { setHouseholdMenuOpen(false); setSidebarOpen(false); navigate('/setup') }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition"
                  style={{ color: 'var(--primary)' }}
                >
                  <span className="w-4 h-4">{Icons.plus}</span>
                  <span>Create new household</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'active-nav' : 'inactive-nav'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? 'var(--primary-light)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            })}
          >
            <span className="w-[17px] h-[17px] flex-shrink-0">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — settings + signout */}
      <div className="px-3 py-4 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        <NavLink
          to="/settings"
          onClick={() => setSidebarOpen(false)}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderRadius: '8px',
            fontSize: '14px', fontWeight: '500', transition: 'all 0.15s',
            background: isActive ? 'var(--primary-light)' : 'transparent',
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            textDecoration: 'none'
          })}
        >
          <span className="w-[17px] h-[17px] flex-shrink-0">{Icons.settings}</span>
          Settings
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="w-[17px] h-[17px] flex-shrink-0">{Icons.signout}</span>
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 fixed h-full z-10" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 z-30 transform transition-transform md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56">

        {/* Mobile topbar */}
        <div className="md:hidden px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="w-5 h-5" style={{ color: 'var(--text-muted)' }}>
            {Icons.menu}
          </button>

          <div className="relative">
            <button onClick={() => setHouseholdMenuOpen(!householdMenuOpen)} className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--primary)' }}>
                {household?.name}
              </span>
              <span className="w-4 h-4" style={{ color: 'var(--text-subtle)' }}>
                {householdMenuOpen ? Icons.chevronUp : Icons.chevronDown}
              </span>
            </button>

            {householdMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 rounded-lg shadow-lg z-50 mt-2 w-48 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {households?.map(h => (
                  <button
                    key={h.id}
                    onClick={() => { switchHousehold(h); setHouseholdMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition"
                    style={{
                      background: h.id === household?.id ? 'var(--primary-light)' : 'transparent',
                      color: h.id === household?.id ? 'var(--primary)' : 'var(--text)',
                    }}
                  >
                    <span className="w-4 h-4">{Icons.home}</span>
                    <span className="truncate">{h.name}</span>
                    {h.id === household?.id && <span className="ml-auto text-xs">✓</span>}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => { setHouseholdMenuOpen(false); navigate('/setup') }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition"
                    style={{ color: 'var(--primary)' }}
                  >
                    <span className="w-4 h-4">{Icons.plus}</span>
                    <span>New household</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-5" />
        </div>

        {/* Page content */}
        <ToastContext.Provider value={toast}>
          <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
            {children}
          </main>
        </ToastContext.Provider>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="flex">
          {bottomNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition"
              style={({ isActive }) => ({
                color: isActive ? 'var(--primary)' : 'var(--text-subtle)'
              })}
            >
              <span className="w-5 h-5">{item.icon}</span>
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