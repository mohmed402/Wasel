import { NextResponse } from 'next/server'
import { financialAccount } from '../../../../server/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountType = searchParams.get('accountType') // 'asset' or 'liability'
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get accounts from Supabase
    const accounts = await financialAccount.getAll({ accountType, activeOnly, limit, offset })

    return NextResponse.json(accounts, { status: 200 })
  } catch (error) {
    console.error('Error fetching financial accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial accounts', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.account_type) {
      return NextResponse.json(
        { error: 'Name and account_type are required' },
        { status: 400 }
      )
    }

    // Validate category based on account_type
    if (body.account_type === 'asset' && !body.asset_category) {
      return NextResponse.json(
        { error: 'asset_category is required for asset accounts' },
        { status: 400 }
      )
    }

    if (body.account_type === 'liability' && !body.liability_category) {
      return NextResponse.json(
        { error: 'liability_category is required for liability accounts' },
        { status: 400 }
      )
    }

    // Prepare account data
    const accountData = {
      name: body.name,
      account_type: body.account_type,
      asset_category: body.account_type === 'asset' ? body.asset_category : null,
      liability_category: body.account_type === 'liability' ? body.liability_category : null,
      currency: body.currency || 'EUR',
      balance: parseFloat(body.balance || body.initialBalance || 0),
      due_date: body.due_date || null,
      color: body.color || '#2563EB',
      is_active: body.is_active !== false,
      notes: body.notes || null
    }

    // Create account in Supabase
    const newAccount = await financialAccount.create(accountData)

    return NextResponse.json(newAccount, { status: 201 })
  } catch (error) {
    console.error('Error creating financial account:', error)
    return NextResponse.json(
      { error: 'Failed to create financial account', details: error.message },
      { status: 500 }
    )
  }
}

