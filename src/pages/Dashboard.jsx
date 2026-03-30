import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Dashboard({ household, session }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dueTemplates, setDueTemplates] = useState([])
  const [confirmingId, setConfirmingId] = useState(null)
  const [confirmAmount, setConfirmAmount] = useState('')

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
      const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
      // Fetch transactions
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, categories (name, icon, color, parent_id)`)
        .eq('household_id', household.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (!error) setTransactions(data)

      // Fetch due recurring templates (only for current month)
      const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
      if (isCurrentMonth) {
        const { data: due } = await supabase
          .from('recurring_templates')
          .select('*, categories(name, icon)')
          .eq('household_id', household.id)
          .eq('is_active', true)
          .lte('next_due_date', endDate)
          .gte('next_due_date', startDate)

        console.log('due templates:', due, 'startDate:', startDate, 'endDate:', endDate)
        if (due) setDueTemplates(due)
      } else {
        setDueTemplates([])
      }

      setLoading(false)
    }

    fetchData()
  }, [household.id, selectedMonth, selectedYear])

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount_base), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount_base), 0)

  const netBalance = totalIncome - totalExpenses

  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const name = t.categories?.name || 'Uncategorised'
      const icon = t.categories?.icon || '📦'
      if (!acc[name]) acc[name] = { name, icon, total: 0 }
      acc[name].total += Number(t.amount_base)
      return acc
    }, {})

  const categoryList = Object.values(categoryTotals).sort((a, b) => b.total - a.total)

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

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const handleConfirmRecurring = async (tmpl) => {
    const amount = parseFloat(confirmAmount) || parseFloat(tmpl.amount)

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        household_id: household.id,
        category_id: tmpl.category_id,
        created_by: session.user.id,
        type: tmpl.type,
        date: tmpl.next_due_date,
        description: tmpl.description,
        amount: amount,
        currency: tmpl.currency,
        exchange_rate: 1,
        amount_base: amount,
        is_recurring: true,
        recurring_id: tmpl.id
      })

    if (insertError) return

    // Compute next due date
    const next = new Date(tmpl.next_due_date)
    if (tmpl.frequency === 'weekly') next.setDate(next.getDate() + 7)
    else if (tmpl.frequency === 'biweekly') next.setDate(next.getDate() + 14)
    else if (tmpl.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
    else if (tmpl.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)

    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`

    await supabase
      .from('recurring_templates')
      .update({ next_due_date: nextStr })
      .eq('id', tmpl.id)

    setConfirmingId(null)
    setConfirmAmount('')
    setDueTemplates(prev => prev.filter(t => t.id !== tmpl.id))

    // Re-fetch transactions
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name, icon, color, parent_id)')
      .eq('household_id', household.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
    if (data) setTransactions(data)
  }

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
        <button onClick={goToPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">←</button>
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
        <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">→</button>
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

      {/* Due recurring transactions */}
      {dueTemplates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200">
            <h2 className="font-semibold text-amber-800 text-sm">
              🔔 {dueTemplates.length} recurring transaction{dueTemplates.length > 1 ? 's' : ''} due this month
            </h2>
          </div>
          <ul className="divide-y divide-amber-100">
            {dueTemplates.map(tmpl => (
              <li key={tmpl.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tmpl.categories?.icon || '📦'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tmpl.description}</p>
                      <p className="text-xs text-gray-400">Due {tmpl.next_due_date}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${tmpl.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                    {tmpl.type === 'expense' ? '-' : '+'}{formatBase(tmpl.amount)}
                  </p>
                </div>

                {confirmingId === tmpl.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      value={confirmAmount}
                      onChange={(e) => setConfirmAmount(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleConfirmRecurring(tmpl)}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setConfirmingId(null); setConfirmAmount('') }}
                      className="border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm px-3 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { setConfirmingId(tmpl.id); setConfirmAmount(tmpl.amount.toString()) }}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition"
                    >
                      Log it
                    </button>
                    <button
                      onClick={() => setDueTemplates(prev => prev.filter(t => t.id !== tmpl.id))}
                      className="border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm px-4 py-2 rounded-lg transition"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  <p className="text-sm font-semibold text-red-500">-{formatBase(cat.total)}</p>
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