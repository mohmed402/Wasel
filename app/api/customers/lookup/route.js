import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

export const dynamic = 'force-dynamic'

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .replace(/^\+?218/, '0')
    .trim()
}

function isMissingCustomerAuthColumns(error) {
  const msg = String(error?.message || '')
  return error?.code === '42703' && (msg.includes('customer.auth_user_id') || msg.includes('customer.auth_email'))
}

/**
 * GET /api/customers/lookup?phone=09xxxxxxxx
 * Check if a customer record exists for this phone number (for optional login prompt).
 * Returns { found: bool, customer: { name, address, hasPassword } }.
 */
export async function GET(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ found: false }, { status: 200 })
  }

  const { searchParams } = new URL(request.url)
  const rawPhone = searchParams.get('phone') || ''
  const phone = normalizePhone(rawPhone)

  if (!phone || phone.length < 8) {
    return NextResponse.json({ found: false }, { status: 200 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('customer')
      .select('id, name, address, email, auth_user_id, auth_email')
      .eq('phone', phone)
      .maybeSingle()

    if (isMissingCustomerAuthColumns(error)) {
      return NextResponse.json({ found: false, migration_required: true }, { status: 200 })
    }

    if (error || !data) {
      return NextResponse.json({ found: false }, { status: 200 })
    }

    return NextResponse.json({
      found: true,
      customer: {
        id: data.id,
        name: data.name,
        address: data.address,
        hasPassword: !!(data.auth_user_id || data.auth_email),
      },
    })
  } catch (e) {
    console.error('customer lookup error:', e)
    return NextResponse.json({ found: false }, { status: 200 })
  }
}
