import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

function JoinHousehold({ session }) {
  const navigate = useNavigate()
  const { token } = useParams()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {

    // If not logged in, save token and redirect to login
    if (!session) {
      localStorage.setItem('pendingInviteToken', token)
      navigate('/login')
      return
    }   
     
    const fetchInvite = async () => {
      const { data, error } = await supabase
        .from('household_invites')
        .select('id, household_id, status, expires_at, households(id, name, currency)')
        .eq('invite_token', token)
        .single()

      if (error || !data) {
        setError('This invite link is invalid.')
        setLoading(false)
        return
      }

      if (data.status !== 'pending') {
        setError('This invite has already been used.')
        setLoading(false)
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invite link has expired.')
        setLoading(false)
        return
      }

      setInvite(data)
      setLoading(false)
    }

    fetchInvite()
  }, [token])

  const handleJoin = async () => {
    setJoining(true)
    setError(null)

    // Check if already a member
    const { data: existing } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', invite.household_id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existing) {
      setError('You are already a member of this household.')
      setJoining(false)
      return
    }

    // Add as member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: invite.household_id,
        user_id: session.user.id,
        role: 'member'
      })

    if (memberError) {
      setError(memberError.message)
      setJoining(false)
      return
    }

    // Mark invite as accepted
    await supabase
      .from('household_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    // Force reload so App.jsx re-fetches household
    window.location.href = '/dashboard'
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid invite</h1>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-blue-600 hover:underline"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800">You're invited!</h1>
          <p className="text-sm text-gray-400 mt-1">
            Join <span className="font-semibold text-gray-600">{invite.households.name}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 mb-6">
            You're about to join <span className="font-semibold text-gray-800">{invite.households.name}</span>. 
            You'll be able to see and add transactions for this household.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {joining ? 'Joining...' : 'Accept invite'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JoinHousehold