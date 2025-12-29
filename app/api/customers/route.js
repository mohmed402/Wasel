import { NextResponse } from 'next/server'
// import { customer } from '../../../../server/supabase'
// import { customer } from '@/server/supabase'
import { customer } from '../../../server/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Create customer in Supabase
    const newCustomer = await customer.create({
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      fb_account: body.fb_account || null,
      wh_account: body.wh_account || null,
      preferred_contact: body.preferred_contact || null,
      notes: body.notes || null,
      is_active: body.is_active !== false
    })

    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    // Get customers from Supabase
    const customers = await customer.getAll({ activeOnly })

    return NextResponse.json(customers, { status: 200 })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error.message },
      { status: 500 }
    )
  }
}

