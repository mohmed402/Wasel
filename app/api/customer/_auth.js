import { supabaseAdmin } from '../../../server/supabase'

function getBearerToken(request) {
  const auth = request.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim()
}

function isMissingCustomerAuthColumns(error) {
  const msg = String(error?.message || '')
  return error?.code === '42703' && (msg.includes('customer.auth_user_id') || msg.includes('customer.auth_email'))
}

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .replace(/^\+?218/, '0')
    .trim()
}

/**
 * Validates Supabase access token and resolves the linked customer row.
 * Requires app_metadata.role === 'customer'.
 */
export async function requireCustomerAuth(request) {
  if (!supabaseAdmin) {
    return { error: { status: 503, message: 'الخدمة غير متاحة' } }
  }

  const token = getBearerToken(request)
  if (!token) {
    return { error: { status: 401, message: 'غير مصرح' } }
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) {
    return { error: { status: 401, message: 'الجلسة غير صالحة أو منتهية' } }
  }

  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role !== 'customer') {
    return { error: { status: 403, message: 'ليس لديك صلاحية الوصول' } }
  }

  const fields = [
    'id',
    'name',
    'phone',
    'email',
    'address',
    'wh_account',
    'is_active',
    'created_at'
  ]

  const metadataCustomerId = Number(user.app_metadata?.customer_id || user.user_metadata?.customer_id || 0)
  const metadataPhone = normalizePhone(user.user_metadata?.customer_phone || '')

  let customer = null
  let customerErr = null

  // 1) Canonical: exactly one customer row may carry this auth user id (unique index).
  const byAuthId = await supabaseAdmin
    .from('customer')
    .select(fields.join(', ') + ', auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  customer = byAuthId.data || null
  customerErr = byAuthId.error || null

  // 2) Bootstrap: JWT metadata customer_id before auth_user_id is linked (link only if unclaimed).
  if (!customer && !customerErr && metadataCustomerId > 0) {
    const byId = await supabaseAdmin
      .from('customer')
      .select(fields.join(', ') + ', auth_user_id')
      .eq('id', metadataCustomerId)
      .maybeSingle()
    const row = byId.data || null
    customerErr = byId.error || null
    if (row && row.auth_user_id && row.auth_user_id !== user.id) {
      customer = null
    } else {
      customer = row
      if (customer && !customer.auth_user_id) {
        await supabaseAdmin.from('customer').update({ auth_user_id: user.id }).eq('id', customer.id)
      }
    }
  }

  // 3) Last-resort: phone from metadata (link only if unclaimed).
  if (!customer && !customerErr && metadataPhone) {
    const byPhone = await supabaseAdmin
      .from('customer')
      .select(fields.join(', ') + ', auth_user_id')
      .eq('phone', metadataPhone)
      .maybeSingle()
    const row = byPhone.data || null
    customerErr = byPhone.error || null
    if (row && row.auth_user_id && row.auth_user_id !== user.id) {
      customer = null
    } else {
      customer = row
      if (customer && !customer.auth_user_id) {
        await supabaseAdmin.from('customer').update({ auth_user_id: user.id }).eq('id', customer.id)
      }
    }
  }

  if (customerErr || !customer) {
    if (isMissingCustomerAuthColumns(customerErr)) {
      return { error: { status: 503, message: 'يلزم تحديث قاعدة البيانات أولاً (docs/wallet_schema.sql)' } }
    }
    return { error: { status: 401, message: 'الحساب غير مرتبط بجلسة صالحة' } }
  }

  if (!customer.is_active) {
    return { error: { status: 403, message: 'الحساب غير نشط' } }
  }

  return { customer, user, token }
}
