import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useHousehold } from './hooks/useHousehold'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import HouseholdSetup from './pages/HouseholdSetup'

function App() {
  const [session, setSession] = useState(undefined)
  const { household, loading: householdLoading } = useHousehold(session)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Still loading session or household
  if (session === undefined || (session && householdLoading)) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/setup"
        element={session ? <HouseholdSetup session={session} /> : <Navigate to="/login" />}
      />
      <Route
        path="/dashboard"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Dashboard />
        }
      />
      <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} />} />
    </Routes>
  )
}

export default App