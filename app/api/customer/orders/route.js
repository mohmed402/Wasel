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
    .select('id, is_active')
    .eq('session_token', token)
    .gt('session_expires_at', new Date().toISOString())
    .maybeSingle()
  return data
}

/**
 * GET /api/customer/orders
 * Returns all orders for the authenticated customer.
 * Authorization: Bearer <session_token>
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
