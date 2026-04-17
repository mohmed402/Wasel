import { NextResponse } from 'next/server'
import { requireCustomerAuth } from '../_auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customer/me
 * Returns the authenticated customer's profile.
 * Authorization: Bearer <supabase_access_token>
 */
export async function GET(request) {
  try {
    const auth = await requireCustomerAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status })
    }
    const { customer } = auth

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        whatsApp: customer.wh_account,
        created_at: customer.created_at,
      },
    })
  } catch (e) {
    console.error('customer/me error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
