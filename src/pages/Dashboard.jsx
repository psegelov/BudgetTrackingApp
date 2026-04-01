import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Icons = {
  chevronLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
}

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

      const { data, error } = await supabase
        .from('transactions')
        .select(`*, categories (name, icon, color, parent_id)`)
        .eq('household_id', household.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (!error) setTransactions(data)

      const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()
      if (isCurrentMonth) {
        const { data: due } = await supabase
          .from('recurring_templates')
          .select('*, categories(name, icon)')
          .eq('household_id', household.id)
          .eq('is_active', true)
          .lte('next_due_date', endDate)
          .gte('next_due_date', startDate)

        if (due) {
          const autoTemplates = due.filter(t => t.auto_confirm)
          const manualTemplates = due.filter(t => !t.auto_confirm)

          for (const tmpl of autoTemplates) {
            const amount = parseFloat(tmpl.amount)
            await supabase.from('transactions').insert({
              household_id: household.id, category_id: tmpl.category_id,
              created_by: session.user.id, type: tmpl.type, date: tmpl.next_due_date,
              description: tmpl.description, amount, currency: tmpl.currency,
              exchange_rate: 1, amount_base: amount, is_recurring: true, recurring_id: tmpl.id
            })
            const next = new Date(tmpl.next_due_date)
            if (tmpl.frequency === 'weekly') next.setDate(next.getDate() + 7)
            else if (tmpl.frequency === 'biweekly') next.setDate(next.getDate() + 14)
            else if (tmpl.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
            else if (tmpl.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)
            const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
            await supabase.from('recurring_templates').update({ next_due_date: nextStr }).eq('id', tmpl.id)
          }
          setDueTemplates(manualTemplates)
        }
      } else {
        setDueTemplates([])
      }
      setLoading(false)
    }
    fetchData()
  }, [household.id, selectedMonth, selectedYear])

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount_base), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount_base), 0)
  const netBalance = totalIncome - totalExpenses

  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const name = t.categories?.name || 'Uncategorised'
      const icon = t.categories?.icon || null
      if (!acc[name]) acc[name] = { name, icon, total: 0 }
      acc[name].total += Number(t.amount_base)
      return acc
    }, {})

  const categoryList = Object.values(categoryTotals).sort((a, b) => b.total - a.total)

  const formatBase = (amount) => {
    const symbol = household.currency === 'ILS' ? '₪' : household.currency === 'USD' ? '$' : '€'
    return `${symbol}${Number(amount).toLocaleString()}`
  }

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

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
    const { error: insertError } = await supabase.from('transactions').insert({
      household_id: household.id, category_id: tmpl.category_id,
      created_by: session.user.id, type: tmpl.type, date: tmpl.next_due_date,
      description: tmpl.description, amount, currency: tmpl.currency,
      exchange_rate: 1, amount_base: amount, is_recurring: true, recurring_id: tmpl.id
    })
    if (insertError) return

    const next = new Date(tmpl.next_due_date)
    if (tmpl.frequency === 'weekly') next.setDate(next.getDate() + 7)
    else if (tmpl.frequency === 'biweekly') next.setDate(next.getDate() + 14)
    else if (tmpl.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
    else if (tmpl.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1)
    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
    await supabase.from('recurring_templates').update({ next_due_date: nextStr }).eq('id', tmpl.id)

    setConfirmingId(null)
    setConfirmAmount('')
    setDueTemplates(prev => prev.filter(t => t.id !== tmpl.id))

    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    const { data } = await supabase.from('transactions').select('*, categories(name, icon, color, parent_id)')
      .eq('household_id', household.id).gte('date', startDate).lte('date', endDate).order('date', { ascending: false })
    if (data) setTransactions(data)
  }

  // Shared styles
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)' }
  const sectionHeader = { padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const sectionTitle = { fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: 'var(--text)' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Dashboard</h1>
        <button
          onClick={() => navigate('/add')}
          style={{
            background: 'var(--primary)', color: 'white', border: 'none',
            padding: '9px 18px', borderRadius: '8px', fontSize: '13.5px',
            fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer'
          }}
        >
          + Add Transaction
        </button>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={goToPrevMonth} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '16px', height: '16px' }}>{Icons.chevronLeft}</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: 'var(--text)', minWidth: '160px', textAlign: 'center' }}>{monthName}</span>
          {!isCurrentMonth && (
            <button onClick={() => { setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()) }}
              style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Today
            </button>
          )}
        </div>
        <button onClick={goToNextMonth} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '16px', height: '16px' }}>{Icons.chevronRight}</span>
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Income', value: formatBase(totalIncome), color: 'var(--accent)' },
          { label: 'Expenses', value: formatBase(totalExpenses), color: 'var(--red)' },
          { label: 'Net', value: (netBalance >= 0 ? '+' : '') + formatBase(netBalance), color: netBalance >= 0 ? 'var(--accent)' : 'var(--red)' }
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '16px 18px' }}>
            <p style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</p>
            <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '22px', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Due recurring */}
      {dueTemplates.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '16px', height: '16px', color: 'var(--primary)' }}>{Icons.bell}</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
              {dueTemplates.length} recurring transaction{dueTemplates.length > 1 ? 's' : ''} due this month
            </span>
          </div>
          <ul>
            {dueTemplates.map(tmpl => (
              <li key={tmpl.id} style={{ padding: '14px 20px', borderBottom: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                      {tmpl.categories?.icon || '📦'}
                    </div>
                    <div>
                      <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>{tmpl.description}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Due {tmpl.next_due_date}</p>
                    </div>
                  </div>
                  <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: tmpl.type === 'expense' ? 'var(--red)' : 'var(--accent)' }}>
                    {tmpl.type === 'expense' ? '-' : '+'}{formatBase(tmpl.amount)}
                  </p>
                </div>
                {confirmingId === tmpl.id ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={confirmAmount}
                      onChange={(e) => setConfirmAmount(e.target.value)}
                      style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                    />
                    <button onClick={() => handleConfirmRecurring(tmpl)}
                      style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                      Confirm
                    </button>
                    <button onClick={() => { setConfirmingId(null); setConfirmAmount('') }}
                      style={{ background: 'none', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setConfirmingId(tmpl.id); setConfirmAmount(tmpl.amount.toString()) }}
                      style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                      Log it
                    </button>
                    <button onClick={() => setDueTemplates(prev => prev.filter(t => t.id !== tmpl.id))}
                      style={{ background: 'none', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
        <div style={{ ...card, marginBottom: '20px' }}>
          <div style={sectionHeader}>
            <span style={sectionTitle}>Spending by Category</span>
          </div>
          <ul>
            {categoryList.map((cat, i) => (
              <li key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: i < categoryList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: ['var(--primary)', 'var(--accent)', '#4ade80', '#86efac'][i % 4], flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: 'var(--text)' }}>{cat.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: 'var(--red)' }}>-{formatBase(cat.total)}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0}%</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction list */}
      <div style={card}>
        <div style={sectionHeader}>
          <span style={sectionTitle}>Transactions</span>
        </div>
        {loading && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-subtle)' }}>Loading...</div>}
        {!loading && transactions.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '14px' }}>
            No transactions for {monthName}.
          </div>
        )}
        {!loading && transactions.length > 0 && (
          <ul>
            {transactions.map((t, i) => (
              <li key={t.id} onClick={() => navigate(`/edit/${t.id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    {t.categories?.icon || '📦'}
                  </div>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)' }}>{t.categories?.name || 'Uncategorised'}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{t.description || formatDate(t.date)}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: t.type === 'expense' ? 'var(--red)' : 'var(--accent)' }}>
                    {t.type === 'expense' ? '-' : '+'}{formatBase(t.amount)}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>{formatDate(t.date)}</p>
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