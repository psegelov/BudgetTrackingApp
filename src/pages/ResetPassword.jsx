import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handleReset = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { setReady(true); return }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
      })
      return () => subscription.unsubscribe()
    }
    handleReset()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-subtle)' }}>Verifying reset link...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--primary)', letterSpacing: '-0.5px' }}>New password</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Choose a strong password</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>New password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Confirm password</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px' }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ background: loading ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword