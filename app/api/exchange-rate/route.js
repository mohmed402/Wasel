import { NextResponse } from 'next/server'
import { financialSettings } from '../../../server/supabase'

/**
 * GET /api/exchange-rate
 * Returns USD (and optional currencies) to LYD rate for customer display.
 * Uses financial settings (settings_json.exchangeRates) or env EXCHANGE_RATE_USD_LYD or default.
 */
export async function GET() {
  try {
    let rateUsdLyd = parseFloat(process.env.EXCHANGE_RATE_USD_LYD || '0') || 6.0

    try {
      const settings = await financialSettings.get()
      const s = settings?.settings_json
      // Prefer the customer-facing display rate if set, then exchangeRates.USD
      if (s && typeof s.exchangeRateDisplay === 'number') {
        rateUsdLyd = s.exchangeRateDisplay
      } else if (s?.exchangeRates && typeof s.exchangeRates.USD === 'number') {
        rateUsdLyd = s.exchangeRates.USD
      }
    } catch (e) {
      // use default
    }

    return NextResponse.json({
      USD: rateUsdLyd,
      base: 'LYD',
      updated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Exchange rate error:', error)
    return NextResponse.json(
      { USD: 6.0, base: 'LYD' },
      { status: 200 }
    )
  }
}
