import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'
import { requireCustomerAuth } from '../_auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/wallet
 * Returns the wallet balance and recent transactions for the authenticated customer.
 * Authorization: Bearer <supabase_access_token>
 *
 * Falls back gracefully if the customer_wallets table doesn't exist yet.
 */
export async function GET(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  try {
    const auth = await requireCustomerAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
    }
    const { customer } = auth
    const customerId = Number(customer.id)

    // Balance comes only from dedicated wallet table.
    let walletRow = null
    let transactions = []

    async function fetchWalletRow() {
      const { data, error } = await supabaseAdmin
        .from('customer_wallets')
        .select('id, balance, currency, is_active, updated_at')
        .eq('customer_id', customerId)
        .maybeSingle()
      return { data, error }
    }

    try {
      let { data: w } = await fetchWalletRow()

      if (w) {
        walletRow = w
      } else {
        // Ensure every authenticated customer has a wallet row.
        const { data: createdWallet, error: createWalletErr } = await supabaseAdmin
          .from('customer_wallets')
          .insert([{
            customer_id: customerId,
            balance: 0,
            currency: 'LYD',
            is_active: true,
          }])
          .select('id, balance, currency, is_active, updated_at')
          .single()

        if (!createWalletErr && createdWallet) {
          walletRow = createdWallet
        } else if (createWalletErr?.code === '23505') {
          // Concurrent request inserted first — load existing row.
          const refetch = await fetchWalletRow()
          walletRow = refetch.data || null
        }
      }

      if (walletRow) {
        const { data: txs } = await supabaseAdmin
          .from('wallet_transactions')
          .select('id, tx_type, amount, balance_after, reference_id, notes, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(30)

        transactions = txs || []
      }
    } catch {
      // wallet tables not yet applied
    }

    const balance = walletRow?.balance ?? 0
    const currency = walletRow?.currency ?? 'LYD'

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
