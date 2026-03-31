import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Analytics({ household }) {
  const now = new Date()
  const [selectedYears, setSelectedYears] = useState([now.getFullYear()])
  const [selectedMonth, setSelectedMonth] = useState(null) // null = all months
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubCategory, setFilterSubCategory] = useState('')

  const availableYears = Array.from(
    { length: 5 },
    (_, i) => now.getFullYear() - i
  )

  useEffect(() => {
    fetchData()
  }, [household.id, selectedYears, selectedMonth])

  const fetchData = async () => {
    setLoading(true)

    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)

    let startDate = `${minYear}-01-01`
    let endDate = `${maxYear}-12-31`

    if (selectedMonth !== null && selectedYears.length === 1) {
      const lastDay = new Date(selectedYears[0], selectedMonth + 1, 0)
      startDate = `${selectedYears[0]}-${String(selectedMonth + 1).padStart(2, '0')}-01`
      endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    }

    const [{ data: txData }, { data: catData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, categories(name, icon, color, parent_id)')
        .eq('household_id', household.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name, icon, color, parent_id, type')
        .eq('household_id', household.id)
        .eq('is_active', true)
        .order('sort_order')
    ])

    if (txData) setTransactions(txData)
    if (catData) setCategories(catData)
    setLoading(false)
  }

  const toggleYear = (year) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.length > 1 ? prev.filter(y => y !== year) : prev
        : [...prev, year].sort()
    )
  }

  const toggleExpandCategory = (id) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  // Filter transactions by selected years
  const filteredTx = transactions.filter(t => {
    const year = new Date(t.date).getFullYear()
    return selectedYears.includes(year)
  })

  const expenses = filteredTx.filter(t => t.type === 'expense')
  const income = filteredTx.filter(t => t.type === 'income')

  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount_base), 0)
  const totalIncome = income.reduce((sum, t) => sum + Number(t.amount_base), 0)
  const netBalance = totalIncome - totalExpenses

  // Monthly data for charts
  const monthlyData = MONTHS.map((month, i) => {
    const result = { month }
    selectedYears.forEach(year => {
      const monthTx = filteredTx.filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() === i
      })
      result[`income_${year}`] = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_base), 0)
      result[`expenses_${year}`] = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_base), 0)
    })
    return result
  })

  // Category breakdowns
  const parentCategories = categories.filter(c => !c.parent_id)
  const subCategories = categories.filter(c => c.parent_id)

  const getCategoryTotal = (catId, txList) => {
    const subs = subCategories.filter(s => s.parent_id === catId).map(s => s.id)
    return txList
      .filter(t => t.category_id === catId || subs.includes(t.category_id))
      .reduce((sum, t) => sum + Number(t.amount_base), 0)
  }

  const getSubCategoryTotal = (catId, txList) => {
    return txList
      .filter(t => t.category_id === catId)
      .reduce((sum, t) => sum + Number(t.amount_base), 0)
  }

  const expenseCategories = parentCategories
    .filter(c => c.type === 'expense')
    .map(c => ({ ...c, total: getCategoryTotal(c.id, expenses) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const incomeCategories = parentCategories
    .filter(c => c.type === 'income')
    .map(c => ({ ...c, total: getCategoryTotal(c.id, income) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  // Average monthly expenses
  const monthsWithData = selectedYears.length * 12
  const avgMonthlyExpense = totalExpenses / monthsWithData

  // Filtered transactions table
  const tableExpenses = expenses.filter(t => {
    if (filterCategory && t.category_id !== filterCategory) {
      const subs = subCategories.filter(s => s.parent_id === filterCategory).map(s => s.id)
      if (!subs.includes(t.category_id)) return false
    }
    if (filterSubCategory && t.category_id !== filterSubCategory) return false
    return true
  })

  const tableIncome = income.filter(t => {
    if (filterCategory && t.category_id !== filterCategory) {
      const subs = subCategories.filter(s => s.parent_id === filterCategory).map(s => s.id)
      if (!subs.includes(t.category_id)) return false
    }
    if (filterSubCategory && t.category_id !== filterSubCategory) return false
    return true
  })

  const COLORS = ['#3b82f6','#f59e0b','#ef4444','#22c55e','#8b5cf6','#06b6d4','#f97316','#ec4899']

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>

      {/* Year selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Year</p>
            <div className="flex gap-2 flex-wrap">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedYears.includes(year)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {selectedYears.length === 1 && (
            <div className="ml-auto">
              <p className="text-xs font-medium text-gray-500 mb-2">Month</p>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setSelectedMonth(null)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                    selectedMonth === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {MONTHS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                      selectedMonth === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Income</p>
          <p className="text-lg font-bold text-green-500">{formatBase(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Expenses</p>
          <p className="text-lg font-bold text-red-500">{formatBase(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Net</p>
          <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {netBalance >= 0 ? '+' : ''}{formatBase(netBalance)}
          </p>
        </div>
      </div>

      {/* Bar chart — hidden when specific month selected */}
      {selectedMonth === null && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Monthly Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val) => formatBase(val)} />
              <Legend />
              {selectedYears.map((year, i) => (
                <>
                  <Bar key={`income_${year}`} dataKey={`income_${year}`} name={`Income ${year}`} fill="#22c55e" opacity={i === 0 ? 1 : 0.5} />
                  <Bar key={`expenses_${year}`} dataKey={`expenses_${year}`} name={`Expenses ${year}`} fill="#ef4444" opacity={i === 0 ? 1 : 0.5} />
                </>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend line — hidden when specific month selected */}
      {selectedMonth === null && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val) => formatBase(val)} />
              <Legend />
              {selectedYears.map((year, i) => (
                <>
                  <Line key={`income_${year}`} type="monotone" dataKey={`income_${year}`} name={`Income ${year}`} stroke="#22c55e" strokeWidth={2} dot={false} opacity={i === 0 ? 1 : 0.5} />
                  <Line key={`expenses_${year}`} type="monotone" dataKey={`expenses_${year}`} name={`Expenses ${year}`} stroke="#ef4444" strokeWidth={2} dot={false} opacity={i === 0 ? 1 : 0.5} />
                </>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expense categories breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Expenses by Category</h2>
        </div>
        <ul className="divide-y divide-gray-50 px-5">
          {expenseCategories.length === 0 && (
            <li className="py-6 text-center text-gray-400 text-sm">No expense data.</li>
          )}
          {expenseCategories.map((cat, i) => {
            const isExpanded = expandedCategories.includes(cat.id)
            const subs = subCategories
              .filter(s => s.parent_id === cat.id)
              .map(s => ({ ...s, total: getSubCategoryTotal(s.id, expenses) }))
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)

            return (
              <li key={cat.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    {subs.length > 0 && (
                      <button
                        onClick={() => toggleExpandCategory(cat.id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-500">{formatBase(cat.total)}</p>
                    <p className="text-xs text-gray-400">
                      {totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0}% of expenses
                    </p>
                  </div>
                </div>
                {isExpanded && subs.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-2 pl-10 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{sub.icon}</span>
                      <span className="text-sm text-gray-600">{sub.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{formatBase(sub.total)}</p>
                      <p className="text-xs text-gray-400">
                        {totalExpenses > 0 ? Math.round((sub.total / totalExpenses) * 100) : 0}% of expenses
                      </p>
                    </div>
                  </div>
                ))}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Income categories breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Income by Category</h2>
        </div>
        <ul className="divide-y divide-gray-50 px-5">
          {incomeCategories.length === 0 && (
            <li className="py-6 text-center text-gray-400 text-sm">No income data.</li>
          )}
          {incomeCategories.map((cat, i) => {
            const isExpanded = expandedCategories.includes(`inc_${cat.id}`)
            const subs = subCategories
              .filter(s => s.parent_id === cat.id)
              .map(s => ({ ...s, total: getSubCategoryTotal(s.id, income) }))
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)

            return (
              <li key={cat.id}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    {subs.length > 0 && (
                      <button
                        onClick={() => toggleExpandCategory(`inc_${cat.id}`)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-500">{formatBase(cat.total)}</p>
                    <p className="text-xs text-gray-400">
                      {totalIncome > 0 ? Math.round((cat.total / totalIncome) * 100) : 0}% of income
                    </p>
                  </div>
                </div>
                {isExpanded && subs.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-2 pl-10 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{sub.icon}</span>
                      <span className="text-sm text-gray-600">{sub.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{formatBase(sub.total)}</p>
                      <p className="text-xs text-gray-400">
                        {totalIncome > 0 ? Math.round((sub.total / totalIncome) * 100) : 0}% of income
                      </p>
                    </div>
                  </div>
                ))}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Averages */}
      {selectedMonth === null && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Monthly Averages</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Avg monthly expenses</p>
              <p className="text-lg font-bold text-red-500">{formatBase(avgMonthlyExpense)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">Avg monthly income</p>
              <p className="text-lg font-bold text-green-500">{formatBase(totalIncome / monthsWithData)}</p>
            </div>
          </div>
          <div className="space-y-3">
            {expenseCategories.map(cat => {
              const avg = cat.total / monthsWithData
              return (
                <div key={cat.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{formatBase(avg)}/mo</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transactions table filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Filter Transactions</h2>
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setFilterSubCategory('') }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All categories</option>
            {parentCategories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          {filterCategory && subCategories.filter(s => s.parent_id === filterCategory).length > 0 && (
            <select
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All subcategories</option>
              {subCategories.filter(s => s.parent_id === filterCategory).map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          )}
          {(filterCategory || filterSubCategory) && (
            <button
              onClick={() => { setFilterCategory(''); setFilterSubCategory('') }}
              className="text-xs text-red-500 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expenses table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Expenses</h2>
          <span className="text-xs text-gray-400">{tableExpenses.length} transactions</span>
        </div>
        {tableExpenses.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">No expenses found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">% of total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableExpenses.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-5 py-3 text-gray-700">{t.description || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {t.categories?.icon} {t.categories?.name || 'Uncategorised'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-red-500">
                      -{formatBase(t.amount_base)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {totalExpenses > 0 ? Math.round((Number(t.amount_base) / totalExpenses) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-red-500">
                    -{formatBase(tableExpenses.reduce((sum, t) => sum + Number(t.amount_base), 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Income table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Income</h2>
          <span className="text-xs text-gray-400">{tableIncome.length} transactions</span>
        </div>
        {tableIncome.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">No income found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Amount</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">% of total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableIncome.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="px-5 py-3 text-gray-700">{t.description || '—'}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {t.categories?.icon} {t.categories?.name || 'Uncategorised'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-green-500">
                      +{formatBase(t.amount_base)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">
                      {totalIncome > 0 ? Math.round((Number(t.amount_base) / totalIncome) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-green-500">
                    +{formatBase(tableIncome.reduce((sum, t) => sum + Number(t.amount_base), 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

export default Analytics