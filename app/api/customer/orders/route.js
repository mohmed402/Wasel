import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'
import { requireCustomerAuth } from '../_auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/orders
 * Returns all orders for the authenticated customer.
 * Authorization: Bearer <supabase_access_token>
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

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        internal_ref,
        order_date,
        status,
        total_amount,
        subtotal,
        notes,
        created_at,
        basket_link,
        order_items (
          id,
          name,
          quantity,
          unit_price,
          selling_price,
          currency,
          variant,
          status
        )
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('customer orders fetch error:', error)
      return NextResponse.json({ error: 'تعذر تحميل الطلبات' }, { status: 500 })
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (e) {
    console.error('customer/orders error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
