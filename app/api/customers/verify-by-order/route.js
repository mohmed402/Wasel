import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

function normalizePhone(p) {
  return String(p || '').replace(/\s+/g, '').replace(/^\+?218/, '0').trim()
}

/**
 * POST /api/customers/verify-by-order
 * Verifies that a given order reference belongs to the given phone number.
 * Used in the login flow to let existing (password-less) customers prove their identity.
 *
 * Body: { phone, orderRef }
 * Returns { ok, customerName } or { error }
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const phone = normalizePhone(body.phone || '')
    const orderRef = String(body.orderRef || '').trim()

    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: 'رقم الهاتف غير صحيح' }, { status: 400 })
    }
    if (!orderRef) {
      return NextResponse.json({ error: 'أدخل رقم الطلب' }, { status: 400 })
    }

    // Find the customer by phone
    const { data: customer, error: custErr } = await supabaseAdmin
      .from('customer')
      .select('id, name, is_active')
      .eq('phone', phone)
      .maybeSingle()

    if (custErr || !customer) {
      return NextResponse.json({ error: 'الرقم غير مسجل لدينا' }, { status: 404 })
    }

    if (!customer.is_active) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
    }

    // Check that the order belongs to this customer
    const { data: ord, error: ordErr } = await supabaseAdmin
      .from('orders')
      .select('id, internal_ref')
      .eq('internal_ref', orderRef)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (ordErr || !ord) {
      return NextResponse.json(
        { error: 'رقم الطلب غير صحيح أو لا ينتمي لهذا الرقم' },
        { status: 401 }
      )
    }

    return NextResponse.json({ ok: true, customerName: customer.name || '' })
  } catch (e) {
    console.error('verify-by-order error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
