import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function HouseholdSetup({ session }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Debug — check session
    const { data: { session } } = await supabase.auth.getSession()
    console.log('session:', session)

    // Create the household
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name, created_by: session.user.id })
      .select()
      .single()

    console.log('household result:', household, householdError)


    if (householdError) {
      setError(householdError.message)
      setLoading(false)
      return
    }

    // Add the user as owner
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
      return
    }

    navigate('/dashboard')
  }

  return (
    <div>
      <h1>Create your household</h1>
      <p>Give your household a name to get started.</p>
      <form onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="e.g. Cohen Family"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Household'}
        </button>
      </form>
    </div>
  )
}

export default HouseholdSetup