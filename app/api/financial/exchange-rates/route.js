import { NextResponse } from 'next/server'
import { financialSettings } from '../../../../server/supabase'
import {
  SUPPORTED,
  compileFromFinancialSettings,
  buildCrossMatrix,
} from '../../../../server/financialExchangeRates'

export const dynamic = 'force-dynamic'

/**
 * GET /api/financial/exchange-rates
 * Returns base currency, LYD-per-unit map, and full cross matrix for admin UI.
 */
export async function GET() {
  try {
    const settings = await financialSettings.get()
    const { baseCurrency, toLYD, updatedAt } = compileFromFinancialSettings(settings)
    const rates = buildCrossMatrix(SUPPORTED, toLYD)

    return NextResponse.json({
      baseCurrency,
      toLYD,
      rates,
      updated_at: updatedAt || new Date().toISOString(),
    })
  } catch (error) {
    console.error('financial exchange-rates GET:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load exchange rates' },
      { status: 500 }
    )
  }
}
