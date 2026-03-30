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

    const { data: cats } = await supabase
        .from('categories')
        .select('id, name, type, parent_id, icon')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('sort_order')

    setCategories(cats || [])

    // Find parent category for the loaded transaction
    const loadedCategoryId = transaction.category_id
    let parentId = loadedCategoryId

    if (loadedCategoryId && cats) {
        const cat = cats.find(c => c.id === loadedCategoryId)
        if (cat?.parent_id) {
        parentId = cat.parent_id
        }
    }

    setForm({
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category_id: loadedCategoryId || '',
        parent_category_id: parentId || '',
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
        if (field === 'type') {
        updated.category_id = ''
        updated.parent_category_id = ''
        }
        if (field === 'parent_category_id') {
        updated.category_id = value // default to parent if no sub selected
        }
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


  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      Loading...
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Transaction</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSave} className="space-y-5">

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

        {/* Parent Category */}
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
            value={form.parent_category_id}
            onChange={(e) => handleChange('parent_category_id', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">Select category</option>
            {categories
            .filter(c => c.type === form.type && !c.parent_id)
            .map(c => (
                <option key={c.id} value={c.id}>
                {c.icon} {c.name}
                </option>
            ))
            }
        </select>
        </div>

        {/* Subcategory — only shows if parent has subcategories */}
        {form.parent_category_id && categories.some(c => c.parent_id === form.parent_category_id) && (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
            value={form.category_id === form.parent_category_id ? '' : form.category_id}
            onChange={(e) => handleChange('category_id', e.target.value || form.parent_category_id)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <option value="">None</option>
            {categories
                .filter(c => c.parent_id === form.parent_category_id)
                .map(c => (
                <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                </option>
                ))
            }
            </select>
        </div>
        )}

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
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 font-medium py-2.5 rounded-lg transition"
          >
            {deleting ? 'Deleting...' : 'Delete Transaction'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default EditTransaction