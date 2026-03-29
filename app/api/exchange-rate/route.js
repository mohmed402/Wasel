import { NextResponse } from 'next/server'
import { financialSettings } from '../../../server/supabase'

/**
 * GET /api/exchange-rate
 * Returns USD (and optional currencies) to LYD rate for customer display.
 * Uses financial settings (settings_json.exchangeRates) or env EXCHANGE_RATE_USD_LYD or default.
 */
export async function GET() {
  try {
    let rateUsdLyd = parseFloat(process.env.EXCHANGE_RATE_USD_LYD || '0') || 5.2

    try {
      const settings = await financialSettings.get()
      const rates = settings?.settings_json?.exchangeRates
      if (rates && typeof rates.USD === 'number') {
        rateUsdLyd = rates.USD
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
      { USD: 5.2, base: 'LYD' },
      { status: 200 }
    )
  }
}
