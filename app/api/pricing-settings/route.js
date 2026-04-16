import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../server/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pricing-settings
 * Returns the active pricing method and shipping cost for customer-facing display.
 *
 * Pricing Methods:
 *   1 = Free shipping for customer, coupon kept by More Express (default)
 *   2 = Shipping paid by customer, coupon given to customer
 *   3 = Shipping paid by customer, coupon kept by More Express
 *
 * Dollar rate is configurable in admin panel (stored in financial_settings).
 */
export async function GET() {
  try {
    let pricingMethod = 1
    let shippingCost = 0
    let exchangeRateDisplay = 6.0 // mock/default display rate

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('financial_settings')
        .select('settings_json')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data?.settings_json) {
        const s = data.settings_json
        if (typeof s.pricingMethod === 'number') pricingMethod = s.pricingMethod
        if (typeof s.shippingCost === 'number') shippingCost = s.shippingCost
        if (typeof s.exchangeRateDisplay === 'number') exchangeRateDisplay = s.exchangeRateDisplay
        else if (typeof s.exchangeRates?.USD === 'number') exchangeRateDisplay = s.exchangeRates.USD
      }
    }

    return NextResponse.json({ pricingMethod, shippingCost, exchangeRateDisplay })
  } catch (e) {
    console.error('pricing-settings error:', e)
    return NextResponse.json({ pricingMethod: 1, shippingCost: 0, exchangeRateDisplay: 6.0 })
  }
}

/**
 * PUT /api/pricing-settings
 * Admin: update pricing method, shipping cost, display exchange rate.
 * Body: { pricingMethod: 1|2|3, shippingCost: number, exchangeRateDisplay: number }
 */
export async function PUT(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'غير متاح' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const { pricingMethod, shippingCost, exchangeRateDisplay } = body

    const { data: existing } = await supabaseAdmin
      .from('financial_settings')
      .select('id, settings_json')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const currentJson = existing?.settings_json || {}
    const updatedJson = {
      ...currentJson,
      ...(typeof pricingMethod === 'number' ? { pricingMethod } : {}),
      ...(typeof shippingCost === 'number' ? { shippingCost } : {}),
      ...(typeof exchangeRateDisplay === 'number' ? { exchangeRateDisplay } : {}),
    }

    if (existing?.id) {
      await supabaseAdmin
        .from('financial_settings')
        .update({ settings_json: updatedJson })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin
        .from('financial_settings')
        .insert([{ settings_json: updatedJson }])
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('pricing-settings PUT error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
