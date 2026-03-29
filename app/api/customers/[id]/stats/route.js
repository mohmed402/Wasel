import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export async function GET(request, { params }) {
  try {
    const { id } = params
    const customerId = parseInt(id)

    if (!customerId || isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Valid customer ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Query orders directly by customer_id
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount')
      .eq('customer_id', customerId)

    if (error) throw error

    // Calculate statistics
    const totalOrders = orders?.length || 0
    
    // Calculate total amount paid (sum of total_amount from all orders)
    const totalAmountPaid = (orders || []).reduce((sum, order) => {
      return sum + (parseFloat(order.total_amount) || 0)
    }, 0)

    return NextResponse.json({
      totalOrders,
      totalAmountPaid: Math.round(totalAmountPaid)
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics', details: error.message },
      { status: 500 }
    )
  }
}
