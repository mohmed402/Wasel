/**
 * Client-side helpers for financial admin UI (mirrors server/financialExchangeRates convertAmount).
 */

export function convertToBaseAmount(amount, fromCurrency, baseCurrency, toLYD) {
  const from = String(fromCurrency || '').toUpperCase()
  const base = String(baseCurrency || '').toUpperCase()
  const a = parseFloat(amount)
  if (!Number.isFinite(a)) return 0
  if (from === base) return a
  const f = toLYD?.[from]
  const b = toLYD?.[base]
  if (!f || !b || f <= 0 || b <= 0) return a
  return a * (f / b)
}

/**
 * Pair transfer legs (out then in) so net internal transfer is ~0 in period totals.
 * Groups by transaction_date + amount_in_base_currency; odd rows get sign 0.
 */
export function buildTransferSignMap(transactions) {
  const map = {}
  const transfers = transactions.filter((t) => t.transaction_type === 'transfer')
  const byKey = new Map()
  for (const t of transfers) {
    const base = parseFloat(t.amount_in_base_currency)
    const k = `${t.transaction_date}|${Number.isFinite(base) ? base.toFixed(4) : '0'}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(t)
  }
  for (const arr of byKey.values()) {
    arr.sort((a, b) => {
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0
      if (ca !== cb) return ca - cb
      return String(a.id).localeCompare(String(b.id))
    })
    for (let i = 0; i < arr.length; i++) {
      map[arr[i].id] = i % 2 === 0 ? -1 : 1
    }
  }
  return map
}

/**
 * Signed flow in base currency using posted ledger amounts.
 */
export function signedAmountInBase(tx, transferSignMap) {
  const raw = parseFloat(tx.amount_in_base_currency)
  if (!Number.isFinite(raw)) return 0
  const abs = Math.abs(raw)
  if (tx.transaction_type === 'credit') return abs
  if (tx.transaction_type === 'debit') return -abs
  if (tx.transaction_type === 'transfer') {
    const s = transferSignMap[tx.id] ?? 0
    return s * abs
  }
  return 0
}

/**
 * Aggregate period flows using amount_in_base_currency.
 */
export function aggregateTransactionsPostedBase(transactions) {
  const transferSignMap = buildTransferSignMap(transactions)
  return transactions.reduce(
    (acc, tx) => {
      const flow = signedAmountInBase(tx, transferSignMap)
      const isCredit = flow >= 0
      acc.totalCredits += isCredit ? flow : 0
      acc.totalDebits += !isCredit ? Math.abs(flow) : 0
      acc.netFlow += flow
      acc.count += 1
      return acc
    },
    { totalCredits: 0, totalDebits: 0, netFlow: 0, count: 0 }
  )
}
