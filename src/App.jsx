import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import HouseholdSetup from './pages/HouseholdSetup'
import AddTransaction from './pages/AddTransaction'

function App() {
  const [session, setSession] = useState(undefined)
  const [household, setHousehold] = useState(undefined)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session ?? null)

      if (session?.user?.id) {
        const { data } = await supabase
          .from('household_members')
          .select('household_id, households(id, name, currency)')
          .eq('user_id', session.user.id)
          .maybeSingle()

        setHousehold(data?.households ?? null)
      } else {
        setHousehold(null)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setHousehold(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined || household === undefined) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/setup"
        element={
          !session ? <Navigate to="/login" /> :
          household ? <Navigate to="/dashboard" /> :
          <HouseholdSetup session={session} setHousehold={setHousehold} />
        }
      />
      <Route
        path="/dashboard"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Dashboard />
        }
      />
      <Route
        path="/add"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <AddTransaction session={session} household={household} />
        }
      />
    <Route path="*" element={
      !session ? <Navigate to="/login" /> :
      !household ? <Navigate to="/setup" /> :
      <Navigate to="/dashboard" />
    } />    
    </Routes>
  )
}

export default App