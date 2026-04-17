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
 * POST /api/customers/register
 * Creates a password for a new or existing (password-less) customer.
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

    if (!phone || phone.length < 9) {
      return NextResponse.json({ error: 'رقم الهاتف غير صحيح' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const sessionExpMs = Date.now() + 30 * 24 * 60 * 60 * 1000

    // Check if customer exists
    const { data: existing } = await supabaseAdmin
      .from('customer')
      .select('id, name, phone, email, is_active, password_hash, wallet_balance, wallet_currency')
      .eq('phone', phone)
      .maybeSingle()

    let customerId, customerName

    if (existing) {
      // Update existing record with password
      customerName = existing.name || name
      const { error: upErr } = await supabaseAdmin
        .from('customer')
        .update({
          password_hash: password, // plain text for now; replace with bcrypt in prod
          has_password: true,
          session_token: token,
          session_expires_at: expiresAt,
          ...(name && !existing.name ? { name } : {}),
        })
        .eq('id', existing.id)

      if (upErr) throw upErr
      customerId = existing.id
    } else {
      // Create new customer
      if (!name) {
        return NextResponse.json({ error: 'يرجى إدخال الاسم الكامل' }, { status: 400 })
      }
      const { data: created, error: cErr } = await supabaseAdmin
        .from('customer')
        .insert([{
          phone,
          name,
          password_hash: password,
          has_password: true,
          is_active: true,
          session_token: token,
          session_expires_at: expiresAt,
        }])
        .select('id, name, phone, email, wallet_balance, wallet_currency')
        .single()

      if (cErr) throw cErr
      customerId = created.id
      customerName = created.name
    }

    return NextResponse.json({
      ok: true,
      session: {
        token,
        expires_at: sessionExpMs,
        id: customerId,
        name: customerName,
        phone,
        wallet_balance: existing?.wallet_balance ?? 0,
        wallet_currency: existing?.wallet_currency || 'LYD',
      },
    })
  } catch (e) {
    console.error('customer register error:', e)
    return NextResponse.json({ error: 'تعذر إنشاء الحساب: ' + e.message }, { status: 500 })
  }
}
