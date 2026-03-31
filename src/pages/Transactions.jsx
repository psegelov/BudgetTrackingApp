import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Transactions({ household }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [expandedParents, setExpandedParents] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  const [showFilters, setShowFilters] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name, icon, parent_id, type').eq('household_id', household.id).eq('is_active', true).order('sort_order')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [household.id])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('transactions').select('*, categories(name, icon, color, parent_id)').eq('household_id', household.id)
    if (filterType !== 'all') query = query.eq('type', filterType)
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    if (selectedCategories.length > 0) query = query.in('category_id', selectedCategories)
    if (sortBy === 'date_desc') query = query.order('date', { ascending: false })
    else if (sortBy === 'date_asc') query = query.order('date', { ascending: true })
    else if (sortBy === 'amount_desc') query = query.order('amount_base', { ascending: false })
    else if (sortBy === 'amount_asc') query = query.order('amount_base', { ascending: true })
    const { data, error } = await query
    if (!error) setTransactions(data)
    setLoading(false)
  }, [household.id, filterType, selectedCategories, startDate, endDate, sortBy])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { setSelectedCategories([]); setExpandedParents([]) }, [filterType])

  const filtered = transactions.filter(t => {
    if (!search) return true
    return t.description?.toLowerCase().includes(search.toLowerCase()) || t.categories?.name?.toLowerCase().includes(search.toLowerCase())
  })

  const totalFiltered = filtered.reduce((sum, t) => sum + Number(t.amount_base), 0)
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_base), 0)
  const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_base), 0)

  const visibleCategories = filterType === 'all' ? categories : categories.filter(c => c.type === filterType)
  const parentCategories = visibleCategories.filter(c => !c.parent_id)
  const subCategories = visibleCategories.filter(c => c.parent_id)

  const getSubsForParent = (parentId) => subCategories.filter(c => c.parent_id === parentId)

  const isParentSelected = (parentId) => {
    const subs = getSubsForParent(parentId)
    if (subs.length === 0) return selectedCategories.includes(parentId)
    return subs.every(s => selectedCategories.includes(s.id)) && selectedCategories.includes(parentId)
  }

  const isParentPartial = (parentId) => {
    const subs = getSubsForParent(parentId)
    if (subs.length === 0) return false
    return subs.some(s => selectedCategories.includes(s.id)) && !subs.every(s => selectedCategories.includes(s.id))
  }

  const toggleParent = (parent) => {
    const subs = getSubsForParent(parent.id)
    const allIds = [parent.id, ...subs.map(s => s.id)]
    const allSelected = allIds.every(id => selectedCategories.includes(id))
    if (allSelected) setSelectedCategories(prev => prev.filter(id => !allIds.includes(id)))
    else setSelectedCategories(prev => [...new Set([...prev, ...allIds])])
  }

  const toggleSub = (subId) => setSelectedCategories(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId])
  const toggleExpand = (parentId) => setExpandedParents(prev => prev.includes(parentId) ? prev.filter(id => id !== parentId) : [...prev, parentId])

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const activeFilterCount = [filterType !== 'all', selectedCategories.length > 0, startDate !== '', endDate !== '', sortBy !== 'date_desc'].filter(Boolean).length

  const clearFilters = () => {
    setFilterType('all'); setSelectedCategories([]); setExpandedParents([])
    setShowCategoryDropdown(false); setStartDate(''); setEndDate(''); setSortBy('date_desc'); setSearch('')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        <button onClick={() => navigate('/add')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">+ Add</button>
      </div>

      <div className="mb-3">
        <input type="text" placeholder="Search by description or category..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition ${showFilters || activeFilterCount > 0 ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          🔽 Filters
          {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs text-red-500 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition">Remove filters</button>}
        <p className="text-xs text-gray-400 ml-auto">{filtered.length} transactions</p>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {['all', 'expense', 'income'].map(type => (
                <button key={type} onClick={() => setFilterType(type)}
                  className={`flex-1 py-2 text-sm font-medium transition capitalize ${filterType === type ? type === 'expense' ? 'bg-red-500 text-white' : type === 'income' ? 'bg-green-500 text-white' : 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Categories {selectedCategories.length > 0 && <span className="ml-2 text-blue-600">({selectedCategories.length} selected)</span>}
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                <span>{selectedCategories.length === 0 ? 'All categories' : `${selectedCategories.length} selected`}</span>
                <span className="text-gray-400">{showCategoryDropdown ? '▲' : '▼'}</span>
              </button>
              {showCategoryDropdown && (
                <div className="border-t border-gray-100 max-h-52 overflow-y-auto">
                  {parentCategories.map(parent => {
                    const subs = getSubsForParent(parent.id)
                    const isExpanded = expandedParents.includes(parent.id)
                    const isSelected = isParentSelected(parent.id)
                    const isPartial = isParentPartial(parent.id)
                    return (
                      <div key={parent.id}>
                        <div className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                          {subs.length > 0 ? <button onClick={() => toggleExpand(parent.id)} className="text-gray-400 hover:text-gray-600 w-4 text-xs flex-shrink-0">{isExpanded ? '▼' : '▶'}</button> : <div className="w-4 flex-shrink-0" />}
                          <button onClick={() => toggleParent(parent)} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : isPartial ? 'bg-blue-200 border-blue-400' : 'border-gray-300 hover:border-blue-400'}`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                            {isPartial && <span className="text-blue-600 text-xs">—</span>}
                          </button>
                          <button onClick={() => toggleParent(parent)} className="flex items-center gap-2 flex-1 text-left">
                            <span>{parent.icon}</span>
                            <span className="text-sm text-gray-700 font-medium">{parent.name}</span>
                          </button>
                        </div>
                        {isExpanded && subs.map(sub => {
                          const isSubSelected = selectedCategories.includes(sub.id)
                          return (
                            <div key={sub.id} className={`flex items-center gap-2 px-3 py-2 pl-14 hover:bg-gray-50 ${isSubSelected ? 'bg-blue-50' : ''}`}>
                              <button onClick={() => toggleSub(sub.id)} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSubSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
                                {isSubSelected && <span className="text-white text-xs">✓</span>}
                              </button>
                              <button onClick={() => toggleSub(sub.id)} className="flex items-center gap-2 flex-1 text-left">
                                <span>{sub.icon}</span>
                                <span className="text-sm text-gray-400">{sub.name}</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort by</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="date_desc">Date — newest first</option>
              <option value="date_asc">Date — oldest first</option>
              <option value="amount_desc">Amount — highest first</option>
              <option value="amount_asc">Amount — lowest first</option>
            </select>
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs text-gray-400 mb-1">Income</p>
            <p className="text-sm font-bold text-green-500">+{formatBase(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs text-gray-400 mb-1">Expenses</p>
            <p className="text-sm font-bold text-red-500">-{formatBase(totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <p className="text-xs text-gray-400 mb-1">Net</p>
            <p className={`text-sm font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalIncome - totalExpenses >= 0 ? '+' : ''}{formatBase(totalIncome - totalExpenses)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading && <div className="px-5 py-8 text-center text-gray-400">Loading...</div>}
        {!loading && filtered.length === 0 && <div className="px-5 py-8 text-center text-gray-400">No transactions found.</div>}

        {!loading && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Subcategory</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Description</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => {
                    const base = Number(t.amount_base)
                    const isSubCat = t.categories?.parent_id
                    const parentCat = isSubCat ? categories.find(c => c.id === t.categories?.parent_id) : null
                    return (
                      <tr key={t.id} onClick={() => navigate(`/edit/${t.id}`)} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="px-5 py-3 text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <span>{(parentCat || t.categories)?.icon || '📦'}</span>
                            <span>{parentCat?.name || t.categories?.name || 'Uncategorised'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {isSubCat ? <div className="flex items-center gap-1.5"><span>{t.categories?.icon}</span><span>{t.categories?.name}</span></div> : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-500">{t.description || '—'}</td>
                        <td className={`px-5 py-3 text-right font-medium ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                          {t.type === 'expense' ? '-' : '+'}{formatBase(base)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={4} className="px-5 py-3 font-semibold text-gray-700">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-700">{formatBase(totalFiltered)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="md:hidden divide-y divide-gray-50">
              {filtered.map(t => {
                const base = Number(t.amount_base)
                const isSubCat = t.categories?.parent_id
                const parentCat = isSubCat ? categories.find(c => c.id === t.categories?.parent_id) : null
                return (
                  <li key={t.id} onClick={() => navigate(`/edit/${t.id}`)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">{(parentCat || t.categories)?.icon || '📦'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {parentCat?.name || t.categories?.name || 'Uncategorised'}
                            {isSubCat && <span className="text-gray-400 font-normal"> · {t.categories?.name}</span>}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(t.date)}{t.description && ` · ${t.description}`}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold flex-shrink-0 ml-2 ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                        {t.type === 'expense' ? '-' : '+'}{formatBase(base)}
                      </p>
                    </div>
                  </li>
                )
              })}
              <li className="px-4 py-3 border-t-2 border-gray-200 flex justify-between">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="font-bold text-gray-700">{formatBase(totalFiltered)}</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default Transactions