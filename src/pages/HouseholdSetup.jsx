import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function HouseholdSetup({ session, setHousehold, households, setHouseholds }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('ILS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isFirstHousehold = !households || households.length === 0

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: newHousehold, error: householdError } = await supabase
      .from('households')
      .insert({ name, currency, created_by: session.user.id })
      .select()
      .single()

    if (householdError) {
      setError(householdError.message)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: newHousehold.id,
        user_id: session.user.id,
        role: 'owner'
      })

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    setHouseholds(prev => [...(prev || []), newHousehold])
    setHousehold(newHousehold)
    localStorage.setItem('activeHouseholdId', newHousehold.id)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isFirstHousehold ? 'Create your household' : 'New household'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isFirstHousehold
              ? 'Give your household a name to get started'
              : 'Create another household to track separately'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Household name</label>
              <input
                type="text"
                placeholder="e.g. Segelov Family"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ILS">₪ ILS — Israeli Shekel</option>
                <option value="USD">$ USD — US Dollar</option>
                <option value="EUR">€ EUR — Euro</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Creating...' : 'Create Household'}
            </button>

            {!isFirstHousehold && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

export default HouseholdSetup