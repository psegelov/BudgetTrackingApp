import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToastContext } from '../context/ToastContext'

const Icons = {
  chevronLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>,
}

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

  const emptyForm = { category_id: '', amount: '', currency: household.currency, repeats: true, month: null, year: selectedYear }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchData() }, [household.id, selectedMonth, selectedYear])

  const fetchData = async () => {
    setLoading(true)
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const [{ data: budgetData }, { data: catData }, { data: txData }] = await Promise.all([
      supabase.from('budgets').select('*').eq('household_id', household.id).eq('year', selectedYear),
      supabase.from('categories').select('id, name, icon, color, type, parent_id').eq('household_id', household.id).eq('is_active', true).order('sort_order'),
      supabase.from('transactions').select('category_id, amount_base, type').eq('household_id', household.id).gte('date', startDate).lte('date', endDate)
    ])

    if (budgetData) setBudgets(budgetData)
    if (catData) setCategories(catData)
    if (txData) setTransactions(txData)
    setLoading(false)
  }

  const getEffectiveBudget = (categoryId) => {
    const specific = budgets.find(b => b.category_id === categoryId && b.month === selectedMonth + 1 && b.year === selectedYear)
    if (specific) return specific
    return budgets.find(b => b.category_id === categoryId && b.repeats === true && b.month === null && b.year === selectedYear) || null
  }

  const getActual = (categoryId) => {
    const subCategoryIds = categories.filter(c => c.parent_id === categoryId).map(c => c.id)
    return transactions.filter(t => [categoryId, ...subCategoryIds].includes(t.category_id) && t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_base), 0)
  }

  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parent_id)
  const budgetedCategories = expenseCategories.filter(c => getEffectiveBudget(c.id))
  const unbudgetedCategories = expenseCategories.filter(c => !getEffectiveBudget(c.id))
  const totalBudgeted = budgetedCategories.reduce((sum, c) => sum + Number(getEffectiveBudget(c.id)?.amount_base || 0), 0)
  const totalActual = budgetedCategories.reduce((sum, c) => sum + getActual(c.id), 0)

  const handleAdd = (categoryId = '') => { setEditingBudget(null); setForm({ ...emptyForm, category_id: categoryId, year: selectedYear }); setError(null); setShowForm(true) }
  const handleEdit = (budget) => { setEditingBudget(budget); setForm({ category_id: budget.category_id, amount: budget.amount, currency: budget.currency, repeats: budget.repeats, month: budget.month, year: budget.year }); setError(null); setShowForm(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const amount = parseFloat(form.amount)
    const payload = { household_id: household.id, category_id: form.category_id, period: 'monthly', year: selectedYear, month: form.repeats ? null : selectedMonth + 1, amount, currency: form.currency, amount_base: amount, repeats: form.repeats }

    if (editingBudget) {
      const { error: e } = await supabase.from('budgets').update(payload).eq('id', editingBudget.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('budgets').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    await fetchData()
    setShowForm(false)
    toast.success(editingBudget ? 'Budget updated.' : 'Budget set.')
    setEditingBudget(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingBudget) return
    const { error: e } = await supabase.from('budgets').delete().eq('id', editingBudget.id)
    if (e) { setError(e.message); return }
    await fetchData()
    setShowForm(false)
    toast.success('Budget deleted.')
    setEditingBudget(null)
  }

  const monthName = new Date(selectedYear, selectedMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
  const goToPrevMonth = () => { if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) } else setSelectedMonth(m => m - 1) }
  const goToNextMonth = () => { if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) } else setSelectedMonth(m => m + 1) }

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)' }

  if (loading) return <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-subtle)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Budgets</h1>
        <button onClick={() => handleAdd()} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
          + Add Budget
        </button>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={goToPrevMonth} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '16px', height: '16px' }}>{Icons.chevronLeft}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text)', minWidth: '160px', textAlign: 'center' }}>{monthName}</span>
          {!isCurrentMonth && (
            <button onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()) }} style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Today</button>
          )}
        </div>
        <button onClick={goToNextMonth} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '16px', height: '16px' }}>{Icons.chevronRight}</span>
        </button>
      </div>

      {/* Overall summary */}
      {budgetedCategories.length > 0 && (
        <div style={{ ...card, padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>Total budget</p>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{formatBase(totalActual)} / {formatBase(totalBudgeted)}</p>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: totalActual > totalBudgeted ? 'var(--red)' : 'var(--primary)', width: `${Math.min((totalActual / totalBudgeted) * 100, 100)}%`, transition: 'width 0.3s' }} />
          </div>
          <p style={{ fontSize: '12px', color: totalActual > totalBudgeted ? 'var(--red)' : 'var(--text-subtle)', marginTop: '8px' }}>
            {totalActual > totalBudgeted ? `${formatBase(totalActual - totalBudgeted)} over budget` : `${formatBase(totalBudgeted - totalActual)} remaining`}
          </p>
        </div>
      )}

      {/* Budgeted categories */}
      {budgetedCategories.length > 0 && (
        <div style={{ ...card, marginBottom: '20px' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: 'var(--text)' }}>Category Budgets</span>
          </div>
          <ul>
            {budgetedCategories.map((cat, i) => {
              const budget = getEffectiveBudget(cat.id)
              const actual = getActual(cat.id)
              const budgeted = Number(budget.amount_base)
              const percent = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : 0
              const isOver = actual > budgeted
              const isOverride = budget.month !== null

              return (
                <li key={cat.id} style={{ padding: '16px 20px', borderBottom: i < budgetedCategories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                        {cat.icon}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{cat.name}</span>
                      {isOverride && <span style={{ fontSize: '11px', background: 'var(--amber-light)', color: 'var(--amber)', padding: '2px 7px', borderRadius: '4px', fontWeight: '500' }}>Override</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: isOver ? 'var(--red)' : 'var(--text)' }}>
                        {formatBase(actual)} / {formatBase(budgeted)}
                      </span>
                      <button onClick={() => handleEdit(budget)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--primary-light)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ width: '13px', height: '13px' }}>{Icons.edit}</span>
                      </button>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '3px', background: isOver ? 'var(--red)' : 'var(--primary)', width: `${percent}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{Math.round(percent)}% used</span>
                    <span style={{ fontSize: '11px', color: isOver ? 'var(--red)' : 'var(--text-muted)' }}>
                      {isOver ? `${formatBase(actual - budgeted)} over` : `${formatBase(budgeted - actual)} left`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Unbudgeted */}
      {unbudgetedCategories.length > 0 && (
        <div style={card}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text-muted)' }}>No budget set</span>
          </div>
          <ul>
            {unbudgetedCategories.map((cat, i) => (
              <li key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < unbudgetedCategories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{cat.name}</span>
                </div>
                <button onClick={() => handleAdd(cat.id)}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  + Set budget
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '14px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text)' }}>
                {editingBudget ? 'Edit Budget' : 'Set Budget'}
              </h2>
              <button onClick={() => { setShowForm(false); setError(null) }} style={{ width: '28px', height: '28px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span style={{ width: '18px', height: '18px' }}>{Icons.x}</span>
              </button>
            </div>

            {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</p>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category_id} onChange={(e) => setForm(prev => ({ ...prev, category_id: e.target.value }))} required disabled={!!editingBudget}
                  style={{ ...inputStyle, background: editingBudget ? 'var(--bg)' : 'var(--surface)', color: editingBudget ? 'var(--text-muted)' : 'var(--text)' }}>
                  <option value="">Select category</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Amount</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))} required style={{ ...inputStyle, flex: 1 }} onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} />
                  <select value={form.currency} onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value }))} style={{ ...inputStyle, width: 'auto' }}>
                    <option value="ILS">₪ ILS</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option>
                  </select>
                </div>
              </div>

              {/* Repeats toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>Repeat every month</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{form.repeats ? 'Applies to all months unless overridden' : `Applies to ${monthName} only`}</p>
                </div>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, repeats: !prev.repeats }))}
                  style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: form.repeats ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '2px', left: form.repeats ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, background: saving ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : editingBudget ? 'Save Changes' : 'Set Budget'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(null) }} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>

              {editingBudget && (
                <button type="button" onClick={handleDelete} style={{ background: 'none', border: '1px solid #fca5a5', color: 'var(--red)', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
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