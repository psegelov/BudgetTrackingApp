import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const COLORS = ['#3b82f6','#f59e0b','#ef4444','#22c55e','#8b5cf6','#06b6d4','#f97316','#ec4899']

function SummaryCards({ totalIncome, totalExpenses, netBalance, formatBase }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-xs text-gray-400 mb-1">Income</p>
        <p className="text-sm md:text-lg font-bold text-green-500">{formatBase(totalIncome)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-xs text-gray-400 mb-1">Expenses</p>
        <p className="text-sm md:text-lg font-bold text-red-500">{formatBase(totalExpenses)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-xs text-gray-400 mb-1">Net</p>
        <p className={`text-sm md:text-lg font-bold ${netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {netBalance >= 0 ? '+' : ''}{formatBase(netBalance)}
        </p>
      </div>
    </div>
  )
}

function BarChartSection({ monthlyData, selectedYears, formatBase }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-700 mb-4">Monthly Income vs Expenses</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(val) => formatBase(val)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {selectedYears.map((year, i) => (
            <>
              <Bar key={`income_${year}`} dataKey={`income_${year}`} name={selectedYears.length > 1 ? `Income ${year}` : 'Income'} fill={i === 0 ? '#22c55e' : '#86efac'} />
              <Bar key={`expenses_${year}`} dataKey={`expenses_${year}`} name={selectedYears.length > 1 ? `Expenses ${year}` : 'Expenses'} fill={i === 0 ? '#ef4444' : '#fca5a5'} />
            </>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TrendLineSection({ monthlyData, selectedYears, formatBase }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-700 mb-4">Monthly Trend</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(val) => formatBase(val)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {selectedYears.map((year, i) => (
            <>
              <Line key={`income_${year}`} type="monotone" dataKey={`income_${year}`} name={selectedYears.length > 1 ? `Income ${year}` : 'Income'} stroke={i === 0 ? '#22c55e' : '#86efac'} strokeWidth={2} dot={false} />
              <Line key={`expenses_${year}`} type="monotone" dataKey={`expenses_${year}`} name={selectedYears.length > 1 ? `Expenses ${year}` : 'Expenses'} stroke={i === 0 ? '#ef4444' : '#fca5a5'} strokeWidth={2} dot={false} />
            </>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function CategoryBreakdown({ title, categoriesData, subCategories, transactions, totalExpenses, totalIncome, type, formatBase, formatDate }) {
  const [expandedCategories, setExpandedCategories] = useState([])
  const [expandedSubs, setExpandedSubs] = useState([])

  const toggleCategory = (id) => setExpandedCategories(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  )
  const toggleSub = (id) => setExpandedSubs(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  )
  const getCategoryTransactions = (catId) => transactions.filter(t => t.category_id === catId)
  const getSubTotal = (catId) => transactions.filter(t => t.category_id === catId).reduce((sum, t) => sum + Number(t.amount_base), 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700">{title}</h2>
      </div>
      {categoriesData.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">No data.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">% of {type === 'expense' ? 'Exp' : 'Inc'}</th>
                {type === 'expense' && <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">% of Inc</th>}
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {categoriesData.map((cat, i) => {
                const isCatExpanded = expandedCategories.includes(cat.id)
                const subs = subCategories.filter(s => s.parent_id === cat.id).map(s => ({ ...s, total: getSubTotal(s.id) })).filter(s => s.total > 0).sort((a, b) => b.total - a.total)
                const directTx = getCategoryTransactions(cat.id)
                const hasChildren = subs.length > 0 || directTx.length > 0

                return (
                  <>
                    <tr key={cat.id} className={`border-b border-gray-50 ${hasChildren ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={() => hasChildren && toggleCategory(cat.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span>{cat.icon}</span>
                          <span className="font-medium text-gray-800">{cat.name}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>{formatBase(cat.total)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {type === 'expense' ? (totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0) : (totalIncome > 0 ? Math.round((cat.total / totalIncome) * 100) : 0)}%
                      </td>
                      {type === 'expense' && <td className="px-4 py-3 text-right text-gray-500 text-xs">{totalIncome > 0 ? Math.round((cat.total / totalIncome) * 100) : 0}%</td>}
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{hasChildren ? (isCatExpanded ? '▼' : '▶') : ''}</td>
                    </tr>

                    {isCatExpanded && subs.map(sub => {
                      const isSubExpanded = expandedSubs.includes(sub.id)
                      const subTx = getCategoryTransactions(sub.id)
                      return (
                        <>
                          <tr key={sub.id} className="border-b border-gray-50 bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => subTx.length > 0 && toggleSub(sub.id)}>
                            <td className="px-4 py-2.5 pl-10">
                              <div className="flex items-center gap-2">
                                <span>{sub.icon}</span>
                                <span className="text-gray-700">{sub.name}</span>
                              </div>
                            </td>
                            <td className={`px-4 py-2.5 text-right font-medium text-xs ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>{formatBase(sub.total)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                              {type === 'expense' ? (totalExpenses > 0 ? Math.round((sub.total / totalExpenses) * 100) : 0) : (totalIncome > 0 ? Math.round((sub.total / totalIncome) * 100) : 0)}%
                            </td>
                            {type === 'expense' && <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{totalIncome > 0 ? Math.round((sub.total / totalIncome) * 100) : 0}%</td>}
                            <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{subTx.length > 0 ? (isSubExpanded ? '▼' : '▶') : ''}</td>
                          </tr>
                          {isSubExpanded && subTx.map(t => (
                            <tr key={t.id} className="border-b border-gray-50 bg-blue-50">
                              <td className="px-4 py-2 pl-16">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                                  <span className="text-xs text-gray-600">{t.description || '—'}</span>
                                </div>
                              </td>
                              <td className={`px-4 py-2 text-right text-xs font-medium ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>{formatBase(t.amount_base)}</td>
                              <td className="px-4 py-2 text-right text-xs text-gray-400">
                                {type === 'expense' ? (totalExpenses > 0 ? Math.round((Number(t.amount_base) / totalExpenses) * 100) : 0) : (totalIncome > 0 ? Math.round((Number(t.amount_base) / totalIncome) * 100) : 0)}%
                              </td>
                              {type === 'expense' && <td className="px-4 py-2 text-right text-xs text-gray-400">{totalIncome > 0 ? Math.round((Number(t.amount_base) / totalIncome) * 100) : 0}%</td>}
                              <td></td>
                            </tr>
                          ))}
                        </>
                      )
                    })}

                    {isCatExpanded && subs.length === 0 && directTx.map(t => (
                      <tr key={t.id} className="border-b border-gray-50 bg-blue-50">
                        <td className="px-4 py-2 pl-10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatDate(t.date)}</span>
                            <span className="text-xs text-gray-600">{t.description || '—'}</span>
                          </div>
                        </td>
                        <td className={`px-4 py-2 text-right text-xs font-medium ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>{formatBase(t.amount_base)}</td>
                        <td className="px-4 py-2 text-right text-xs text-gray-400">
                          {type === 'expense' ? (totalExpenses > 0 ? Math.round((Number(t.amount_base) / totalExpenses) * 100) : 0) : (totalIncome > 0 ? Math.round((Number(t.amount_base) / totalIncome) * 100) : 0)}%
                        </td>
                        {type === 'expense' && <td className="px-4 py-2 text-right text-xs text-gray-400">{totalIncome > 0 ? Math.round((Number(t.amount_base) / totalIncome) * 100) : 0}%</td>}
                        <td></td>
                      </tr>
                    ))}
                  </>
                )
              })}
              <tr className="border-t-2 border-gray-200">
                <td className="px-4 py-3 font-semibold text-gray-700">Total</td>
                <td className={`px-4 py-3 text-right font-bold ${type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>{formatBase(categoriesData.reduce((sum, c) => sum + c.total, 0))}</td>
                <td className="px-4 py-3 text-right text-gray-500 font-medium text-xs">100%</td>
                {type === 'expense' && <td className="px-4 py-3 text-right text-gray-500 font-medium text-xs">{totalIncome > 0 ? Math.round((categoriesData.reduce((sum, c) => sum + c.total, 0) / totalIncome) * 100) : 0}%</td>}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MonthlyAverages({ expenseCategories, incomeCategories, totalExpenses, totalIncome, monthsWithData, formatBase }) {
  const [view, setView] = useState('all')
  const categories = view === 'expense' ? expenseCategories : view === 'income' ? incomeCategories : [...expenseCategories, ...incomeCategories]
  const total = view === 'expense' ? totalExpenses : view === 'income' ? totalIncome : totalExpenses + totalIncome

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Monthly Averages</h2>
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
          {monthsWithData} month{monthsWithData !== 1 ? 's' : ''} with data
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Avg monthly expenses</p>
          <p className="text-base font-bold text-red-500">{formatBase(totalExpenses / monthsWithData)}</p>
          <p className="text-xs text-gray-400 mt-1">Total: {formatBase(totalExpenses)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Avg monthly income</p>
          <p className="text-base font-bold text-green-500">{formatBase(totalIncome / monthsWithData)}</p>
          <p className="text-xs text-gray-400 mt-1">Total: {formatBase(totalIncome)}</p>
        </div>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-4">
        {['all', 'expense', 'income'].map(type => (
          <button key={type} onClick={() => setView(type)}
            className={`flex-1 py-2 text-xs font-medium transition ${
              view === type
                ? type === 'expense' ? 'bg-red-500 text-white'
                : type === 'income' ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}>
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[280px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-medium text-gray-400">Category</th>
              <th className="text-right py-2 text-xs font-medium text-gray-400">Total</th>
              <th className="text-right py-2 text-xs font-medium text-gray-400">Avg/mo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map(cat => (
              <tr key={cat.id}>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-gray-700 text-xs">{cat.name}</span>
                  </div>
                </td>
                <td className={`py-2.5 text-right font-medium text-xs ${cat.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>{formatBase(cat.total)}</td>
                <td className="py-2.5 text-right text-gray-600 font-medium text-xs">{formatBase(cat.total / monthsWithData)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="py-2.5 font-semibold text-gray-700 text-xs">Total</td>
              <td className={`py-2.5 text-right font-bold text-xs ${view === 'income' ? 'text-green-500' : 'text-red-500'}`}>{formatBase(total)}</td>
              <td className="py-2.5 text-right font-bold text-gray-700 text-xs">{formatBase(total / monthsWithData)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function CategoryBarChart({ transactions, categories, subCategories, formatBase }) {
  const [chartType, setChartType] = useState('expense')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSub, setSelectedSub] = useState('')

  const parentCategories = categories.filter(c => c.type === chartType && !c.parent_id)
  const availableSubs = subCategories.filter(s => s.parent_id === selectedCategory)

  const chartData = MONTHS.map((month, i) => {
    let monthTx = transactions.filter(t => new Date(t.date).getMonth() === i && t.type === chartType)
    if (selectedSub) monthTx = monthTx.filter(t => t.category_id === selectedSub)
    else if (selectedCategory) {
      const subs = subCategories.filter(s => s.parent_id === selectedCategory).map(s => s.id)
      monthTx = monthTx.filter(t => t.category_id === selectedCategory || subs.includes(t.category_id))
    }
    return { month, amount: monthTx.reduce((sum, t) => sum + Number(t.amount_base), 0) }
  })

  const monthsWithData = chartData.filter(d => d.amount > 0).length || 1
  const total = chartData.reduce((sum, d) => sum + d.amount, 0)
  const average = total / monthsWithData

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="font-semibold text-gray-700 mb-4">Monthly Breakdown</h2>
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button onClick={() => { setChartType('expense'); setSelectedCategory(''); setSelectedSub('') }}
            className={`px-3 py-1.5 text-xs font-medium transition ${chartType === 'expense' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            Expenses
          </button>
          <button onClick={() => { setChartType('income'); setSelectedCategory(''); setSelectedSub('') }}
            className={`px-3 py-1.5 text-xs font-medium transition ${chartType === 'income' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            Income
          </button>
        </div>
        <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSub('') }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All categories</option>
          {parentCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        {selectedCategory && availableSubs.length > 0 && (
          <select value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All subcategories</option>
            {availableSubs.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Avg per active month: <span className="font-semibold text-gray-600">{formatBase(average)}</span>
        <span className="ml-2 text-gray-300">({monthsWithData} month{monthsWithData !== 1 ? 's' : ''})</span>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(val) => formatBase(val)} />
          <ReferenceLine y={average} stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2}
            label={{ value: `Avg: ${formatBase(average)}`, position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }} />
          <Bar dataKey="amount" name={chartType === 'expense' ? 'Expenses' : 'Income'}
            fill={chartType === 'expense' ? '#ef4444' : '#22c55e'} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Analytics({ household }) {
  const now = new Date()
  const [selectedYears, setSelectedYears] = useState([now.getFullYear()])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [availableYears, setAvailableYears] = useState([now.getFullYear()])

  useEffect(() => {
    const fetchYears = async () => {
      const { data } = await supabase.from('transactions').select('date').eq('household_id', household.id)
      if (data) {
        const years = [...new Set(data.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a)
        if (years.length > 0) { setAvailableYears(years); setSelectedYears([years[0]]) }
      }
    }
    fetchYears()
  }, [household.id])

  useEffect(() => { fetchData() }, [household.id, selectedYears, selectedMonths])

  const fetchData = async () => {
    setLoading(true)
    const minYear = Math.min(...selectedYears)
    const maxYear = Math.max(...selectedYears)
    const [{ data: txData }, { data: catData }] = await Promise.all([
      supabase.from('transactions').select('*, categories(name, icon, color, parent_id)').eq('household_id', household.id).gte('date', `${minYear}-01-01`).lte('date', `${maxYear}-12-31`).order('date', { ascending: false }),
      supabase.from('categories').select('id, name, icon, color, parent_id, type').eq('household_id', household.id).eq('is_active', true).order('sort_order')
    ])
    if (txData) setTransactions(txData)
    if (catData) setCategories(catData)
    setLoading(false)
  }

  const toggleYear = (year) => setSelectedYears(prev => prev.includes(year) ? prev.length > 1 ? prev.filter(y => y !== year) : prev : [...prev, year].sort())
  const toggleMonth = (i) => setSelectedMonths(prev => prev.includes(i) ? prev.filter(m => m !== i) : [...prev, i])

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const filteredTx = transactions.filter(t => {
    const d = new Date(t.date)
    if (!selectedYears.includes(d.getFullYear())) return false
    if (selectedMonths.length > 0 && !selectedMonths.includes(d.getMonth())) return false
    return true
  })

  const expenses = filteredTx.filter(t => t.type === 'expense')
  const income = filteredTx.filter(t => t.type === 'income')
  const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount_base), 0)
  const totalIncome = income.reduce((sum, t) => sum + Number(t.amount_base), 0)
  const netBalance = totalIncome - totalExpenses

  const parentCategories = categories.filter(c => !c.parent_id)
  const subCategories = categories.filter(c => c.parent_id)

  const getSubTotal = (catId, txList) => txList.filter(t => t.category_id === catId).reduce((sum, t) => sum + Number(t.amount_base), 0)
  const getCategoryTotal = (catId, txList) => {
    const subs = subCategories.filter(s => s.parent_id === catId).map(s => s.id)
    return txList.filter(t => t.category_id === catId || subs.includes(t.category_id)).reduce((sum, t) => sum + Number(t.amount_base), 0)
  }

  const expenseCategories = parentCategories.filter(c => c.type === 'expense').map(c => ({ ...c, total: getCategoryTotal(c.id, expenses) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  const incomeCategories = parentCategories.filter(c => c.type === 'income').map(c => ({ ...c, total: getCategoryTotal(c.id, income) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  const subCategoriesWithTotals = subCategories.map(s => ({ ...s, computedTotal: getSubTotal(s.id, s.type === 'expense' ? expenses : income) }))

  const monthlyData = MONTHS.map((month, i) => {
    const result = { month }
    selectedYears.forEach(year => {
      const monthTx = transactions.filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === i })
      result[`income_${year}`] = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_base), 0)
      result[`expenses_${year}`] = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_base), 0)
    })
    return result
  })

  const monthsWithData = new Set(filteredTx.map(t => { const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` })).size || 1

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Year</p>
          <div className="flex gap-2 flex-wrap">
            {availableYears.map(year => (
              <button key={year} onClick={() => toggleYear(year)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${selectedYears.includes(year) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {year}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Month
            {selectedMonths.length > 0 && <button onClick={() => setSelectedMonths([])} className="ml-2 text-blue-600 hover:underline font-normal">Clear</button>}
          </p>
          <div className="flex gap-1 flex-wrap">
            {MONTHS.map((m, i) => (
              <button key={i} onClick={() => toggleMonth(i)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition ${selectedMonths.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <SummaryCards totalIncome={totalIncome} totalExpenses={totalExpenses} netBalance={netBalance} formatBase={formatBase} />
      <BarChartSection monthlyData={monthlyData} selectedYears={selectedYears} formatBase={formatBase} />
      <TrendLineSection monthlyData={monthlyData} selectedYears={selectedYears} formatBase={formatBase} />
      <CategoryBreakdown title="Expenses by Category" categoriesData={expenseCategories} subCategories={subCategoriesWithTotals} transactions={expenses} totalExpenses={totalExpenses} totalIncome={totalIncome} type="expense" formatBase={formatBase} formatDate={formatDate} />
      <CategoryBreakdown title="Income by Category" categoriesData={incomeCategories} subCategories={subCategoriesWithTotals} transactions={income} totalExpenses={totalExpenses} totalIncome={totalIncome} type="income" formatBase={formatBase} formatDate={formatDate} />
      <MonthlyAverages expenseCategories={expenseCategories} incomeCategories={incomeCategories} totalExpenses={totalExpenses} totalIncome={totalIncome} monthsWithData={monthsWithData} formatBase={formatBase} />
      <CategoryBarChart transactions={filteredTx} categories={categories} subCategories={subCategories} formatBase={formatBase} />
    </div>
  )
}

export default Analytics