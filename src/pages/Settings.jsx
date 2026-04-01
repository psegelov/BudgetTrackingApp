import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToastContext } from '../context/ToastContext'
import { useNavigate } from 'react-router-dom'

function Settings({ session, household, setHousehold, profile, setProfile, households, setHouseholds, switchHousehold }) {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [inviteLink, setInviteLink] = useState(null)
  const [householdName, setHouseholdName] = useState(household?.name || '')
  const [householdCurrency, setHouseholdCurrency] = useState(household?.currency || 'ILS')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [savingHousehold, setSavingHousehold] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useToastContext()

  const isOwner = members.find(m => m.user_id === session.user.id)?.role === 'owner'

  useEffect(() => {
    setHouseholdName(household?.name || '')
    setHouseholdCurrency(household?.currency || 'ILS')
    setInviteLink(null)
    setPendingInvites([])
    setMembers([])
  }, [household?.id])

  useEffect(() => { fetchData() }, [household.id, session.user.id])

  const fetchData = async () => {
    const { data: memberData } = await supabase.from('household_members').select('id, role, joined_at, user_id').eq('household_id', household.id)
    if (memberData) {
      const userIds = memberData.map(m => m.user_id)
      const { data: profileData } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      setMembers(memberData.map(m => ({ ...m, profiles: profileData?.find(p => p.id === m.user_id) || null })))
    }
    const { data: inviteData } = await supabase.from('household_invites').select('id, invite_token, email, created_at, expires_at').eq('household_id', household.id).eq('status', 'pending').gt('expires_at', new Date().toISOString())
    if (inviteData) setPendingInvites(inviteData)
  }

  const handleSaveHousehold = async (e) => {
    e.preventDefault()
    setSavingHousehold(true)
    const { error } = await supabase.from('households').update({ name: householdName, currency: householdCurrency }).eq('id', household.id)
    if (error) { toast.error(error.message) } else {
      const updated = { ...household, name: householdName, currency: householdCurrency }
      setHousehold(updated)
      if (setHouseholds) setHouseholds(prev => prev.map(h => h.id === household.id ? updated : h))
      toast.success('Household updated.')
    }
    setSavingHousehold(false)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, full_name: fullName })
    if (error) { toast.error(error.message) } else { setProfile({ ...profile, full_name: fullName }); toast.success('Profile saved.') }
    setSavingProfile(false)
  }

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true)
    const existing = pendingInvites[0]
    if (existing) { setInviteLink(`${window.location.origin}/join/${existing.invite_token}`); setGeneratingInvite(false); return }
    const { data: invite, error } = await supabase.from('household_invites').insert({ household_id: household.id, invited_by: session.user.id }).select().single()
    if (error) { toast.error(error.message) } else { setInviteLink(`${window.location.origin}/join/${invite.invite_token}`); await fetchData() }
    setGeneratingInvite(false)
  }

  const handleCancelInvite = async (inviteId) => {
    await supabase.from('household_invites').update({ status: 'expired' }).eq('id', inviteId)
    setInviteLink(null)
    await fetchData()
    toast.success('Invite cancelled.')
  }

  const handleCopy = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const handleRemoveMember = async (memberId, memberUserId) => {
    if (memberUserId === session.user.id) { toast.error("You can't remove yourself."); return }
    if (!window.confirm('Remove this member from the household?')) return
    const { error } = await supabase.from('household_members').delete().eq('id', memberId)
    if (error) { toast.error(error.message) } else { await fetchData(); toast.success('Member removed.') }
  }

  const handleDeleteHousehold = async () => {
    if (!window.confirm(`Are you sure you want to delete "${household.name}"? All data will be permanently deleted.`)) return
    const id = household.id
    await supabase.from('budgets').delete().eq('household_id', id)
    await supabase.from('recurring_templates').delete().eq('household_id', id)
    await supabase.from('transactions').delete().eq('household_id', id)
    await supabase.from('categories').delete().eq('household_id', id)
    await supabase.from('household_invites').delete().eq('household_id', id)
    await supabase.from('household_members').delete().eq('household_id', id)
    await supabase.from('households').delete().eq('id', id)
    const remaining = (households || []).filter(h => h.id !== id)
    if (setHouseholds) setHouseholds(remaining)
    if (remaining.length > 0) { switchHousehold(remaining[0]); navigate('/dashboard'); toast.success('Household deleted.') }
    else { localStorage.removeItem('activeHouseholdId'); window.location.href = '/setup' }
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)', padding: '24px' }
  const sectionTitle = { fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text)', marginBottom: '20px' }
  const primaryBtn = { background: 'var(--primary)', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Settings</h1>

      {/* Profile */}
      <div style={card}>
        <h2 style={sectionTitle}>Your Profile</h2>
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="text" value={session.user.email} disabled style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-muted)' }} />
          </div>
          <div>
            <label style={labelStyle}>Full name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} />
          </div>
          <div>
            <button type="submit" disabled={savingProfile} style={{ ...primaryBtn, opacity: savingProfile ? 0.6 : 1 }}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Household */}
      <div style={card}>
        <h2 style={sectionTitle}>Household</h2>
        <form onSubmit={handleSaveHousehold} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Household name</label>
            <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} />
          </div>
          <div>
            <label style={labelStyle}>Base currency</label>
            <select value={householdCurrency} onChange={(e) => setHouseholdCurrency(e.target.value)} style={inputStyle}>
              <option value="ILS">₪ ILS — Israeli Shekel</option>
              <option value="USD">$ USD — US Dollar</option>
              <option value="EUR">€ EUR — Euro</option>
            </select>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>All totals and charts display in this currency.</p>
          </div>
          <div>
            <button type="submit" disabled={savingHousehold} style={{ ...primaryBtn, opacity: savingHousehold ? 0.6 : 1 }}>
              {savingHousehold ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Members */}
      <div style={card}>
        <h2 style={sectionTitle}>Members</h2>
        <ul style={{ marginBottom: '20px' }}>
          {members.map((m, i) => (
            <li key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>
                  {m.profiles?.full_name || 'Unknown'}
                  {m.user_id === session.user.id && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>(you)</span>}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                  Joined {new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', fontWeight: '500', background: m.role === 'owner' ? 'var(--primary-light)' : 'var(--bg)', color: m.role === 'owner' ? 'var(--primary)' : 'var(--text-muted)', border: `1px solid ${m.role === 'owner' ? 'var(--border)' : 'var(--border)'}` }}>
                  {m.role}
                </span>
                {isOwner && m.user_id !== session.user.id && (
                  <button onClick={() => handleRemoveMember(m.id, m.user_id)}
                    style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: 'none', color: 'var(--red)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '10px' }}>Pending invites</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingInvites.map(invite => (
                <li key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                      {`${window.location.origin}/join/${invite.invite_token}`}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                      Expires {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <button onClick={() => handleCancelInvite(invite.id)} style={{ fontSize: '12px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginLeft: '8px' }}>
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Invite */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Invite someone</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Generate a link and share it — anyone with the link can join this household.</p>
          {!inviteLink ? (
            <button onClick={handleGenerateInvite} disabled={generatingInvite} style={{ ...primaryBtn, opacity: generatingInvite ? 0.6 : 1 }}>
              {generatingInvite ? 'Generating...' : 'Generate invite link'}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={inviteLink} readOnly style={{ ...inputStyle, flex: 1, background: 'var(--bg)', fontSize: '12px', color: 'var(--text-muted)' }} />
                <button onClick={handleCopy} style={primaryBtn}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Link expires in 7 days.</p>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      {isOwner && (
        <div style={{ background: 'var(--surface)', border: '1px solid #fca5a5', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)' }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--red)', marginBottom: '8px' }}>Danger Zone</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Deleting this household will permanently remove all transactions, categories, budgets and recurring templates. This cannot be undone.
          </p>
          <button onClick={handleDeleteHousehold}
            style={{ border: '1px solid #fca5a5', background: 'none', color: 'var(--red)', padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            Delete household
          </button>
        </div>
      )}
    </div>
  )
}

export default Settings