import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function ProfileSetup({ session, setProfile }) {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: updateError } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', session.user.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    setProfile({ full_name: fullName })
    navigate('/setup')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--primary)', letterSpacing: '-0.5px' }}>Your profile</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Just a few details to get started</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Full name</label>
              <input type="text" placeholder="e.g. Phillip Segelov" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px' }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ background: loading ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetup