import { NextResponse } from 'next/server'
import { financialSettings } from '../../../server/supabase'
import { compileFromFinancialSettings } from '../../../server/financialExchangeRates'

/**
 * GET /api/exchange-rate
 * Returns USD (and optional currencies) to LYD rate for customer display.
 * Uses the same source as /api/financial/exchange-rates (financial_settings + env fallback).
 */
export async function GET() {
  try {
    const settings = await financialSettings.get()
    const { toLYD, updatedAt } = compileFromFinancialSettings(settings)
    const rateUsdLyd = toLYD.USD

    return NextResponse.json({
      USD: rateUsdLyd,
      base: 'LYD',
      updated_at: updatedAt || new Date().toISOString(),
    })
  } catch (error) {
    console.error('Exchange rate error:', error)
    return NextResponse.json(
      { USD: 6.0, base: 'LYD' },
      { status: 200 }
    )
  }
}
