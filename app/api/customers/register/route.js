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
 * POST /api/customers/register
 * Creates/updates customer credentials using Supabase Auth.
 * Body: { phone, password, name? }
 * Returns { ok, session }
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
  }

  try {
    const body = await request.json()
    const phone = normalizePhone(body.phone || '')
    const password = String(body.password || '').trim()
    const name = String(body.name || '').trim()
    const authEmail = deriveCustomerAuthEmail(phone)

    if (!phone || phone.length < 9) {
      return NextResponse.json({ error: 'رقم الهاتف غير صحيح' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    const authClient = createServerAuthClient()
    if (!authClient) {
      return NextResponse.json({ error: 'تعذر تهيئة نظام تسجيل الدخول' }, { status: 503 })
    }

    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('customer')
      .select('id, name, phone, email, is_active, auth_user_id, auth_email')
      .eq('phone', phone)
      .maybeSingle()
    if (existingErr) {
      if (isMissingCustomerAuthColumns(existingErr)) {
        return NextResponse.json(
          { error: 'يلزم تحديث قاعدة البيانات أولاً. نفّذ SQL الجديد في docs/wallet_schema.sql ثم أعد المحاولة.' },
          { status: 503 }
        )
      }
      throw existingErr
    }

    let customerId = null
    let customerName = ''
    let customerEmail = existing?.auth_email || authEmail

    if (existing) {
      customerId = existing.id
      customerName = existing.name || name

      const { error: upErr } = await supabaseAdmin
        .from('customer')
        .update({
          auth_email: customerEmail,
          ...(name && !existing.name ? { name } : {}),
        })
        .eq('id', existing.id)
      if (upErr) throw upErr
    } else {
      if (!name) {
        return NextResponse.json({ error: 'يرجى إدخال الاسم الكامل' }, { status: 400 })
      }

      const { data: created, error: cErr } = await supabaseAdmin
        .from('customer')
        .insert([{
          phone,
          name,
          is_active: true,
          auth_email: customerEmail,
        }])
        .select('id, name')
        .single()
      if (cErr) throw cErr

      customerId = created.id
      customerName = created.name
    }

    const metadata = {
      role: 'customer',
      customer_id: customerId,
      customer_phone: phone,
      customer_name: customerName || name || '',
    }

    let authUserId = existing?.auth_user_id || null

    if (authUserId) {
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email: customerEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: {
          role: 'customer',
          customer_id: customerId,
        },
      })
      if (updateAuthErr) throw updateAuthErr
    } else {
      const { data: authCreated, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: {
          role: 'customer',
          customer_id: customerId,
        },
      })
      if (authCreateErr) {
        return NextResponse.json(
          { error: 'فشل إنشاء حساب الدخول. قد يكون مرتبطاً مسبقاً بهذا الرقم.' },
          { status: 409 }
        )
      }

      authUserId = authCreated?.user?.id || null
      if (!authUserId) {
        return NextResponse.json({ error: 'تعذر إنشاء حساب الدخول' }, { status: 500 })
      }

      const { error: linkErr } = await supabaseAdmin
        .from('customer')
        .update({ auth_user_id: authUserId, auth_email: customerEmail })
        .eq('id', customerId)
      if (linkErr) throw linkErr
    }

    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email: customerEmail,
      password,
    })
    if (signInErr || !signInData?.session || !signInData?.user) {
      return NextResponse.json({ error: 'تعذر بدء جلسة المستخدم' }, { status: 401 })
    }

    const session = signInData.session
    const user = signInData.user

    // Create wallet row for this customer if missing.
    await supabaseAdmin
      .from('customer_wallets')
      .upsert(
        [{
          customer_id: customerId,
          balance: 0,
          currency: 'LYD',
          is_active: true,
        }],
        { onConflict: 'customer_id' }
      )

    return NextResponse.json({
      ok: true,
      session: {
        token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: (session.expires_at || 0) * 1000,
        id: customerId,
        name: customerName,
        phone,
        email: existing?.email || null,
        auth_user_id: user.id,
        role: user.app_metadata?.role || user.user_metadata?.role || 'customer',
      },
    })
  } catch (e) {
    console.error('customer register error:', e)
    if (isMissingCustomerAuthColumns(e)) {
      return NextResponse.json(
        { error: 'يلزم تحديث قاعدة البيانات أولاً. نفّذ SQL الجديد في docs/wallet_schema.sql ثم أعد المحاولة.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'تعذر إنشاء الحساب: ' + e.message }, { status: 500 })
  }
}
