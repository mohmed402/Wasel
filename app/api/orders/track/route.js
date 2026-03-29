import { NextResponse } from 'next/server'
import { order } from '../../../../server/supabase'

/**
 * GET /api/orders/track?ref=ORD-1234567890
 * Public order tracking by internal reference (for customers).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')?.trim()

    if (!ref) {
      return NextResponse.json(
        { error: 'معرف الطلب مطلوب', message: 'Order reference is required' },
        { status: 400 }
      )
    }

    const orderData = await order.getByInternalRef(ref)

    if (!orderData) {
      return NextResponse.json(
        { error: 'لم يتم العثور على الطلب', message: 'Order not found' },
        { status: 404 }
      )
    }

    const statusLabels = {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      shipping: 'قيد الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    }
    const stageLabels = {
      not_started: 'لم يبدأ',
      international_shipping: 'الشحن الدولي',
      arrived_libya: 'وصلت ليبيا',
      local_delivery: 'التوصيل المحلي',
      delivered: 'تم التوصيل'
    }

    return NextResponse.json({
      ...orderData,
      status_label: statusLabels[orderData.status] || orderData.status,
      shipping_stage_label: orderData.shipping
        ? stageLabels[orderData.shipping.shipping_stage] || orderData.shipping.shipping_stage
        : null
    })
  } catch (error) {
    console.error('Order track error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ', message: error.message },
      { status: 500 }
    )
  }
}
