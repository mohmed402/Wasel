import { NextResponse } from 'next/server'
import { order } from '../../../../server/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = params

    // Get order by ID from Supabase
    const orderData = await order.getById(id)

    if (!orderData) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(orderData, { status: 200 })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()

    // Separate shipping and payment updates from order updates
    const { shipping, payment, ...orderUpdates } = body

    // Update order if there are order updates
    if (Object.keys(orderUpdates).length > 0) {
      await order.update(id, orderUpdates)
    }

    // Update shipping if provided
    if (shipping) {
      const { supabaseAdmin } = require('../../../../server/supabase')
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized')
      }

      // Check if shipping record exists
      const { data: existingShipping, error: checkError } = await supabaseAdmin
        .from('order_shipping')
        .select('id')
        .eq('order_id', id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingShipping) {
        // Update existing shipping record
        const { error: shippingError } = await supabaseAdmin
          .from('order_shipping')
          .update(shipping)
          .eq('order_id', id)

        if (shippingError) throw shippingError
      } else {
        // Create new shipping record
        const { error: shippingError } = await supabaseAdmin
          .from('order_shipping')
          .insert([{
            order_id: id,
            ...shipping
          }])

        if (shippingError) throw shippingError
      }
    }

    // Update payment if provided
    if (payment) {
      const { supabaseAdmin } = require('../../../../server/supabase')
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized')
      }

      // Prepare payment update data
      const paymentUpdateData = {}
      if (payment.payment_status) {
        paymentUpdateData.payment_status = payment.payment_status
      }
      if (payment.remaining_balance !== undefined) {
        paymentUpdateData.remaining_balance = parseFloat(payment.remaining_balance)
      }
      if (payment.deposit_paid !== undefined) {
        paymentUpdateData.deposit_paid = payment.deposit_paid
      }
      if (payment.deposit_amount !== undefined) {
        paymentUpdateData.deposit_amount = parseFloat(payment.deposit_amount)
      }
      if (payment.deposit_paid_date !== undefined) {
        paymentUpdateData.deposit_paid_date = payment.deposit_paid_date
      }

      // Check if payment record exists
      const { data: existingPayment, error: checkPaymentError } = await supabaseAdmin
        .from('order_payments')
        .select('id')
        .eq('order_id', id)
        .maybeSingle()

      if (checkPaymentError && checkPaymentError.code !== 'PGRST116') {
        throw checkPaymentError
      }

      if (existingPayment) {
        // Update existing payment record
        const { error: paymentError } = await supabaseAdmin
          .from('order_payments')
          .update(paymentUpdateData)
          .eq('order_id', id)

        if (paymentError) throw paymentError
      } else {
        // Create new payment record
        const { error: paymentError } = await supabaseAdmin
          .from('order_payments')
          .insert([{
            order_id: id,
            ...paymentUpdateData
          }])

        if (paymentError) throw paymentError
      }
    }

    // Fetch updated order with all relations
    const orderData = await order.getById(id)

    return NextResponse.json(orderData, { status: 200 })
  } catch (error) {
    console.error('Error updating order:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return NextResponse.json(
      { error: 'Failed to update order', details: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    // Delete order from Supabase
    await order.delete(id)

    return NextResponse.json({ message: 'Order deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order', details: error.message },
      { status: 500 }
    )
  }
}

