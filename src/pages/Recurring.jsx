import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToastContext } from '../context/ToastContext'

const Icons = {
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
  hand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 013 0m-3 6a1.5 1.5 0 000 3h6a1.5 1.5 0 001.5-1.5v-1.5A1.5 1.5 0 0013 12h-.5M7 11.5A1.5 1.5 0 018.5 10h1A1.5 1.5 0 0111 11.5v.5M7 11.5V9.5a1.5 1.5 0 013 0v.5"/></svg>,
}

function Recurring({ session, household }) {
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToastContext()

  const today = new Date().toISOString().split('T')[0]
  const emptyForm = {
    description: '', type: 'expense', amount: '', currency: household.currency,
    category_id: '', parent_category_id: '', frequency: 'monthly',
    start_date: today, end_date: '', is_active: true, auto_confirm: false
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchData() }, [household.id])

  const fetchData = async () => {
    const [{ data: tmpl }, { data: cats }] = await Promise.all([
      supabase.from('recurring_templates').select('*, categories(name, icon)').eq('household_id', household.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name, type, parent_id, icon').eq('household_id', household.id).eq('is_active', true).order('sort_order')
    ])
    if (tmpl) setTemplates(tmpl)
    if (cats) setCategories(cats)
    setLoading(false)
  }

  const handleAdd = () => { setEditingTemplate(null); setForm(emptyForm); setError(null); setShowForm(true) }

  const handleEdit = (tmpl) => {
    const cat = categories.find(c => c.id === tmpl.category_id)
    setEditingTemplate(tmpl)
    setForm({
      description: tmpl.description, type: tmpl.type, amount: tmpl.amount, currency: tmpl.currency,
      category_id: tmpl.category_id || '', parent_category_id: cat?.parent_id ? cat.parent_id : tmpl.category_id || '',
      frequency: tmpl.frequency, start_date: tmpl.start_date, end_date: tmpl.end_date || '',
      is_active: tmpl.is_active, auto_confirm: tmpl.auto_confirm || false
    })
    setError(null)
    setShowForm(true)
  }

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'type') { updated.category_id = ''; updated.parent_category_id = '' }
      if (field === 'parent_category_id') { updated.category_id = value }
      return updated
    })
  }

  const computeNextDueDate = (startDate, frequency) => {
    const now = new Date()
    let next = new Date(startDate)
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
      household_id: household.id, created_by: session.user.id, description: form.description,
      type: form.type, amount: parseFloat(form.amount), currency: form.currency,
      category_id: form.category_id || null, frequency: form.frequency, start_date: form.start_date,
      end_date: form.end_date || null, next_due_date: nextDueDate, is_active: form.is_active, auto_confirm: form.auto_confirm
    }
    if (editingTemplate) {
      const { error: e } = await supabase.from('recurring_templates').update(payload).eq('id', editingTemplate.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('recurring_templates').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    await fetchData()
    setShowForm(false)
    toast.success(editingTemplate ? 'Recurring updated.' : 'Recurring added.')
    setEditingTemplate(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingTemplate) return
    if (!window.confirm('Delete this recurring template?')) return
    setDeleting(true)
    const { error: e } = await supabase.from('recurring_templates').delete().eq('id', editingTemplate.id)
    if (e) { setError(e.message); setDeleting(false); return }
    await fetchData()
    setShowForm(false)
    toast.success('Recurring deleted.')
    setEditingTemplate(null)
    setDeleting(false)
  }

  const handleToggleActive = async (tmpl) => {
    await supabase.from('recurring_templates').update({ is_active: !tmpl.is_active }).eq('id', tmpl.id)
    await fetchData()
  }

  const parentCategories = categories.filter(c => c.type === form.type && !c.parent_id)
  const subCategories = categories.filter(c => c.type === form.type && c.parent_id)

  const frequencyLabel = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly', yearly: 'Yearly' }
  const formatAmount = (amount, currency) => {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }

  if (loading) return <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-subtle)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Recurring</h1>
        <button onClick={handleAdd} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
          + Add Recurring
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {templates.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '14px' }}>No recurring transactions yet.</div>
        )}
        <ul>
          {templates.map((tmpl, i) => (
            <li key={tmpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < templates.length - 1 ? '1px solid var(--border)' : 'none', opacity: tmpl.is_active ? 1 : 0.4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                  {tmpl.categories?.icon || '📦'}
                </div>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>{tmpl.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{frequencyLabel[tmpl.frequency]}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>due {tmpl.next_due_date}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: tmpl.auto_confirm ? 'var(--accent)' : 'var(--text-subtle)' }}>
                      <span style={{ width: '12px', height: '12px' }}>{tmpl.auto_confirm ? Icons.bolt : Icons.hand}</span>
                      {tmpl.auto_confirm ? 'Auto' : 'Manual'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: tmpl.type === 'expense' ? 'var(--red)' : 'var(--accent)' }}>
                  {tmpl.type === 'expense' ? '-' : '+'}{formatAmount(tmpl.amount, tmpl.currency)}
                </p>
                <button onClick={() => handleToggleActive(tmpl)}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '12px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {tmpl.is_active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => handleEdit(tmpl)}
                  style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--primary-light)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: '14px', height: '14px' }}>{Icons.edit}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text)' }}>
                {editingTemplate ? 'Edit Recurring' : 'Add Recurring'}
              </h2>
              <button onClick={() => { setShowForm(false); setError(null) }} style={{ width: '28px', height: '28px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span style={{ width: '18px', height: '18px' }}>{Icons.x}</span>
              </button>
            </div>

            {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</p>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Type */}
              <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)' }}>
                {['expense', 'income'].map(type => (
                  <button key={type} type="button" onClick={() => handleChange('type', type)}
                    style={{ flex: 1, padding: '8px', borderRadius: '7px', border: 'none', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s', background: form.type === type ? (type === 'expense' ? 'var(--red)' : 'var(--accent)') : 'transparent', color: form.type === type ? 'white' : 'var(--text-muted)' }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              <div><label style={labelStyle}>Description</label><input type="text" placeholder="e.g. Monthly Rent" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required style={inputStyle} onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} /></div>

              <div>
                <label style={labelStyle}>Amount</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={(e) => handleChange('amount', e.target.value)} required style={{ ...inputStyle, flex: 1 }} onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }} />
                  <select value={form.currency} onChange={(e) => handleChange('currency', e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
                    <option value="ILS">₪ ILS</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option>
                  </select>
                </div>
              </div>

              <div><label style={labelStyle}>Category</label><select value={form.parent_category_id} onChange={(e) => handleChange('parent_category_id', e.target.value)} style={inputStyle}><option value="">Select category</option>{parentCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>

              {form.parent_category_id && subCategories.some(c => c.parent_id === form.parent_category_id) && (
                <div><label style={labelStyle}>Subcategory <span style={{ color: 'var(--text-subtle)', fontWeight: '400' }}>(optional)</span></label><select value={form.category_id === form.parent_category_id ? '' : form.category_id} onChange={(e) => handleChange('category_id', e.target.value || form.parent_category_id)} style={inputStyle}><option value="">None</option>{subCategories.filter(c => c.parent_id === form.parent_category_id).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
              )}

              <div><label style={labelStyle}>Frequency</label><select value={form.frequency} onChange={(e) => handleChange('frequency', e.target.value)} style={inputStyle}><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>

              {/* Auto log toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>Auto log</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{form.auto_confirm ? 'Logs automatically when due' : 'Asks you to confirm when due'}</p>
                </div>
                <button type="button" onClick={() => handleChange('auto_confirm', !form.auto_confirm)}
                  style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: form.auto_confirm ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '2px', left: form.auto_confirm ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              <div><label style={labelStyle}>Start date</label><input type="date" value={form.start_date} onChange={(e) => handleChange('start_date', e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>End date <span style={{ color: 'var(--text-subtle)', fontWeight: '400' }}>(optional)</span></label><input type="date" value={form.end_date} onChange={(e) => handleChange('end_date', e.target.value)} style={inputStyle} /></div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, background: saving ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Add Recurring'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(null) }} style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>

              {editingTemplate && (
                <button type="button" onClick={handleDelete} disabled={deleting} style={{ background: 'none', border: '1px solid #fca5a5', color: 'var(--red)', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: deleting ? 'not-allowed' : 'pointer' }}>
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