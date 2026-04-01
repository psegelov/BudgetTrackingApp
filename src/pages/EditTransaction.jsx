import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useParams } from 'react-router-dom'
import { getExchangeRate } from '../lib/exchangeRates'
import { useToastContext } from '../context/ToastContext'

function EditTransaction({ session, household }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)
  const [liveRate, setLiveRate] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: transaction, error: txError } = await supabase
        .from('transactions').select('*').eq('id', id).eq('household_id', household.id).single()
      if (txError || !transaction) { navigate('/dashboard'); return }

      const { data: cats } = await supabase.from('categories').select('id, name, type, parent_id, icon')
        .eq('household_id', household.id).eq('is_active', true).order('sort_order')
      setCategories(cats || [])

      const loadedCategoryId = transaction.category_id
      let parentId = loadedCategoryId
      if (loadedCategoryId && cats) {
        const cat = cats.find(c => c.id === loadedCategoryId)
        if (cat?.parent_id) parentId = cat.parent_id
      }

      setForm({
        type: transaction.type, amount: transaction.amount, currency: transaction.currency,
        category_id: loadedCategoryId || '', parent_category_id: parentId || '',
        date: transaction.date, description: transaction.description || ''
      })
      setLoading(false)
    }
    fetchData()
  }, [id, household.id])

  useEffect(() => {
    if (!form) return
    const fetchRate = async () => {
      if (form.currency === household.currency) { setLiveRate(null); return }
      const rate = await getExchangeRate(form.currency, household.currency, form.date)
      setLiveRate(rate)
    }
    fetchRate()
  }, [form?.currency, form?.date])

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'type') { updated.category_id = ''; updated.parent_category_id = '' }
      if (field === 'parent_category_id') { updated.category_id = value }
      return updated
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    let exchangeRate = 1
    let amountBase = parseFloat(form.amount)

    if (form.currency !== household.currency) {
      const rate = await getExchangeRate(form.currency, household.currency, form.date)
      if (!rate) { setError('Could not fetch exchange rate.'); setSaving(false); return }
      exchangeRate = rate
      amountBase = parseFloat(form.amount) * rate
    }

    const { error: updateError } = await supabase.from('transactions').update({
      type: form.type, date: form.date, description: form.description,
      amount: parseFloat(form.amount), currency: form.currency,
      exchange_rate: exchangeRate, amount_base: amountBase, category_id: form.category_id || null
    }).eq('id', id)

    if (updateError) { setError(updateError.message); setSaving(false); return }
    toast.success('Transaction updated.')
    navigate('/dashboard')
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    setDeleting(true)
    const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id)
    if (deleteError) { setError(deleteError.message); setDeleting(false); return }
    toast.success('Transaction deleted.')
    navigate('/dashboard')
  }

  const filteredCategories = categories.filter(c => c.type === form?.type)
  const parentCategories = filteredCategories.filter(c => !c.parent_id)
  const subCategories = filteredCategories.filter(c => c.parent_id)

  const inputStyle = {
    width: '100%', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
    color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box'
  }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }

  if (loading) return <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-subtle)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Edit Transaction</h1>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', boxShadow: 'var(--shadow)' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Type toggle */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
            {['expense', 'income'].map(type => (
              <button key={type} type="button" onClick={() => handleChange('type', type)}
                style={{
                  flex: 1, padding: '8px', borderRadius: '7px', border: 'none', fontSize: '13.5px',
                  fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                  background: form.type === type ? (type === 'expense' ? 'var(--red)' : 'var(--accent)') : 'transparent',
                  color: form.type === type ? 'white' : 'var(--text-muted)'
                }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Amount + currency */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" placeholder="0.00" min="0" step="0.01"
                value={form.amount} onChange={(e) => handleChange('amount', e.target.value)} required
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
              />
              <select value={form.currency} onChange={(e) => handleChange('currency', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                <option value="ILS">₪ ILS</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
            {liveRate && form.currency !== household.currency && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                1 {form.currency} = {liveRate} {household.currency}
                {form.amount && <span style={{ marginLeft: '8px', fontWeight: '500', color: 'var(--text)' }}>
                  → {household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'}{(parseFloat(form.amount) * liveRate).toLocaleString()}
                </span>}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.parent_category_id} onChange={(e) => handleChange('parent_category_id', e.target.value)} style={inputStyle}>
              <option value="">Select category</option>
              {parentCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          {/* Subcategory */}
          {form.parent_category_id && subCategories.some(c => c.parent_id === form.parent_category_id) && (
            <div>
              <label style={labelStyle}>Subcategory <span style={{ color: 'var(--text-subtle)', fontWeight: '400' }}>(optional)</span></label>
              <select
                value={form.category_id === form.parent_category_id ? '' : form.category_id}
                onChange={(e) => handleChange('category_id', e.target.value || form.parent_category_id)}
                style={inputStyle}>
                <option value="">None</option>
                {subCategories.filter(c => c.parent_id === form.parent_category_id).map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} required
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description <span style={{ color: 'var(--text-subtle)', fontWeight: '400' }}>(optional)</span></label>
            <input type="text" placeholder="e.g. Weekly groceries" value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px' }}>{error}</p>}

          <button type="submit" disabled={saving}
            style={{
              background: saving ? 'var(--text-muted)' : 'var(--primary)', color: 'white',
              border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px',
              fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer'
            }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button type="button" onClick={handleDelete} disabled={deleting}
            style={{
              background: 'none', border: '1px solid #fca5a5', color: 'var(--red)',
              padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
              fontFamily: 'DM Sans, sans-serif', cursor: deleting ? 'not-allowed' : 'pointer'
            }}>
            {deleting ? 'Deleting...' : 'Delete Transaction'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EditTransaction