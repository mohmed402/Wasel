import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .replace(/^\+?218/, '0')
    .trim()
}

/**
 * POST /api/customers/login
 * Lightweight password check for existing customers.
 * Body: { phone, password }
 * Returns { ok, customer: { name, address, saved_addresses } } or { error }
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
      .select('id, name, address, email, wh_account, password_hash, is_active')
      .eq('phone', phone)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 })
    }

    if (!data.is_active) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 })
    }

    if (!data.password_hash) {
      return NextResponse.json({ error: 'كلمة المرور غير مضبوطة لهذا الحساب' }, { status: 401 })
    }

    // Simple password comparison
    // In production: store bcrypt hash in password_hash and compare with bcrypt
    // For now we do a direct equality check (dev/mock); replace with bcrypt in production
    const match = password === data.password_hash

    if (!match) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    }

    return NextResponse.json({
      ok: true,
      customer: {
        id: data.id,
        name: data.name,
        address: data.address,
        saved_addresses: [],
      },
    })
  } catch (e) {
    console.error('customer login error:', e)
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 })
  }
}
