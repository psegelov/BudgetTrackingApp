import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useHousehold(session) {
  const [household, setHousehold] = useState(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return

    setLoading(true)

    const fetchHousehold = async () => {
      const { data } = await supabase
        .from('household_members')
        .select('household_id, households(id, name, currency)')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (data?.households) {
        setHousehold(data.households)
      } else {
        setHousehold(null)
      }

      setLoading(false)
    }

    fetchHousehold()
  }, [session?.user?.id])

  return { household, loading }
}