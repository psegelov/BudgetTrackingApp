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
        setError('Could not find exchange rate for today. Please use ILS instead.')
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
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add Transaction</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => handleChange('type', 'expense')}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                form.type === 'expense'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleChange('type', 'income')}
              className={`flex-1 py-2.5 text-sm font-medium transition ${
                form.type === 'income'
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount + currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                required
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={form.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ILS">₪ ILS</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => handleChange('category_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly groceries"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
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
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default AddTransaction