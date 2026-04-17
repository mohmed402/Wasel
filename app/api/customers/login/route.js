import { NextResponse } from 'next/server'
import { supabaseAdmin, createServerAuthClient } from '../../../../server/supabase'

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .replace(/^\+?218/, '0')
    .trim()
}

function deriveCustomerAuthEmail(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  return `customer.${digits}@auth.waselexpress.local`
}

function isMissingCustomerAuthColumns(error) {
  const msg = String(error?.message || '')
  return error?.code === '42703' && (msg.includes('customer.auth_user_id') || msg.includes('customer.auth_email'))
}

/**
 * POST /api/customers/login
 * Body: { phone, password }
 * Returns { ok, session: { token, refresh_token, expires_at, id, name, phone, ... } }
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const phone = normalizePhone(body.phone || '')
    const password = String(body.password || '').trim()
    const authClient = createServerAuthClient()

    if (!phone || !password || !authClient) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('customer')
      .select('id, name, phone, email, address, wh_account, is_active, auth_user_id, auth_email')
      .eq('phone', phone)
      .maybeSingle()

    if (isMissingCustomerAuthColumns(error)) {
      return NextResponse.json(
        { error: 'يلزم تحديث قاعدة البيانات أولاً. نفّذ SQL الجديد في docs/wallet_schema.sql ثم أعد المحاولة.' },
        { status: 503 }
      )
    }

    if (error || !data) {
      return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
    }
    if (!data.is_active) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
    }

    const customerEmail = data.auth_email || deriveCustomerAuthEmail(phone)
    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email: customerEmail,
      password,
    })
    if (signInErr || !signInData?.session || !signInData?.user) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    }

    const authUser = signInData.user
    const session = signInData.session
    const role = authUser.app_metadata?.role || authUser.user_metadata?.role
    if (role !== 'customer') {
      return NextResponse.json({ error: 'لا يمكن الدخول بهذا الحساب' }, { status: 403 })
    }

    const updates = {}
    if (!data.auth_user_id || data.auth_user_id !== authUser.id) {
      updates.auth_user_id = authUser.id
    }
    if (!data.auth_email || data.auth_email !== customerEmail) {
      updates.auth_email = customerEmail
    }
    if (Object.keys(updates).length > 0) {
      const { error: linkErr } = await supabaseAdmin
        .from('customer')
        .update(updates)
        .eq('id', data.id)
      if (linkErr) throw linkErr
    }

    return NextResponse.json({
      ok: true,
      session: {
        token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: (session.expires_at || 0) * 1000,
        id: data.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        auth_user_id: authUser.id,
        role: role || 'customer',
      },
    })
  } catch (e) {
    console.error('customer login error:', e)
    if (isMissingCustomerAuthColumns(e)) {
      return NextResponse.json(
        { error: 'يلزم تحديث قاعدة البيانات أولاً. نفّذ SQL الجديد في docs/wallet_schema.sql ثم أعد المحاولة.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
