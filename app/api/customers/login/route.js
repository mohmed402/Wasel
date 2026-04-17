import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'
import { randomBytes } from 'crypto'

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .replace(/^\+?218/, '0')
    .trim()
}

function generateToken() {
  return randomBytes(32).toString('hex')
}

/**
 * POST /api/customers/login
 * Body: { phone, password }
 * Returns { ok, session: { token, expires_at, id, name, phone, ... } }
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const phone = normalizePhone(body.phone || '')
    const password = String(body.password || '').trim()

    if (!phone || !password) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('customer')
      .select('id, name, phone, email, address, wh_account, password_hash, is_active, wallet_balance, wallet_currency')
      .eq('phone', phone)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
    }
    if (!data.is_active) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
    }
    if (!data.password_hash) {
      return NextResponse.json({ error: 'كلمة المرور غير مضبوطة. أنشئ كلمة مرور أولاً.' }, { status: 401 })
    }

    const match = password === data.password_hash

    if (!match) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    }

    // Issue a session token valid for 30 days
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('customer')
      .update({ session_token: token, session_expires_at: expiresAt })
      .eq('id', data.id)

    return NextResponse.json({
      ok: true,
      session: {
        token,
        expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        wallet_balance: data.wallet_balance ?? 0,
        wallet_currency: data.wallet_currency || 'LYD',
      },
    })
  } catch (e) {
    console.error('customer login error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
