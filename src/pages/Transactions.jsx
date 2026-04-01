import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Icons = {
  filter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18M7 8h10M11 12h2M11 16h2"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>,
}

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
      const { data } = await supabase.from('categories').select('id, name, icon, parent_id, type')
        .eq('household_id', household.id).eq('is_active', true).order('sort_order')
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

  const handleExportCSV = () => {
    if (filtered.length === 0) return
    const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Description', 'Amount', 'Currency', 'Amount (Base)']
    const rows = filtered.map(t => {
      const isSubCat = t.categories?.parent_id
      const parentCat = isSubCat ? categories.find(c => c.id === t.categories?.parent_id) : null
      return [
        new Date(t.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
        t.type, parentCat?.name || t.categories?.name || 'Uncategorised',
        isSubCat ? t.categories?.name : '', t.description || '',
        t.amount, t.currency, t.amount_base
      ]
    })
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle = { width: '100%', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', fontSize: '13.5px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '5px' }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Transactions</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {filtered.length > 0 && (
            <button onClick={handleExportCSV}
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
              Export CSV
            </button>
          )}
          <button onClick={() => navigate('/add')}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input type="text" placeholder="Search by description or category..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: '16px' }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,101,52,0.1)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
            borderRadius: '8px', border: `1px solid ${showFilters || activeFilterCount > 0 ? 'var(--primary)' : 'var(--border)'}`,
            background: showFilters || activeFilterCount > 0 ? 'var(--primary-light)' : 'var(--surface)',
            color: showFilters || activeFilterCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '13px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer'
          }}>
          <span style={{ width: '14px', height: '14px' }}>{Icons.filter}</span>
          Filters
          {activeFilterCount > 0 && (
            <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: '8px', border: '1px solid #fca5a5', background: 'none', color: 'var(--red)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
            <span style={{ width: '13px', height: '13px' }}>{Icons.x}</span>
            Remove filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-subtle)' }}>{filtered.length} transactions</span>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Type */}
          <div>
            <div style={labelStyle}>Type</div>
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border)' }}>
              {['all', 'expense', 'income'].map(type => (
                <button key={type} onClick={() => setFilterType(type)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: '6px', border: 'none', fontSize: '13px',
                    fontWeight: '500', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                    background: filterType === type ? (type === 'expense' ? 'var(--red)' : type === 'income' ? 'var(--accent)' : 'var(--primary)') : 'transparent',
                    color: filterType === type ? 'white' : 'var(--text-muted)'
                  }}>
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <div style={labelStyle}>
              Categories {selectedCategories.length > 0 && <span style={{ color: 'var(--primary)' }}>({selectedCategories.length} selected)</span>}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <button type="button" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'none', border: 'none', fontSize: '13.5px', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
                <span>{selectedCategories.length === 0 ? 'All categories' : `${selectedCategories.length} selected`}</span>
                <span style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }}>{showCategoryDropdown ? Icons.chevronDown : Icons.chevronRight}</span>
              </button>
              {showCategoryDropdown && (
                <div style={{ borderTop: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto' }}>
                  {parentCategories.map(parent => {
                    const subs = getSubsForParent(parent.id)
                    const isExpanded = expandedParents.includes(parent.id)
                    const isSelected = isParentSelected(parent.id)
                    const isPartial = isParentPartial(parent.id)
                    return (
                      <div key={parent.id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: isSelected ? 'var(--primary-light)' : 'transparent' }}>
                          {subs.length > 0 ? (
                            <button onClick={() => toggleExpand(parent.id)} style={{ width: '14px', height: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, padding: 0 }}>
                              {isExpanded ? Icons.chevronDown : Icons.chevronRight}
                            </button>
                          ) : <div style={{ width: '14px' }} />}
                          <button onClick={() => toggleParent(parent)}
                            style={{ width: '15px', height: '15px', borderRadius: '4px', border: `1px solid ${isSelected ? 'var(--primary)' : isPartial ? 'var(--accent)' : 'var(--border)'}`, background: isSelected ? 'var(--primary)' : isPartial ? 'var(--primary-light)' : 'white', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>
                            {isSelected ? '✓' : isPartial ? '—' : ''}
                          </button>
                          <button onClick={() => toggleParent(parent)} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>{parent.name}</span>
                          </button>
                        </div>
                        {isExpanded && subs.map(sub => {
                          const isSubSelected = selectedCategories.includes(sub.id)
                          return (
                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px 7px 34px', background: isSubSelected ? 'var(--primary-light)' : 'transparent' }}>
                              <button onClick={() => toggleSub(sub.id)}
                                style={{ width: '15px', height: '15px', borderRadius: '4px', border: `1px solid ${isSubSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSubSelected ? 'var(--primary)' : 'white', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>
                                {isSubSelected ? '✓' : ''}
                              </button>
                              <button onClick={() => toggleSub(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>
                                {sub.name}
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

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={labelStyle}>From</div>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={labelStyle}>To</div>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Sort */}
          <div>
            <div style={labelStyle}>Sort by</div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={inputStyle}>
              <option value="date_desc">Date — newest first</option>
              <option value="date_asc">Date — oldest first</option>
              <option value="amount_desc">Amount — highest first</option>
              <option value="amount_asc">Amount — lowest first</option>
            </select>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Income', value: `+${formatBase(totalIncome)}`, color: 'var(--accent)' },
            { label: 'Expenses', value: `-${formatBase(totalExpenses)}`, color: 'var(--red)' },
            { label: 'Net', value: (totalIncome - totalExpenses >= 0 ? '+' : '') + formatBase(totalIncome - totalExpenses), color: totalIncome - totalExpenses >= 0 ? 'var(--accent)' : 'var(--red)' }
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px' }}>
              <p style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{s.label}</p>
              <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {loading && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>Loading...</div>}
        {!loading && filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '14px' }}>No transactions found.</div>}

        {!loading && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Category', 'Subcategory', 'Description', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: i === 4 ? 'right' : 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'DM Sans, sans-serif' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const base = Number(t.amount_base)
                    const isSubCat = t.categories?.parent_id
                    const parentCat = isSubCat ? categories.find(c => c.id === t.categories?.parent_id) : null
                    return (
                      <tr key={t.id} onClick={() => navigate(`/edit/${t.id}`)}
                        style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '13px 20px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                        <td style={{ padding: '13px 20px', color: 'var(--text)', fontWeight: '500' }}>{parentCat?.name || t.categories?.name || 'Uncategorised'}</td>
                        <td style={{ padding: '13px 20px', color: 'var(--text-muted)' }}>{isSubCat ? t.categories?.name : '—'}</td>
                        <td style={{ padding: '13px 20px', color: 'var(--text-muted)' }}>{t.description || '—'}</td>
                        <td style={{ padding: '13px 20px', textAlign: 'right', fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: t.type === 'expense' ? 'var(--red)' : 'var(--accent)' }}>
                          {t.type === 'expense' ? '-' : '+'}{formatBase(base)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td colSpan={4} style={{ padding: '13px 20px', fontWeight: '600', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}>Total</td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: 'var(--text)', fontWeight: '700' }}>{formatBase(totalFiltered)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="md:hidden">
              {filtered.map((t, i) => {
                const base = Number(t.amount_base)
                const isSubCat = t.categories?.parent_id
                const parentCat = isSubCat ? categories.find(c => c.id === t.categories?.parent_id) : null
                return (
                  <li key={t.id} onClick={() => navigate(`/edit/${t.id}`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px' }}>
                        {t.categories?.icon || '📦'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {parentCat?.name || t.categories?.name || 'Uncategorised'}
                          {isSubCat && <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> · {t.categories?.name}</span>}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                          {formatDate(t.date)}{t.description && ` · ${t.description}`}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: t.type === 'expense' ? 'var(--red)' : 'var(--accent)', flexShrink: 0, marginLeft: '8px' }}>
                      {t.type === 'expense' ? '-' : '+'}{formatBase(base)}
                    </p>
                  </li>
                )
              })}
              <li style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', borderTop: '2px solid var(--border)' }}>
                <span style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13.5px' }}>Total</span>
                <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '15px', color: 'var(--text)' }}>{formatBase(totalFiltered)}</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default Transactions