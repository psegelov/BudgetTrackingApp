import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Transactions({ household }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, icon, parent_id')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('sort_order')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [household.id])

  useEffect(() => {
    fetchTransactions()
  }, [household.id, filterType, filterCategory, startDate, endDate, sortBy])

  const fetchTransactions = async () => {
    setLoading(true)

    let query = supabase
      .from('transactions')
      .select('*, categories(name, icon, color)')
      .eq('household_id', household.id)

    if (filterType !== 'all') query = query.eq('type', filterType)
    if (filterCategory) query = query.eq('category_id', filterCategory)
    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    if (sortBy === 'date_desc') query = query.order('date', { ascending: false })
    else if (sortBy === 'date_asc') query = query.order('date', { ascending: true })
    else if (sortBy === 'amount_desc') query = query.order('amount_base', { ascending: false })
    else if (sortBy === 'amount_asc') query = query.order('amount_base', { ascending: true })

    const { data, error } = await query

    if (!error) setTransactions(data)
    setLoading(false)
  }

  // Client-side search filter
  const filtered = transactions.filter(t => {
    if (!search) return true
    return t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.categories?.name?.toLowerCase().includes(search.toLowerCase())
  })

  const formatAmount = (amount, currency, type) => {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€'
    const sign = type === 'expense' ? '-' : '+'
    return `${sign}${symbol}${Number(amount).toLocaleString()}`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const parentCategories = categories.filter(c => !c.parent_id)
  const subCategories = categories.filter(c => c.parent_id)

  const activeFilterCount = [
    filterType !== 'all',
    filterCategory !== '',
    startDate !== '',
    endDate !== '',
    sortBy !== 'date_desc'
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterType('all')
    setFilterCategory('')
    setStartDate('')
    setEndDate('')
    setSortBy('date_desc')
    setSearch('')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        <button
          onClick={() => navigate('/add')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by description or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition ${
            showFilters || activeFilterCount > 0
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          🔽 Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-red-500 hover:underline"
          >
            Clear all
          </button>
        )}
        <p className="text-xs text-gray-400">{filtered.length} transactions</p>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">

          {/* Type */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {['all', 'expense', 'income'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-2 text-sm font-medium transition capitalize ${
                  filterType === type
                    ? type === 'expense' ? 'bg-red-500 text-white'
                    : type === 'income' ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {parentCategories.map(parent => (
                <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
                  <option value={parent.id}>{parent.icon} {parent.name}</option>
                  {subCategories
                    .filter(s => s.parent_id === parent.id)
                    .map(sub => (
                      <option key={sub.id} value={sub.id}>— {sub.icon} {sub.name}</option>
                    ))
                  }
                </optgroup>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date_desc">Date — newest first</option>
              <option value="date_asc">Date — oldest first</option>
              <option value="amount_desc">Amount — highest first</option>
              <option value="amount_asc">Amount — lowest first</option>
            </select>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading && (
          <div className="px-5 py-8 text-center text-gray-400">Loading...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400">
            No transactions found.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {filtered.map(t => (
              <li
                key={t.id}
                onClick={() => navigate(`/edit/${t.id}`)}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                    {t.categories?.icon || '📦'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {t.categories?.name || 'Uncategorised'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t.description || formatDate(t.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${t.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                    {formatAmount(t.amount, t.currency, t.type)}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Transactions