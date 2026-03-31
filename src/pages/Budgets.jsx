import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToastContext } from '../context/ToastContext'

function Budgets({ household }) {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToastContext()

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const emptyForm = {
    category_id: '',
    amount: '',
    currency: household.currency,
    repeats: true,
    month: null,
    year: selectedYear
  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchData()
  }, [household.id, selectedMonth, selectedYear])

  const fetchData = async () => {
    setLoading(true)

    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const [{ data: budgetData }, { data: catData }, { data: txData }] = await Promise.all([
      supabase
        .from('budgets')
        .select('*')
        .eq('household_id', household.id)
        .eq('year', selectedYear),
      supabase
        .from('categories')
        .select('id, name, icon, color, type, parent_id')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('transactions')
        .select('category_id, amount_base, type')
        .eq('household_id', household.id)
        .gte('date', startDate)
        .lte('date', endDate)
    ])

    if (budgetData) setBudgets(budgetData)
    if (catData) setCategories(catData)
    if (txData) setTransactions(txData)
    setLoading(false)
  }

  // Get effective budget for a category in selected month
  // Specific month override takes priority over repeating
  const getEffectiveBudget = (categoryId) => {
    const specific = budgets.find(
      b => b.category_id === categoryId &&
      b.month === selectedMonth + 1 &&
      b.year === selectedYear
    )
    if (specific) return specific

    const repeating = budgets.find(
      b => b.category_id === categoryId &&
      b.repeats === true &&
      b.month === null &&
      b.year === selectedYear
    )
    return repeating || null
  }

  // Get actual spending for a category this month
    const getActual = (categoryId) => {
    // Get all subcategory IDs for this parent
    const subCategoryIds = categories
        .filter(c => c.parent_id === categoryId)
        .map(c => c.id)

    // Include the parent itself and all its subcategories
    const relevantIds = [categoryId, ...subCategoryIds]

    return transactions
        .filter(t => relevantIds.includes(t.category_id) && t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount_base), 0)
    }

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parent_id)

  const budgetedCategories = expenseCategories.filter(c => getEffectiveBudget(c.id))
  const unbudgetedCategories = expenseCategories.filter(c => !getEffectiveBudget(c.id))

  const totalBudgeted = budgetedCategories.reduce((sum, c) => {
    const b = getEffectiveBudget(c.id)
    return sum + Number(b?.amount_base || 0)
  }, 0)

  const totalActual = budgetedCategories.reduce((sum, c) => sum + getActual(c.id), 0)

  const handleAdd = (categoryId = '') => {
    setEditingBudget(null)
    setForm({ ...emptyForm, category_id: categoryId, year: selectedYear })
    setError(null)
    setShowForm(true)
  }

  const handleEdit = (budget) => {
    setEditingBudget(budget)
    setForm({
      category_id: budget.category_id,
      amount: budget.amount,
      currency: budget.currency,
      repeats: budget.repeats,
      month: budget.month,
      year: budget.year
    })
    setError(null)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const amount = parseFloat(form.amount)

    const payload = {
      household_id: household.id,
      category_id: form.category_id,
      period: 'monthly',
      year: selectedYear,
      month: form.repeats ? null : selectedMonth + 1,
      amount: amount,
      currency: form.currency,
      amount_base: amount,
      repeats: form.repeats
    }

    if (editingBudget) {
      const { error: updateError } = await supabase
        .from('budgets')
        .update(payload)
        .eq('id', editingBudget.id)

      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase
        .from('budgets')
        .insert(payload)

      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    await fetchData()
    setShowForm(false)
    toast.success(editingBudget ? 'Budget updated.' : 'Budget set.')
    setEditingBudget(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingBudget) return
    const { error: deleteError } = await supabase
      .from('budgets')
      .delete()
      .eq('id', editingBudget.id)

    if (deleteError) { setError(deleteError.message); return }

    await fetchData()
    setShowForm(false)
    toast.success('Budget deleted.')
    setEditingBudget(null)
  }

  const monthName = new Date(selectedYear, selectedMonth).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric'
  })

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Budgets</h1>
        <button
          onClick={() => handleAdd()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Budget
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">←</button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">{monthName}</span>
          {!isCurrentMonth && (
            <button
              onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()) }}
              className="text-xs text-blue-600 hover:underline"
            >
              Today
            </button>
          )}
        </div>
        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">→</button>
      </div>

      {/* Overall summary */}
      {budgetedCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-gray-700">Total budget</p>
            <p className="text-sm text-gray-500">
              {formatBase(totalActual)} / {formatBase(totalBudgeted)}
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                totalActual > totalBudgeted ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((totalActual / totalBudgeted) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {totalActual > totalBudgeted
              ? `${formatBase(totalActual - totalBudgeted)} over budget`
              : `${formatBase(totalBudgeted - totalActual)} remaining`
            }
          </p>
        </div>
      )}

      {/* Budgeted categories */}
      {budgetedCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Category Budgets</h2>
          </div>
          <ul className="divide-y divide-gray-50 px-5">
            {budgetedCategories.map(cat => {
              const budget = getEffectiveBudget(cat.id)
              const actual = getActual(cat.id)
              const budgeted = Number(budget.amount_base)
              const percent = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : 0
              const isOver = actual > budgeted
              const isOverride = budget.month !== null

              return (
                <li key={cat.id} className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                      {isOverride && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isOver ? 'text-red-500' : 'text-gray-700'}`}>
                        {formatBase(actual)} / {formatBase(budgeted)}
                      </span>
                      <button
                        onClick={() => handleEdit(budget)}
                        className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{Math.round(percent)}% used</span>
                    <span className={`text-xs ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
                      {isOver
                        ? `${formatBase(actual - budgeted)} over`
                        : `${formatBase(budgeted - actual)} left`
                      }
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Unbudgeted categories */}
      {unbudgetedCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">No budget set</h2>
          </div>
          <ul className="divide-y divide-gray-50 px-5">
            {unbudgetedCategories.map(cat => (
              <li key={cat.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="text-sm text-gray-600">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleAdd(cat.id)}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  + Set budget
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editingBudget ? 'Edit Budget' : 'Set Budget'}
            </h2>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm(prev => ({ ...prev, category_id: e.target.value }))}
                  required
                  disabled={!!editingBudget}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Select category</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={form.currency}
                    onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ILS">₪ ILS</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
              </div>

              {/* Repeats toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Repeat every month</p>
                  <p className="text-xs text-gray-400">
                    {form.repeats
                      ? 'Applies to all months unless overridden'
                      : `Applies to ${monthName} only`
                    }
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, repeats: !prev.repeats }))}
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    form.repeats ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${
                    form.repeats ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {saving ? 'Saving...' : editingBudget ? 'Save Changes' : 'Set Budget'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>

              {editingBudget && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 font-medium py-2.5 rounded-lg transition"
                >
                  Delete Budget
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Budgets