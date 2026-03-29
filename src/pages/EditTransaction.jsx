import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'

function EditTransaction({ session, household }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('household_id', household.id)
        .single()

      if (txError || !transaction) {
        navigate('/dashboard')
        return
      }

      // Fetch categories
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, type, parent_id, icon')
        .eq('is_active', true)
        .order('sort_order')

      setCategories(cats || [])
      setForm({
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category_id: transaction.category_id || '',
        date: transaction.date,
        description: transaction.description || ''
      })
      setLoading(false)
    }

    fetchData()
  }, [id, household.id])

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'type') updated.category_id = ''
      return updated
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const today = new Date().toISOString().split('T')[0]
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
        setError('Could not find exchange rate for today.')
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        type: form.type,
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        exchange_rate: exchangeRate,
        amount_base: amountBase,
        category_id: form.category_id || null
      })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    navigate('/dashboard')
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    navigate('/dashboard')
  }

  const filteredCategories = categories.filter(c => c.type === form?.type)
  const parentCategories = filteredCategories.filter(c => !c.parent_id)
  const subCategories = filteredCategories.filter(c => c.parent_id)

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h1>Edit Transaction</h1>
      <form onSubmit={handleSave}>

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
                <option value={parent.id}>{parent.icon || ''} {parent.name}</option>
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

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => navigate('/dashboard')}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{ color: 'red' }}
        >
          {deleting ? 'Deleting...' : 'Delete Transaction'}
        </button>

      </form>
    </div>
  )
}

export default EditTransaction