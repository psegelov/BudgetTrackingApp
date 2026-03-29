import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Dashboard({ household }) {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`*, categories (name, icon, color)`)
        .eq('household_id', household.id)
        .order('date', { ascending: false })
        .limit(20)

      if (!error) setTransactions(data)
      setLoading(false)
    }

    fetchTransactions()
  }, [household.id])

  const formatAmount = (amount, currency, type) => {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€'
    const sign = type === 'expense' ? '-' : '+'
    return `${sign}${symbol}${Number(amount).toLocaleString()}`
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
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

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Transactions</h2>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center text-gray-400">Loading...</div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="px-5 py-8 text-center text-gray-400">
            No transactions yet. Add your first one!
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
                {/* Left side */}
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

                {/* Right side */}
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