import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams, useNavigate } from 'react-router-dom'

function Login() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite') // From URL: ?invite=xxx
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  // 1. PERSISTENCE: Save the invite token to localStorage immediately on load
  // This ensures that after the Google redirect, we still know where to send them.
  useEffect(() => {
    if (inviteToken) {
      localStorage.setItem('pendingInviteToken', inviteToken)
      console.log('Invite token persisted:', inviteToken)
    }
  }, [inviteToken])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    const pendingToken = localStorage.getItem('pendingInviteToken') || inviteToken
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: pendingToken
          ? `${window.location.origin}/join/${pendingToken}`
          : `${window.location.origin}/dashboard`
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let result
    if (isSignUp) {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Email confirmation link will redirect here
          emailRedirectTo: inviteToken 
            ? `${window.location.origin}/join/${inviteToken}` 
            : `${window.location.origin}/dashboard`
        }
      })
    } else {
      result = await supabase.auth.signInWithPassword({ email, password })
    }

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    if (isSignUp) {
      setSignUpSuccess(true)
      setLoading(false)
      return
    }

    // After successful login - force reload so App.jsx re-runs init()
    const storedToken = localStorage.getItem('pendingInviteToken')
    if (storedToken) {
      localStorage.removeItem('pendingInviteToken')
      window.location.href = `/join/${storedToken}`
    } else if (inviteToken) {
      window.location.href = `/join/${inviteToken}`
    } else {
      window.location.href = '/dashboard'
    }

  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h1>
          <p className="text-sm text-gray-400 mb-6">Confirm your account to finish joining the household.</p>
          <button onClick={() => setSignUpSuccess(false)} className="text-blue-600 hover:underline">Back to login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-gray-800">Budget App</h1>
          {inviteToken && <p className="text-sm text-blue-600 font-medium">You've been invited to join a household!</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-5">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                {!isSignUp && (
                  <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-blue-600 hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg disabled:opacity-50">
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400 uppercase">or</span></div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-400 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 hover:underline font-medium">
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login