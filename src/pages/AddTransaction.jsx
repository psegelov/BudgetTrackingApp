import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function AddTransaction({ session, household }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    currency: household.currency,
    category_id: '',
    date: today,
    description: ''
  })

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, type, parent_id, icon')
        .eq('is_active', true)
        .order('sort_order')

      if (data) setCategories(data)
    }

    fetchCategories()
  }, [])

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      // Reset category when type changes
      if (field === 'type') updated.category_id = ''
      return updated
    })
  }

  const filteredCategories = categories.filter(c => c.type === form.type)
  const parentCategories = filteredCategories.filter(c => !c.parent_id)
  const subCategories = filteredCategories.filter(c => c.parent_id)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Get exchange rate
    let exchangeRate = 1
    let amountBase = parseFloat(form.amount)

    if (form.currency !== household.currency) {
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', form.currency)
        .eq('to_currency', household.currency)
        .eq('date', today)
        .single()

      if (rateData) {
        exchangeRate = rateData.rate
        amountBase = parseFloat(form.amount) * exchangeRate
      } else {
        setError('Could not find exchange rate for today. Please enter an ILS amount instead.')
        setLoading(false)
        return
      }
    }

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        household_id: household.id,
        category_id: form.category_id || null,
        created_by: session.user.id,
        type: form.type,
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        exchange_rate: exchangeRate,
        amount_base: amountBase
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div>
      <h1>Add Transaction</h1>
      <form onSubmit={handleSubmit}>

        {/* Type toggle */}
        <div>
          <button
            type="button"
            onClick={() => handleChange('type', 'expense')}
            style={{ fontWeight: form.type === 'expense' ? 'bold' : 'normal' }}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => handleChange('type', 'income')}
            style={{ fontWeight: form.type === 'income' ? 'bold' : 'normal' }}
          >
            Income
          </button>
        </div>

        {/* Amount + currency */}
        <div>
          <input
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            required
          />
          <select
            value={form.currency}
            onChange={(e) => handleChange('currency', e.target.value)}
          >
            <option value="ILS">₪ ILS</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <select
            value={form.category_id}
            onChange={(e) => handleChange('category_id', e.target.value)}
          >
            <option value="">Select category</option>
            {parentCategories.map(parent => (
              <optgroup key={parent.id} label={`${parent.icon || ''} ${parent.name}`}>
                {/* Parent itself as an option */}
                <option value={parent.id}>{parent.icon || ''} {parent.name}</option>
                {/* Subcategories */}
                {subCategories
                  .filter(sub => sub.parent_id === parent.id)
                  .map(sub => (
                    <option key={sub.id} value={sub.id}>
                      — {sub.icon || ''} {sub.name}
                    </option>
                  ))
                }
              </optgroup>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <input
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Transaction'}
        </button>
        <button type="button" onClick={() => navigate('/dashboard')}>
          Cancel
        </button>

      </form>
    </div>
  )
}

export default AddTransaction