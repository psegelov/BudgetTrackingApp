import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import HouseholdSetup from './pages/HouseholdSetup'
import AddTransaction from './pages/AddTransaction'
import EditTransaction from './pages/EditTransaction'
import Layout from './components/Layout'
import ProfileSetup from './pages/ProfileSetup'
import Settings from './pages/Settings'
import JoinHousehold from './pages/JoinHousehold'
import Categories from './pages/Categories'
import Recurring from './pages/Recurring'
import Budgets from './pages/Budgets'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'

function App() {
  const [session, setSession] = useState(undefined)
  const [household, setHousehold] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

useEffect(() => {
  const initDone = { current: false }

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session ?? null)

    if (session?.user?.id) {
      const { data: memberData } = await supabase
        .from('household_members')
        .select('household_id, households(id, name, currency)')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setHousehold(memberData?.households ?? null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData ?? null)
    } else {
      setHousehold(null)
      setProfile(null)
    }
  }

  init()

const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('Auth event:', event)

    // ✅ ALWAYS update session first
    setSession(session ?? null)

    if (event === 'SIGNED_OUT') {
      setHousehold(null)
      setProfile(null)
      return
    }

    if (event === 'SIGNED_IN' && session?.user?.id) {
      // ✅ Fetch user data after login
      const { data: memberData } = await supabase
        .from('household_members')
        .select('household_id, households(id, name, currency)')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setHousehold(memberData?.households ?? null)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData ?? null)

      // ✅ Handle invite redirect AFTER state is ready
      const pendingToken = localStorage.getItem('pendingInviteToken')
      if (pendingToken) {
        localStorage.removeItem('pendingInviteToken')
        window.location.href = `/join/${pendingToken}`
      }
    }
  }
)

  return () => subscription.unsubscribe()
}, [])

if (session === undefined || household === undefined || profile === undefined) return null

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
          !profile?.full_name ? <Navigate to="/profile-setup" /> :
          household ? <Navigate to="/dashboard" /> :
          <HouseholdSetup session={session} setHousehold={setHousehold} />
        }
      />
      <Route
        path="/profile-setup"
        element={
          !session ? <Navigate to="/login" /> :
          <ProfileSetup session={session} setProfile={setProfile} />
        }
      />
      <Route
        path="/dashboard"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household}>
            <Dashboard household={household} session={session} />
          </Layout>
        }
      />
      <Route
        path="/add"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household}>
            <AddTransaction session={session} household={household} />
          </Layout>
        }
      />
      <Route
        path="/edit/:id"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household}>
            <EditTransaction session={session} household={household} />
          </Layout>
        }
      />
      <Route
        path="/settings"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold}>
            <Settings 
              session={session} 
              household={household} 
              setHousehold={setHousehold}
              profile={profile}
              setProfile={setProfile}
            />
          </Layout>
        }
      />
      <Route
        path="/categories"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold}>
            <Categories household={household} />
          </Layout>
        }
      />
      <Route
        path="/recurring"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold}>
            <Recurring session={session} household={household} />
          </Layout>
        }
      />
      <Route
        path="/budgets"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold}>
            <Budgets household={household} />
          </Layout>
        }
      />
      <Route
        path="/transactions"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold}>
            <Transactions household={household} />
          </Layout>
        }
      />
      <Route
        path="/analytics"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold}>
            <Analytics household={household} />
          </Layout>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/join/:token"
        element={<JoinHousehold session={session} />}
      />
      <Route path="*" element={
        !session ? <Navigate to="/login" /> :
        !profile?.full_name ? <Navigate to="/profile-setup" /> :
        !household ? <Navigate to="/setup" /> :
        <Navigate to="/dashboard" />
      } />   
    </Routes>
  )
}

export default App