/**
 * Centralized FX helpers for admin financial UI and customer USD display.
 * All "toLYD" values mean: LYD per 1 unit of foreign currency (when base is LYD).
 */

const SUPPORTED = ['EUR', 'USD', 'GBP', 'LYD', 'TRY']

/** Defaults when nothing configured (LYD per unit). */
const DEFAULT_TO_LYD = {
  LYD: 1,
  USD: 6.0,
  EUR: 6.5,
  GBP: 8.0,
  TRY: 0.2,
}

/**
 * @param {number} n
 * @returns {number|null}
 */
function numOrNull(n) {
  const x = typeof n === 'number' ? n : parseFloat(String(n))
  return Number.isFinite(x) && x > 0 ? x : null
}

/**
 * Build LYD-per-unit map from financial_settings row shape.
 * @param {{ base_currency?: string, settings_json?: object }|null} settings
 * @param {{ envUsdFallback?: number }} [opts]
 * @returns {{ baseCurrency: string, toLYD: Record<string, number>, updatedAt: string|null }}
 */
function compileFromFinancialSettings(settings, opts = {}) {
  const envUsd =
    numOrNull(opts.envUsdFallback) ||
    numOrNull(parseFloat(process.env.EXCHANGE_RATE_USD_LYD || '')) ||
    DEFAULT_TO_LYD.USD

  const baseCurrency = (settings?.base_currency || 'LYD').toUpperCase()
  const s = settings?.settings_json && typeof settings.settings_json === 'object'
    ? settings.settings_json
    : {}

  const financialRates = s.financialRates && typeof s.financialRates === 'object' ? s.financialRates : {}
  const legacyExchangeRates = s.exchangeRates && typeof s.exchangeRates === 'object' ? s.exchangeRates : {}

  const usdFromDisplay = numOrNull(s.exchangeRateDisplay)
  const usdFromLegacy = numOrNull(legacyExchangeRates.USD)

  const toLYD = { ...DEFAULT_TO_LYD }

  SUPPORTED.forEach((code) => {
    const v = numOrNull(financialRates[code]) || numOrNull(legacyExchangeRates[code])
    if (v != null) toLYD[code] = v
  })

  toLYD.LYD = 1
  const usdResolved = usdFromDisplay || usdFromLegacy || numOrNull(financialRates.USD) || envUsd
  toLYD.USD = usdResolved

  const updatedAt = settings?.updated_at || null

  return { baseCurrency, toLYD, updatedAt }
}

/**
 * Full cross-rate matrix: matrix[from][to] = units of `to` per 1 unit of `from`.
 * @param {string[]} codes
 * @param {Record<string, number>} toLYD
 */
function buildCrossMatrix(codes, toLYD) {
  const matrix = {}
  codes.forEach((from) => {
    matrix[from] = {}
    const f = toLYD[from]
    codes.forEach((to) => {
      const t = toLYD[to]
      if (f > 0 && t > 0) {
        matrix[from][to] = f / t
      } else {
        matrix[from][to] = from === to ? 1 : 1
      }
    })
  })
  return matrix
}

/**
 * Convert amount from one currency to another using LYD hub.
 */
function convertAmount(amount, fromCurrency, toCurrency, toLYD) {
  const from = String(fromCurrency || '').toUpperCase()
  const to = String(toCurrency || '').toUpperCase()
  if (from === to) return amount
  const a = parseFloat(amount)
  if (!Number.isFinite(a)) return 0
  const f = toLYD[from]
  const t = toLYD[to]
  if (!f || !t) return a
  return a * (f / t)
}

module.exports = {
  SUPPORTED,
  DEFAULT_TO_LYD,
  compileFromFinancialSettings,
  buildCrossMatrix,
  convertAmount,
  numOrNull,
}
