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

  if (confirming) {
    return (
      <div>
        <h1>Are you sure?</h1>
        <p>You are about to create a household called <strong>"{name}"</strong>.</p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button onClick={handleConfirm} disabled={loading}>
          {loading ? 'Creating...' : 'Yes, create it'}
        </button>
        <button onClick={() => setConfirming(false)} disabled={loading}>
          Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1>Create your household</h1>
      <p>Give your household a name to get started.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="e.g. Segelov Family"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </div>
  )
}

export default HouseholdSetup