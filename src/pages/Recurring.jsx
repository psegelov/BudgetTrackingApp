import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Recurring({ session, household }) {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  const emptyForm = {
    description: '',
    type: 'expense',
    amount: '',
    currency: household.currency,
    category_id: '',
    parent_category_id: '',
    frequency: 'monthly',
    start_date: today,
    end_date: '',
    is_active: true,
    auto_confirm: false

  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchData()
  }, [household.id])

  const fetchData = async () => {
    const [{ data: tmpl }, { data: cats }] = await Promise.all([
      supabase
        .from('recurring_templates')
        .select('*, categories(name, icon)')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name, type, parent_id, icon')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('sort_order')
    ])

    if (tmpl) setTemplates(tmpl)
    if (cats) setCategories(cats)
    setLoading(false)
  }

  const handleAdd = () => {
    setEditingTemplate(null)
    setForm(emptyForm)
    setError(null)
    setShowForm(true)
  }

  const handleEdit = (tmpl) => {
    const cat = categories.find(c => c.id === tmpl.category_id)
    setEditingTemplate(tmpl)
    setForm({
      description: tmpl.description,
      type: tmpl.type,
      amount: tmpl.amount,
      currency: tmpl.currency,
      category_id: tmpl.category_id || '',
      parent_category_id: cat?.parent_id ? cat.parent_id : tmpl.category_id || '',
      frequency: tmpl.frequency,
      start_date: tmpl.start_date,
      end_date: tmpl.end_date || '',
      is_active: tmpl.is_active,
      auto_confirm: tmpl.auto_confirm || false
    })
    setError(null)
    setShowForm(true)
  }

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'type') {
        updated.category_id = ''
        updated.parent_category_id = ''
      }
      if (field === 'parent_category_id') {
        updated.category_id = value
      }
      return updated
    })
  }

    const computeNextDueDate = (startDate, frequency) => {
        const start = new Date(startDate)
        const now = new Date()
        let next = new Date(start)

        while (next <= now) {
            if (frequency === 'weekly') next.setDate(next.getDate() + 7)
            else if (frequency === 'biweekly') next.setDate(next.getDate() + 14)
            else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
            else if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)
        }

        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
        }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const nextDueDate = computeNextDueDate(form.start_date, form.frequency)

    const payload = {
      household_id: household.id,
      created_by: session.user.id,
      description: form.description,
      type: form.type,
      amount: parseFloat(form.amount),
      currency: form.currency,
      category_id: form.category_id || null,
      frequency: form.frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
      next_due_date: nextDueDate,
      is_active: form.is_active,
      auto_confirm: form.auto_confirm
    }

    if (editingTemplate) {
      const { error: updateError } = await supabase
        .from('recurring_templates')
        .update(payload)
        .eq('id', editingTemplate.id)

      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase
        .from('recurring_templates')
        .insert(payload)

      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    await fetchData()
    setShowForm(false)
    setEditingTemplate(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingTemplate) return
    if (!window.confirm('Delete this recurring template?')) return
    setDeleting(true)

    const { error: deleteError } = await supabase
      .from('recurring_templates')
      .delete()
      .eq('id', editingTemplate.id)

    if (deleteError) { setError(deleteError.message); setDeleting(false); return }

    await fetchData()
    setShowForm(false)
    setEditingTemplate(null)
    setDeleting(false)
  }

  const handleToggleActive = async (tmpl) => {
    await supabase
      .from('recurring_templates')
      .update({ is_active: !tmpl.is_active })
      .eq('id', tmpl.id)
    await fetchData()
  }

  const parentCategories = categories.filter(c => c.type === form.type && !c.parent_id)
  const subCategories = categories.filter(c => c.type === form.type && c.parent_id)

  const frequencyLabel = {
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    monthly: 'Monthly',
    yearly: 'Yearly'
  }

  const formatAmount = (amount, currency) => {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Recurring</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Recurring
        </button>
      </div>

      {/* Template list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {templates.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            No recurring transactions yet.
          </div>
        )}
        <ul className="divide-y divide-gray-50">
          {templates.map(tmpl => (
            <li
              key={tmpl.id}
              className={`flex items-center justify-between px-5 py-4 ${!tmpl.is_active ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {tmpl.categories?.icon || '📦'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{tmpl.description}</p>
                  <p className="text-xs text-gray-400">
                    {frequencyLabel[tmpl.frequency]} · next due {tmpl.next_due_date} · {tmpl.auto_confirm ? '⚡ Auto' : '✋ Manual'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${tmpl.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                  {tmpl.type === 'expense' ? '-' : '+'}{formatAmount(tmpl.amount, tmpl.currency)}
                </p>
                <button
                  onClick={() => handleToggleActive(tmpl)}
                  className={`text-xs px-2 py-1 rounded-full transition ${
                    tmpl.is_active
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {tmpl.is_active ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => handleEdit(tmpl)}
                  className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editingTemplate ? 'Edit Recurring' : 'Add Recurring'}
            </h2>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button type="button"
                  onClick={() => handleChange('type', 'expense')}
                  className={`flex-1 py-2.5 text-sm font-medium transition ${form.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >Expense</button>
                <button type="button"
                  onClick={() => handleChange('type', 'income')}
                  className={`flex-1 py-2.5 text-sm font-medium transition ${form.type === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                >Income</button>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Rent"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  value={form.parent_category_id}
                  onChange={(e) => handleChange('parent_category_id', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {parentCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              {form.parent_category_id && subCategories.some(c => c.parent_id === form.parent_category_id) && (
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
                    {subCategories
                      .filter(c => c.parent_id === form.parent_category_id)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => handleChange('frequency', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Auto confirm toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto log</p>
                  <p className="text-xs text-gray-400">
                    {form.auto_confirm
                      ? 'Logs automatically when due'
                      : 'Asks you to confirm when due'
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('auto_confirm', !form.auto_confirm)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    form.auto_confirm ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    form.auto_confirm ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End date <span className="text-gray-400 font-normal">(optional — leave blank for indefinite)</span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Add Recurring'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>

              {editingTemplate && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 font-medium py-2.5 rounded-lg transition"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Recurring