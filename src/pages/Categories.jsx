import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToastContext } from '../context/ToastContext'

const ICONS = ['🏠','🛒','🚗','💡','🍽️','🏥','🎬','📚','👕','📦','💰','💻','📈','💵','⛽','🚌','🅿️','🛡️','⚡','💧','📡','📱','🔥','🏪','🥦','💊','🏦','🏛️','🔧','🎁','💼','🎯','✈️','🏋️','🐾','🎵','🍕','☕','🛍️','💈','🚙']

const Icons = {
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  arrowUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  arrowDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>,
}

function Categories({ household }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('expense')
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [collapsed, setCollapsed] = useState({})
  const toast = useToastContext()

  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const emptyForm = { name: '', icon: '📦', color: '#166534', type: activeType, parent_id: '', is_active: true }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchCategories() }, [household.id])

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').eq('household_id', household.id).order('sort_order')
    if (data) setCategories(data)
    setLoading(false)
  }

  const parentCategories = categories.filter(c => c.type === activeType && !c.parent_id)
  const subCategories = categories.filter(c => c.type === activeType && c.parent_id)

  const handleAdd = () => {
    setEditingCategory(null)
    setForm({ ...emptyForm, type: activeType })
    setError(null)
    setShowForm(true)
  }

  const handleEdit = (cat) => {
    setEditingCategory(cat)
    setForm({ name: cat.name, icon: cat.icon || '📦', color: cat.color || '#166534', type: cat.type, parent_id: cat.parent_id || '', is_active: cat.is_active })
    setError(null)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { name: form.name, icon: form.icon, color: form.color, type: form.type, parent_id: form.parent_id || null, is_active: form.is_active, household_id: household.id }

    if (editingCategory) {
      const { error: updateError } = await supabase.from('categories').update(payload).eq('id', editingCategory.id)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase.from('categories').insert(payload)
      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    await fetchCategories()
    setShowForm(false)
    toast.success(editingCategory ? 'Category updated.' : 'Category added.')
    setEditingCategory(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingCategory) return
    setDeleting(true)
    setError(null)

    const { count: txCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category_id', editingCategory.id)
    if (txCount > 0) { setError(`This category has ${txCount} transaction${txCount > 1 ? 's' : ''} — reassign or delete them first.`); setDeleting(false); return }

    const { count: subCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', editingCategory.id)
    if (subCount > 0) { setError(`This category has ${subCount} subcategor${subCount > 1 ? 'ies' : 'y'} — delete them first.`); setDeleting(false); return }

    const { error: deleteError } = await supabase.from('categories').delete().eq('id', editingCategory.id)
    if (deleteError) { setError(deleteError.message); setDeleting(false); return }

    await fetchCategories()
    setShowForm(false)
    toast.success('Category deleted.')
    setEditingCategory(null)
    setDeleting(false)
  }

  const handleToggleActive = async (cat) => {
    setCategories(prev => prev.map(c => {
      if (c.id === cat.id) return { ...c, is_active: !cat.is_active }
      if (!cat.parent_id && cat.is_active && c.parent_id === cat.id) return { ...c, is_active: false }
      return c
    }))
    if (!cat.parent_id && cat.is_active) {
      const subs = categories.filter(c => c.parent_id === cat.id)
      for (const sub of subs) await supabase.from('categories').update({ is_active: false }).eq('id', sub.id)
    }
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
  }

  const handleMoveUp = async (cat) => {
    let newOrder = null
    setCategories(prev_cats => {
      const list = prev_cats.filter(c => c.type === cat.type && (cat.parent_id ? c.parent_id === cat.parent_id : !c.parent_id)).sort((a, b) => a.sort_order - b.sort_order)
      const index = list.findIndex(c => c.id === cat.id)
      if (index === 0) return prev_cats
      const prev = list[index - 1]
      const prevPrev = list[index - 2]
      newOrder = prevPrev ? Math.floor((prevPrev.sort_order + prev.sort_order) / 2) : prev.sort_order - 10
      if (newOrder >= prev.sort_order) newOrder = prev.sort_order - 10
      return prev_cats.map(c => c.id === cat.id ? { ...c, sort_order: newOrder } : c).sort((a, b) => a.sort_order - b.sort_order)
    })
    setTimeout(async () => { if (newOrder !== null) await supabase.from('categories').update({ sort_order: newOrder }).eq('id', cat.id) }, 0)
  }

  const handleMoveDown = async (cat) => {
    let newOrder = null
    setCategories(prev_cats => {
      const list = prev_cats.filter(c => c.type === cat.type && (cat.parent_id ? c.parent_id === cat.parent_id : !c.parent_id)).sort((a, b) => a.sort_order - b.sort_order)
      const index = list.findIndex(c => c.id === cat.id)
      if (index === list.length - 1) return prev_cats
      const next = list[index + 1]
      const nextNext = list[index + 2]
      newOrder = nextNext ? Math.floor((next.sort_order + nextNext.sort_order) / 2) : next.sort_order + 10
      if (newOrder <= next.sort_order) newOrder = next.sort_order + 10
      return prev_cats.map(c => c.id === cat.id ? { ...c, sort_order: newOrder } : c).sort((a, b) => a.sort_order - b.sort_order)
    })
    setTimeout(async () => { if (newOrder !== null) await supabase.from('categories').update({ sort_order: newOrder }).eq('id', cat.id) }, 0)
  }

  const btnStyle = (active, color) => ({
    padding: '5px 10px', borderRadius: '6px', border: 'none', fontSize: '12px',
    fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? color : 'var(--bg)',
    color: active ? 'white' : 'var(--text-muted)'
  })

  const iconBtnStyle = {
    width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-subtle)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Categories</h1>
        <button onClick={handleAdd}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
          + Add Category
        </button>
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border)', marginBottom: '20px' }}>
        {['expense', 'income'].map(type => (
          <button key={type} onClick={() => setActiveType(type)}
            style={{
              flex: 1, padding: '8px', borderRadius: '7px', border: 'none', fontSize: '13.5px',
              fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
              background: activeType === type ? (type === 'expense' ? 'var(--red)' : 'var(--accent)') : 'transparent',
              color: activeType === type ? 'white' : 'var(--text-muted)'
            }}>
            {type === 'expense' ? 'Expenses' : 'Income'}
          </button>
        ))}
      </div>

      {/* Category list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {parentCategories.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '14px' }}>
            No {activeType} categories yet.
          </div>
        )}
        <ul>
          {parentCategories.map((parent, pi) => {
            const subs = subCategories.filter(s => s.parent_id === parent.id)
            const isCollapsed = collapsed[parent.id]
            return (
              <li key={parent.id} style={{ borderBottom: pi < parentCategories.length - 1 || (subs.length > 0 && !isCollapsed) ? '1px solid var(--border)' : 'none' }}>
                {/* Parent row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', opacity: parent.is_active ? 1 : 0.4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {subs.length > 0 ? (
                      <button onClick={() => toggleCollapse(parent.id)} style={{ width: '16px', height: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, flexShrink: 0 }}>
                        {isCollapsed ? Icons.chevronRight : Icons.chevronDown}
                      </button>
                    ) : <div style={{ width: '16px' }} />}
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      {parent.icon}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{parent.name}</span>
                    {subs.length > 0 && <span style={{ fontSize: '11px', color: 'var(--text-subtle)', background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px' }}>{subs.length}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => handleMoveUp(parent)} style={iconBtnStyle}>
                      <span style={{ width: '13px', height: '13px' }}>{Icons.arrowUp}</span>
                    </button>
                    <button onClick={() => handleMoveDown(parent)} style={iconBtnStyle}>
                      <span style={{ width: '13px', height: '13px' }}>{Icons.arrowDown}</span>
                    </button>
                    <button onClick={() => handleToggleActive(parent)} style={btnStyle(false, 'var(--primary)')}>
                      {parent.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => handleEdit(parent)} style={{ ...iconBtnStyle, background: 'var(--primary-light)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
                      <span style={{ width: '13px', height: '13px' }}>{Icons.edit}</span>
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {!isCollapsed && subs.map((sub, si) => (
                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px 52px', borderTop: '1px solid var(--border)', background: 'var(--bg)', opacity: sub.is_active ? 1 : 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                        {sub.icon}
                      </div>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>{sub.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button onClick={() => handleMoveUp(sub)} style={iconBtnStyle}>
                        <span style={{ width: '13px', height: '13px' }}>{Icons.arrowUp}</span>
                      </button>
                      <button onClick={() => handleMoveDown(sub)} style={iconBtnStyle}>
                        <span style={{ width: '13px', height: '13px' }}>{Icons.arrowDown}</span>
                      </button>
                      <button onClick={() => handleToggleActive(sub)} style={btnStyle(false, 'var(--primary)')}>
                        {sub.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => handleEdit(sub)} style={{ ...iconBtnStyle, background: 'var(--primary-light)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
                        <span style={{ width: '13px', height: '13px' }}>{Icons.edit}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '14px', width: '100%', maxWidth: '440px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: 'var(--text)' }}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={() => { setShowForm(false); setError(null) }} style={{ width: '28px', height: '28px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span style={{ width: '18px', height: '18px' }}>{Icons.x}</span>
              </button>
            </div>

            {error && <p style={{ fontSize: '13px', color: 'var(--red)', background: 'var(--red-light)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</p>}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Type</label>
                <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
                  {['expense', 'income'].map(type => (
                    <button key={type} type="button" onClick={() => setForm(prev => ({ ...prev, type, parent_id: '' }))}
                      style={{
                        flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '13px',
                        fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                        background: form.type === type ? (type === 'expense' ? 'var(--red)' : 'var(--accent)') : 'transparent',
                        color: form.type === type ? 'white' : 'var(--text-muted)'
                      }}>
                      {type === 'expense' ? 'Expense' : 'Income'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* Parent */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>
                  Parent category <span style={{ color: 'var(--text-subtle)', fontWeight: '400' }}>(optional)</span>
                </label>
                <select value={form.parent_id} onChange={(e) => setForm(prev => ({ ...prev, parent_id: e.target.value }))}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">None — top level category</option>
                  {categories.filter(c => c.type === form.type && !c.parent_id && c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Icon picker */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '8px' }}>Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(prev => ({ ...prev, icon }))}
                      style={{
                        fontSize: '18px', padding: '6px', borderRadius: '8px', border: form.icon === icon ? '2px solid var(--primary)' : '2px solid transparent',
                        background: form.icon === icon ? 'var(--primary-light)' : 'var(--bg)', cursor: 'pointer', transition: 'all 0.1s'
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>Color</label>
                <input type="color" value={form.color} onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                  style={{ height: '40px', width: '100%', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, background: saving ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(null) }}
                  style={{ flex: 1, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>

              {editingCategory && (
                <button type="button" onClick={handleDelete} disabled={deleting}
                  style={{ background: 'none', border: '1px solid #fca5a5', color: 'var(--red)', padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Deleting...' : 'Delete Category'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories