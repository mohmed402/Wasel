import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

export const dynamic = 'force-dynamic'

function getTokenFromRequest(request) {
  const auth = request.headers.get('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim()
  return null
}

async function getCustomerFromToken(token) {
  const { data } = await supabaseAdmin
    .from('customer')
    .select('id, is_active, wallet_balance, wallet_currency')
    .eq('session_token', token)
    .gt('session_expires_at', new Date().toISOString())
    .maybeSingle()
  return data
}

/**
 * GET /api/customer/wallet
 * Returns the wallet balance and recent transactions for the authenticated customer.
 * Authorization: Bearer <session_token>
 *
 * Falls back gracefully if the customer_wallets table doesn't exist yet.
 */
export async function GET(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  const token = getTokenFromRequest(request)
  if (!token) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  try {
    const customer = await getCustomerFromToken(token)
    if (!customer) return NextResponse.json({ error: 'الجلسة غير صالحة' }, { status: 401 })
    if (!customer.is_active) return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })

    // Balance — prefer dedicated wallet table, fall back to customer column
    let walletRow = null
    let transactions = []

    try {
      const { data: w } = await supabaseAdmin
        .from('customer_wallets')
        .select('id, balance, currency, is_active, updated_at')
        .eq('customer_id', customer.id)
        .maybeSingle()

      if (w) {
        walletRow = w
        const { data: txs } = await supabaseAdmin
          .from('wallet_transactions')
          .select('id, tx_type, amount, balance_after, reference_id, notes, created_at')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(30)

        transactions = txs || []
      }
    } catch {
      // wallet tables not yet applied — use customer column fallback
    }

    const balance = walletRow?.balance ?? customer.wallet_balance ?? 0
    const currency = walletRow?.currency ?? customer.wallet_currency ?? 'LYD'

    return NextResponse.json({
      wallet: {
        balance,
        currency,
        is_active: walletRow?.is_active ?? true,
        updated_at: walletRow?.updated_at ?? null,
      },
      transactions,
    })
  } catch (e) {
    console.error('customer/wallet error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
