import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Settings({ session, household, setHousehold }) {
  const [members, setMembers] = useState([])
  const [inviteLink, setInviteLink] = useState(null)
  const [householdName, setHouseholdName] = useState(household?.name || '')
  const [fullName, setFullName] = useState('')
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch members
      const { data: memberData } = await supabase
        .from('household_members')
        .select('id, role, joined_at, profiles(full_name)')
        .eq('household_id', household.id)

      if (memberData) setMembers(memberData)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()

      if (profileData) setFullName(profileData.full_name || '')
    }

    fetchData()
  }, [household.id, session.user.id])

  const handleSaveHousehold = async (e) => {
    e.preventDefault()
    setSavingHousehold(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('households')
      .update({ name: householdName })
      .eq('id', household.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setHousehold({ ...household, name: householdName })
    }

    setSavingHousehold(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', session.user.id)

    if (updateError) setError(updateError.message)
    setSavingProfile(false)
  }

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true)
    setError(null)

    // Check for existing pending invite
    const { data: existing } = await supabase
      .from('household_invites')
      .select('invite_token, expires_at')
      .eq('household_id', household.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      setInviteLink(`${window.location.origin}/join/${existing.invite_token}`)
      setGeneratingInvite(false)
      return
    }

    // Create new invite
    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .insert({
        household_id: household.id,
        invited_by: session.user.id
      })
      .select()
      .single()

    if (inviteError) {
      setError(inviteError.message)
    } else {
      setInviteLink(`${window.location.origin}/join/${invite.invite_token}`)
    }

    setGeneratingInvite(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Your Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="text"
              value={session.user.email}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Household */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Household</h2>
        <form onSubmit={handleSaveHousehold} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Household name</label>
            <input
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingHousehold}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            {savingHousehold ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Members</h2>
        <ul className="divide-y divide-gray-50 mb-4">
          {members.map(m => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {m.profiles?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-gray-400">
                  {m.role} · joined {new Date(m.joined_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                m.role === 'owner'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {m.role}
              </span>
            </li>
          ))}
        </ul>

        {/* Invite */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Invite someone</p>
          <p className="text-xs text-gray-400 mb-3">
            Generate a link and share it — anyone with the link can join your household.
          </p>

          {!inviteLink ? (
            <button
              onClick={handleGenerateInvite}
              disabled={generatingInvite}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              {generatingInvite ? 'Generating...' : 'Generate invite link'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-600"
                />
                <button
                  onClick={handleCopy}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-gray-400">Link expires in 7 days.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default Settings