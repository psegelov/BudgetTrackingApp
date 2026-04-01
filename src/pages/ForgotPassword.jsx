import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (resetError) { setError(resetError.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg style={{ width: '28px', height: '28px' }} viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '24px', color: 'var(--text)', marginBottom: '8px' }}>Check your email</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            We sent a reset link to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
          <button onClick={() => navigate('/login')} style={{ fontSize: '13.5px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--primary)', letterSpacing: '-0.5px' }}>Reset password</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>We'll send you a reset link</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px' }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ background: loading ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px' }}>
            <button onClick={() => navigate('/login')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>
              Back to login
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword