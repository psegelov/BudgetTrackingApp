import { supabase } from './supabase'

const BASE_CURRENCY = 'ILS'

export const getExchangeRate = async (fromCurrency, toCurrency = BASE_CURRENCY, date = null) => {
  if (fromCurrency === toCurrency) return 1

  console.log('getExchangeRate called:', fromCurrency, toCurrency, date)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const targetDate = date || todayStr

  // Check if rate already exists for that date
  const { data: existing } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .eq('date', targetDate)
    .maybeSingle()

  if (existing) return existing.rate

  // Fetch from API for that specific date
  try {
    const isToday = targetDate === todayStr
    const url = isToday
      ? `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`
      : `https://api.frankfurter.app/${targetDate}?from=${fromCurrency}&to=${toCurrency}`

    const response = await fetch(url)
    const data = await response.json()
    const rate = data.rates[toCurrency]
    console.log('API response:', data, 'rate:', rate)

    if (!rate) return null

    await supabase
      .from('exchange_rates')
      .upsert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate,
        date: targetDate
      })

    return rate
  } catch (err) {
    console.error('Exchange rate fetch failed:', err)
    return null
  }
}