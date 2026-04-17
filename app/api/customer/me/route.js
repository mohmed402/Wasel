import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

export const dynamic = 'force-dynamic'

function getTokenFromRequest(request) {
  const auth = request.headers.get('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim()
  return null
}

/**
 * GET /api/customer/me
 * Returns the authenticated customer's profile.
 * Authorization: Bearer <session_token>
 */
export async function GET(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('customer')
      .select('id, name, phone, email, address, wh_account, wallet_balance, wallet_currency, is_active, created_at')
      .eq('session_token', token)
      .gt('session_expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'الجلسة غير صالحة أو منتهية' }, { status: 401 })
    }

    if (!data.is_active) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
    }

    return NextResponse.json({
      customer: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        whatsApp: data.wh_account,
        wallet_balance: data.wallet_balance ?? 0,
        wallet_currency: data.wallet_currency || 'LYD',
        created_at: data.created_at,
      },
    })
  } catch (e) {
    console.error('customer/me error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
