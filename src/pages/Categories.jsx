import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ICONS = ['🏠','🛒','🚗','💡','🍽️','🏥','🎬','📚','👕','📦','💰','💻','📈','💵','⛽','🚌','🅿️','🛡️','⚡','💧','📡','📱','🔥','🏪','🥦','💊','🏦','🏛️','🔧','🎁','💼','🎯','✈️','🏋️','🐾','🎵','🍕','☕','🛍️','💈','🚙','🏛️']

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

  const toggleCollapse = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const emptyForm = {
    name: '',
    icon: '📦',
    color: '#6366f1',
    type: activeType,
    parent_id: '',
    is_active: true
  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchCategories()
  }, [household.id])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .order('sort_order')

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
    setForm({
      name: cat.name,
      icon: cat.icon || '📦',
      color: cat.color || '#6366f1',
      type: cat.type,
      parent_id: cat.parent_id || '',
      is_active: cat.is_active
    })
    setError(null)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name,
      icon: form.icon,
      color: form.color,
      type: form.type,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
      household_id: household.id
    }

    if (editingCategory) {
      const { error: updateError } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editingCategory.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('categories')
        .insert(payload)

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
    }

    await fetchCategories()
    setShowForm(false)
    setEditingCategory(null)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingCategory) return
    setDeleting(true)
    setError(null)

    // Check for existing transactions
    const { count: txCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', editingCategory.id)

    if (txCount > 0) {
      setError(`This category has ${txCount} transaction${txCount > 1 ? 's' : ''} — reassign or delete them before removing this category.`)
      setDeleting(false)
      return
    }

    // Check for subcategories
    const { count: subCount } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', editingCategory.id)

    if (subCount > 0) {
      setError(`This category has ${subCount} subcategor${subCount > 1 ? 'ies' : 'y'} — delete them first.`)
      setDeleting(false)
      return
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', editingCategory.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }

    await fetchCategories()
    setShowForm(false)
    setEditingCategory(null)
    setDeleting(false)
  }

  const handleToggleActive = async (cat) => {
    // Optimistic update
    setCategories(prev => prev.map(c => {
      if (c.id === cat.id) return { ...c, is_active: !cat.is_active }
      // Hide subcategories if hiding parent
      if (!cat.parent_id && cat.is_active && c.parent_id === cat.id) return { ...c, is_active: false }
      return c
    }))

    if (!cat.parent_id && cat.is_active) {
      const subs = categories.filter(c => c.parent_id === cat.id)
      for (const sub of subs) {
        await supabase.from('categories').update({ is_active: false }).eq('id', sub.id)
      }
    }

    await supabase
      .from('categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)
  }

  const handleMoveUp = async (cat) => {
    let catId = cat.id
    let newOrder = null

    setCategories(prev_cats => {
      const list = prev_cats.filter(c =>
        c.type === cat.type &&
        (cat.parent_id ? c.parent_id === cat.parent_id : !c.parent_id)
      ).sort((a, b) => a.sort_order - b.sort_order)

      const index = list.findIndex(c => c.id === catId)
      if (index === 0) return prev_cats

      const prev = list[index - 1]
      const prevPrev = list[index - 2]

      // Place between prevPrev and prev
      newOrder = prevPrev
        ? Math.floor((prevPrev.sort_order + prev.sort_order) / 2)
        : prev.sort_order - 10

      // If newOrder equals prev.sort_order, force a gap
      if (newOrder >= prev.sort_order) newOrder = prev.sort_order - 10

      return prev_cats.map(c =>
        c.id === catId ? { ...c, sort_order: newOrder } : c
      ).sort((a, b) => a.sort_order - b.sort_order)
    })

    setTimeout(async () => {
      if (newOrder === null) return
      await supabase.from('categories').update({ sort_order: newOrder }).eq('id', catId)
    }, 0)
  }

const handleMoveDown = async (cat) => {
  let catId = cat.id
  let newOrder = null

  setCategories(prev_cats => {
    const list = prev_cats.filter(c =>
      c.type === cat.type &&
      (cat.parent_id ? c.parent_id === cat.parent_id : !c.parent_id)
    ).sort((a, b) => a.sort_order - b.sort_order)

    const index = list.findIndex(c => c.id === catId)
    if (index === list.length - 1) return prev_cats

    const next = list[index + 1]
    const nextNext = list[index + 2]

    // Place between next and nextNext
    newOrder = nextNext
      ? Math.floor((next.sort_order + nextNext.sort_order) / 2)
      : next.sort_order + 10

    // If newOrder equals next.sort_order, force a gap
    if (newOrder <= next.sort_order) newOrder = next.sort_order + 10

    return prev_cats.map(c =>
      c.id === catId ? { ...c, sort_order: newOrder } : c
    ).sort((a, b) => a.sort_order - b.sort_order)
  })

  setTimeout(async () => {
    if (newOrder === null) return
    await supabase.from('categories').update({ sort_order: newOrder }).eq('id', catId)
  }, 0)
}

  const CategoryRow = ({ cat, list, indent = false }) => (
    <li className={`flex items-center justify-between py-3 ${indent ? 'pl-12 border-l-2 border-gray-100 ml-4' : ''} ${!cat.is_active ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{cat.icon}</span>
        <p className="text-sm font-medium text-gray-800">{cat.name}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => handleMoveUp(cat)}>↑</button>
        <button onClick={() => handleMoveDown(cat)}>↓</button>
        <button
          onClick={() => handleToggleActive(cat)}
          className={`text-xs px-2 py-1 rounded-full transition ${
            cat.is_active
              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          {cat.is_active ? 'Hide' : 'Show'}
        </button>
        <button
          onClick={() => handleEdit(cat)}
          className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
        >
          Edit
        </button>
      </div>
    </li>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Category
        </button>
      </div>

      {error && !showForm && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
      )}

      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6 bg-white">
        <button
          onClick={() => setActiveType('expense')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            activeType === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveType('income')}
          className={`flex-1 py-2.5 text-sm font-medium transition ${
            activeType === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          Income
        </button>
      </div>

      {/* Category list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <ul className="divide-y divide-gray-50 px-4">
          {parentCategories.map(parent => {
            const subs = subCategories.filter(s => s.parent_id === parent.id)
            const isCollapsed = collapsed[parent.id]

            return (
              <>
                <li key={parent.id} className={`flex items-center justify-between py-3 ${!parent.is_active ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3">
                    {subs.length > 0 && (
                      <button
                        onClick={() => toggleCollapse(parent.id)}
                        className="text-gray-400 hover:text-gray-600 transition text-xs w-4"
                      >
                        {isCollapsed ? '▶' : '▼'}
                      </button>
                    )}
                    {subs.length === 0 && <div className="w-4" />}
                    <span className="text-lg">{parent.icon}</span>
                    <p className="text-sm font-medium text-gray-800">{parent.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveUp(parent)} className="p-1.5 text-gray-400 hover:text-gray-600 transition">↑</button>
                    <button onClick={() => handleMoveDown(parent)} className="p-1.5 text-gray-400 hover:text-gray-600 transition">↓</button>
                    <button
                      onClick={() => handleToggleActive(parent)}
                      className={`text-xs px-2 py-1 rounded-full transition ${
                        parent.is_active
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {parent.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleEdit(parent)}
                      className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                    >
                      Edit
                    </button>
                  </div>
                </li>

                {!isCollapsed && subs.map(sub => (
                  <CategoryRow key={sub.id} cat={sub} indent />
                ))}
              </>
            )
          })}
          {parentCategories.length === 0 && (
            <li className="py-8 text-center text-gray-400 text-sm">
              No {activeType} categories yet.
            </li>
          )}
        </ul>
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: 'expense', parent_id: '' }))}
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      form.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >Expense</button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, type: 'income', parent_id: '' }))}
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      form.type === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >Income</button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Parent category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent category <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm(prev => ({ ...prev, parent_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None — top level category</option>
                  {categories
                    .filter(c => c.type === form.type && !c.parent_id && c.is_active)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, icon }))}
                      className={`text-xl p-1.5 rounded-lg transition ${
                        form.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-200 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>

              {/* Delete button */}
              {editingCategory && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 font-medium py-2.5 rounded-lg transition"
                >
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