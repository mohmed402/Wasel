import { NextResponse } from 'next/server'
import { supabaseAdmin, order } from '../../../../server/supabase'

function normalizePhone(p) {
  return String(p || '')
    .replace(/\s+/g, '')
    .replace(/^\+?218/, '0')
    .trim()
}

function mapBasketItemToOrderItem(item, usdToLyd) {
  const rate = parseFloat(usdToLyd) || 5.2
  const isLyd = String(item.currency || 'LYD').toUpperCase() === 'LYD'
  const unit = parseFloat(item.price) || 0
  const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
  const exchangeRate = isLyd ? 1 : rate
  const unitLyd = isLyd ? unit : unit * rate
  const name = item.name_ar || item.name || 'منتج'
  const productId =
    item.type === 'catalog' && item.id != null
      ? String(item.id)
      : item.productId != null
        ? String(item.productId)
        : ''
  const sku =
    item.sku != null && String(item.sku).trim() !== '' ? String(item.sku).trim() : ''

  return {
    name,
    productId,
    variant: item.variant || '',
    sku,
    quantity: qty,
    unitPrice: unit,
    sellingPrice: unitLyd,
    currency: isLyd ? 'LYD' : 'USD',
    exchangeRate,
    originalLink: item.source_url || '',
    images: item.image_url ? [item.image_url] : [],
    source: item.type === 'shein' ? 'shein' : 'catalog',
    availability: 'unknown',
    status: 'pending',
    locked: false,
  }
}

function buildInternalRef() {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-WEB-${t}-${r}`
}

/**
 * POST /api/customer/submit-order
 * Public checkout: create/find customer, create order from basket snapshot.
 */
export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'الخدمة غير متاحة مؤقتاً', message: 'Server configuration incomplete' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const {
      customerName,
      phone,
      email,
      whatsApp,
      city,
      address,
      notes,
      items = [],
      exchangeRateUsdLyd = 5.2,
      basket_link: basketLinkBody,
    } = body

    const name = String(customerName || '').trim()
    const phoneNorm = normalizePhone(phone)
    const cityTrim = String(city || '').trim()
    const addressTrim = String(address || '').trim()

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'يرجى إدخال الاسم الكامل' }, { status: 400 })
    }
    if (!phoneNorm || phoneNorm.length < 8) {
      return NextResponse.json({ error: 'يرجى إدخال رقم هاتف صحيح' }, { status: 400 })
    }
    if (!cityTrim) {
      return NextResponse.json({ error: 'يرجى إدخال المدينة' }, { status: 400 })
    }
    if (!addressTrim) {
      return NextResponse.json({ error: 'يرجى إدخال عنوان التوصيل' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'السلة فارغة' }, { status: 400 })
    }

    const orderItems = items.map((it) => mapBasketItemToOrderItem(it, exchangeRateUsdLyd))
    const totalLyd = orderItems.reduce(
      (s, it) => s + (parseFloat(it.sellingPrice) || 0) * (it.quantity || 1),
      0
    )

    const deliveryBlock = [`المدينة: ${cityTrim}`, `العنوان: ${addressTrim}`]
      .join('\n')
    const notesBlock = [
      '[طلب من موقع العملاء]',
      deliveryBlock,
      notes && String(notes).trim() ? `ملاحظات: ${String(notes).trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    let customerId
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('customer')
      .select('id')
      .eq('phone', phoneNorm)
      .maybeSingle()

    if (findErr && findErr.code !== 'PGRST116') {
      console.error('submit-order find customer:', findErr)
      return NextResponse.json({ error: 'تعذر التحقق من بيانات العميل' }, { status: 500 })
    }

    if (existing?.id) {
      customerId = existing.id
      const upd = { name, address: deliveryBlock }
      if (email && String(email).trim()) upd.email = String(email).trim()
      if (whatsApp && String(whatsApp).trim()) upd.wh_account = String(whatsApp).trim()
      await supabaseAdmin.from('customer').update(upd).eq('id', customerId)
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('customer')
        .insert([
          {
            name,
            phone: phoneNorm,
            email: email ? String(email).trim() : null,
            address: deliveryBlock,
            wh_account: whatsApp ? String(whatsApp).trim() : null,
            is_active: true,
          },
        ])
        .select('id')
        .single()

      if (createErr) {
        console.error('submit-order create customer:', createErr)
        return NextResponse.json({ error: 'تعذر حفظ بيانات العميل' }, { status: 500 })
      }
      customerId = created.id
    }

    const internal_ref = buildInternalRef()
    const basket_link =
      basketLinkBody != null && String(basketLinkBody).trim()
        ? String(basketLinkBody).trim()
        : null

    const orderPayload = {
      customer_id: customerId,
      internal_ref,
      order_date: new Date().toISOString().split('T')[0],
      order_source: 'other',
      basket_link,
      expected_delivery_date: null,
      notes: notesBlock,
      subtotal: totalLyd,
      expenses_total: 0,
      service_fee: 0,
      international_shipping: 0,
      local_delivery: 0,
      discount: 0,
      total_amount: totalLyd,
      status: 'pending',
      has_issues: false,
      items: orderItems,
      expenses: [],
      shipping: {
        internationalCompany: null,
        internationalTracking: null,
        localCompany: null,
        localTracking: null,
        warehouse: `${cityTrim} — ${addressTrim.slice(0, 200)}`,
      },
      payment: {
        depositRequired: 0,
        depositType: 'percentage',
        depositPaid: false,
        depositAmount: 0,
        paymentMethod: null,
        depositPaidDate: null,
      },
    }

    const createdOrder = await order.create(orderPayload)

    return NextResponse.json(
      {
        ok: true,
        internal_ref: createdOrder.internal_ref || internal_ref,
        order_id: createdOrder.id,
        total_amount: totalLyd,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('submit-order error:', error)
    return NextResponse.json(
      { error: 'فشل إرسال الطلب', details: error.message },
      { status: 500 }
    )
  }
}
