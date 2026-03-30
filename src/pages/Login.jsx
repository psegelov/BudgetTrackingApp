import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSearchParams } from 'react-router-dom'

function Login() {
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

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

    // Check for pending invite (for login flow)
    const pendingToken = localStorage.getItem('pendingInviteToken')
    if (pendingToken) {
      localStorage.removeItem('pendingInviteToken')
      window.location.href = `/join/${pendingToken}`
      return
    }

    // After successful login
    if (inviteToken) {
      window.location.href = `/join/${inviteToken}`
      return
    }
    window.location.href = '/dashboard'
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h1>
          <p className="text-sm text-gray-400 mb-6">
            We sent a confirmation link to{' '}
            <span className="font-medium text-gray-600">{email}</span>.
            Click it to activate your account.
          </p>
          <button
            onClick={() => setSignUpSuccess(false)}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to login
          </button>
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
          <p className="text-sm text-gray-400 mt-1">Track your finances simply</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-5">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:underline font-medium"
            >
              {isSignUp ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Login