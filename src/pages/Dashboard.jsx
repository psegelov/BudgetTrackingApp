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
        .select(`
          *,
          categories (name, icon, color)
        `)
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
    return `${sign}${symbol}${amount.toLocaleString()}`
  }

  return (
    <div>
      <div>
        <h1>Dashboard</h1>
        <button onClick={() => navigate('/add')}>+ Add Transaction</button>
      </div>

      <h2>Recent Transactions</h2>

      {loading && <p>Loading...</p>}

      {!loading && transactions.length === 0 && (
        <p>No transactions yet. Add your first one!</p>
      )}

      {!loading && transactions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr
                key={t.id}
                onClick={() => navigate(`/edit/${t.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>{new Date(t.date).toLocaleDateString()}</td>
                <td>{t.categories?.icon} {t.categories?.name ?? 'Uncategorised'}</td>
                <td>{t.description || '—'}</td>
                <td style={{ color: t.type === 'expense' ? 'red' : 'green' }}>
                  {formatAmount(t.amount, t.currency, t.type)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Dashboard