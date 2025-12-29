import { NextResponse } from 'next/server'
import { order } from '../../../server/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.customer_id || !body.internal_ref) {
      return NextResponse.json(
        { error: 'Customer ID and internal reference are required' },
        { status: 400 }
      )
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      )
    }

    // Create order in Supabase
    const newOrder = await order.create(body)

    return NextResponse.json(newOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get orders from Supabase
    const orders = await order.getAll({ status, limit, offset })

    return NextResponse.json(orders, { status: 200 })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', details: error.message },
      { status: 500 }
    )
  }
}

