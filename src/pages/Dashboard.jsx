import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Dashboard({ household }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)

      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)
        .toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('transactions')
        .select(`*, categories (name, icon, color, parent_id)`)
        .eq('household_id', household.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (!error) setTransactions(data)
      setLoading(false)
    }

    fetchTransactions()
  }, [household.id, selectedMonth, selectedYear])

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount_base), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount_base), 0)

  const netBalance = totalIncome - totalExpenses

  // Group expenses by category
  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const name = t.categories?.name || 'Uncategorised'
      const icon = t.categories?.icon || '📦'
      const key = name
      if (!acc[key]) acc[key] = { name, icon, total: 0 }
      acc[key].total += Number(t.amount_base)
      return acc
    }, {})

  const categoryList = Object.values(categoryTotals)
    .sort((a, b) => b.total - a.total)

  const formatAmount = (amount, currency, type) => {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€'
    const sign = type === 'expense' ? '-' : '+'
    return `${sign}${symbol}${Number(amount).toLocaleString()}`
  }

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const monthName = new Date(selectedYear, selectedMonth).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric'
  })

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={() => navigate('/add')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Add Transaction
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          ←
        </button>
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
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
        >
          →
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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

      {/* Spending by category */}
      {categoryList.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Spending by Category</h2>
          </div>
          <ul className="divide-y divide-gray-50 px-5">
            {categoryList.map(cat => (
              <li key={cat.name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-500">
                    -{formatBase(cat.total)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Transactions</h2>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center text-gray-400">Loading...</div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400">
            No transactions for {monthName}.
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {transactions.map(t => (
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

export default Dashboard