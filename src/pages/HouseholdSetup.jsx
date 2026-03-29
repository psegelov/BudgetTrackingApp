import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function HouseholdSetup({ session, setHousehold }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setConfirming(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name, created_by: session.user.id })
      .select()
      .single()

    if (householdError) {
      setError(householdError.message)
      setLoading(false)
      setConfirming(false)
      return
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: session.user.id,
        role: 'owner'
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      setConfirming(false)
      return
    }

    setHousehold(household)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800">Set up your household</h1>
          <p className="text-sm text-gray-400 mt-1">You can invite others later</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {!confirming ? (
            <>
              <h2 className="text-lg font-semibold text-gray-700 mb-5">
                Name your household
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Household name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Segelov Family"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Continue
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Confirm household
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                You're about to create a household called{' '}
                <span className="font-semibold text-gray-800">"{name}"</span>.
              </p>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {loading ? 'Creating...' : 'Yes, create it'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                  className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition"
                >
                  Go back
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default HouseholdSetup