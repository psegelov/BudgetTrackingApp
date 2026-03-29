import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useHousehold(session) {
  const [household, setHousehold] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return

    const fetchHousehold = async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('household_id, households(id, name, currency)')
        .eq('user_id', session.user.id)
        .single()

      if (error || !data) {
        setHousehold(null)
      } else {
        setHousehold(data.households)
      }

      setLoading(false)
    }

    fetchHousehold()
  }, [session])

  return { household, loading }
}