import { NextResponse } from 'next/server'
import { financialSettings } from '../../../server/supabase'
import { compileFromFinancialSettings, DEFAULT_TO_LYD } from '../../../server/financialExchangeRates'

export const dynamic = 'force-dynamic'

const RATE_KEYS = ['EUR', 'USD', 'GBP', 'LYD', 'TRY']

function sanitizeFinancialRates(input) {
  if (!input || typeof input !== 'object') return {}
  const out = {}
  for (const k of RATE_KEYS) {
    if (input[k] === undefined || input[k] === null || input[k] === '') continue
    const n = typeof input[k] === 'number' ? input[k] : parseFloat(String(input[k]))
    if (Number.isFinite(n) && n > 0) out[k] = n
  }
  return out
}

/**
 * GET /api/pricing-settings
 * Returns pricing + display USD rate + financialRates (LYD per unit) for admin forms.
 * Uses canonical financial_settings row (same as /api/financial/settings).
 */
export async function GET() {
  try {
    let pricingMethod = 1
    let shippingCost = 0
    let exchangeRateDisplay = DEFAULT_TO_LYD.USD
    let forcedMethod = null
    let financialRates = {}

    try {
      const settings = await financialSettings.get()
      const s = settings?.settings_json && typeof settings.settings_json === 'object'
        ? settings.settings_json
        : {}

      if (typeof s.pricingMethod === 'number') pricingMethod = s.pricingMethod
      if (typeof s.shippingCost === 'number') shippingCost = s.shippingCost
      if (typeof s.exchangeRateDisplay === 'number') exchangeRateDisplay = s.exchangeRateDisplay
      else if (typeof s.exchangeRates?.USD === 'number') exchangeRateDisplay = s.exchangeRates.USD
      if (s.forcedMethod) forcedMethod = s.forcedMethod
      if (s.financialRates && typeof s.financialRates === 'object') {
        financialRates = { ...s.financialRates }
      }

      const { toLYD } = compileFromFinancialSettings(settings)
      financialRates = {
        EUR: toLYD.EUR,
        USD: toLYD.USD,
        GBP: toLYD.GBP,
        TRY: toLYD.TRY,
        LYD: 1,
        ...financialRates,
      }
    } catch (e) {
      console.warn('pricing-settings GET fallback:', e.message)
    }

    return NextResponse.json({
      pricingMethod,
      shippingCost,
      exchangeRateDisplay,
      forcedMethod,
      financialRates,
    })
  } catch (e) {
    console.error('pricing-settings error:', e)
    return NextResponse.json({
      pricingMethod: 1,
      shippingCost: 0,
      exchangeRateDisplay: DEFAULT_TO_LYD.USD,
      financialRates: { ...DEFAULT_TO_LYD },
    })
  }
}

/**
 * PUT /api/pricing-settings
 * Body: { pricingMethod?, shippingCost?, exchangeRateDisplay?, financialRates?: { EUR?, GBP?, TRY?, ... } }
 * Keeps USD in financialRates in sync with exchangeRateDisplay when the latter is sent.
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { pricingMethod, shippingCost, exchangeRateDisplay, financialRates: bodyRates } = body

    const current = await financialSettings.get()
    const currentJson = current?.settings_json && typeof current.settings_json === 'object'
      ? { ...current.settings_json }
      : {}

    const mergedRates = sanitizeFinancialRates({
      ...(currentJson.financialRates && typeof currentJson.financialRates === 'object'
        ? currentJson.financialRates
        : {}),
      ...sanitizeFinancialRates(bodyRates),
    })

    if (typeof exchangeRateDisplay === 'number' && Number.isFinite(exchangeRateDisplay)) {
      mergedRates.USD = exchangeRateDisplay
    }

    const updatedJson = {
      ...currentJson,
      ...(typeof pricingMethod === 'number' ? { pricingMethod } : {}),
      ...(typeof shippingCost === 'number' ? { shippingCost } : {}),
      ...(typeof exchangeRateDisplay === 'number' ? { exchangeRateDisplay } : {}),
      financialRates: mergedRates,
    }

    await financialSettings.update({ settings_json: updatedJson })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('pricing-settings PUT error:', e)
    const status = e.message?.includes('not initialized') ? 503 : 500
    return NextResponse.json({ error: e.message }, { status })
  }
}
