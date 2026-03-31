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
  const [households, setHouseholds] = useState(undefined)
  const [household, setHousehold] = useState(undefined)
  const [profile, setProfile] = useState(undefined)

  const fetchUserData = async (userId) => {
    const { data: memberData } = await supabase
      .from('household_members')
      .select('household_id, households(id, name, currency)')
      .eq('user_id', userId)

    const allHouseholds = memberData?.map(m => m.households).filter(Boolean) ?? []
    setHouseholds(allHouseholds)

    const savedId = localStorage.getItem('activeHouseholdId')
    const saved = allHouseholds.find(h => h.id === savedId)
    const active = saved || allHouseholds[0] || null
    setHousehold(active)
    if (active) localStorage.setItem('activeHouseholdId', active.id)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
    setProfile(profileData ?? null)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session ?? null)
      if (session?.user?.id) {
        await fetchUserData(session.user.id)
      } else {
        setHouseholds([])
        setHousehold(null)
        setProfile(null)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setHousehold(null)
        setHouseholds([])
        setProfile(null)
        localStorage.removeItem('activeHouseholdId')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const switchHousehold = (h) => {
    setHousehold(h)
    localStorage.setItem('activeHouseholdId', h.id)
  }

  if (session === undefined || household === undefined || profile === undefined || households === undefined) return null

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
      <Route
        path="/setup"
        element={
          !session ? <Navigate to="/login" /> :
          !profile?.full_name ? <Navigate to="/profile-setup" /> :
          <HouseholdSetup session={session} setHousehold={setHousehold} households={households} setHouseholds={setHouseholds} />
        }
      />
      <Route
        path="/profile-setup"
        element={!session ? <Navigate to="/login" /> : <ProfileSetup session={session} setProfile={setProfile} />}
      />
      <Route
        path="/dashboard"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Dashboard household={household} session={session} />
          </Layout>
        }
      />
      <Route
        path="/add"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <AddTransaction session={session} household={household} />
          </Layout>
        }
      />
      <Route
        path="/edit/:id"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <EditTransaction session={session} household={household} />
          </Layout>
        }
      />
      <Route
        path="/settings"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Settings session={session} household={household} setHousehold={setHousehold} profile={profile} setProfile={setProfile} />
          </Layout>
        }
      />
      <Route
        path="/categories"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Categories household={household} />
          </Layout>
        }
      />
      <Route
        path="/recurring"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Recurring session={session} household={household} />
          </Layout>
        }
      />
      <Route
        path="/budgets"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Budgets household={household} />
          </Layout>
        }
      />
      <Route
        path="/transactions"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Transactions household={household} />
          </Layout>
        }
      />
      <Route
        path="/analytics"
        element={
          !session ? <Navigate to="/login" /> :
          !household ? <Navigate to="/setup" /> :
          <Layout household={household} setHousehold={setHousehold} households={households} switchHousehold={switchHousehold}>
            <Analytics household={household} />
          </Layout>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/join/:token" element={<JoinHousehold session={session} />} />
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