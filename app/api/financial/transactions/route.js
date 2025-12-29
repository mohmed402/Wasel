import { NextResponse } from 'next/server'
import { financialTransaction } from '../../../../server/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const transactionType = searchParams.get('transactionType') // 'credit', 'debit', 'transfer'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get transactions from Supabase
    const transactions = await financialTransaction.getAll({ 
      accountId, 
      transactionType, 
      limit, 
      offset 
    })

    return NextResponse.json(transactions, { status: 200 })
  } catch (error) {
    console.error('Error fetching financial transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial transactions', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.account_id || !body.transaction_type || !body.amount || !body.description) {
      return NextResponse.json(
        { error: 'account_id, transaction_type, amount, and description are required' },
        { status: 400 }
      )
    }

    // Handle transfer transactions
    if (body.transaction_type === 'transfer') {
      if (!body.to_account_id) {
        return NextResponse.json(
          { error: 'to_account_id is required for transfer transactions' },
          { status: 400 }
        )
      }

      const transferData = {
        from_account_id: body.account_id,
        to_account_id: body.to_account_id,
        amount: parseFloat(body.amount),
        currency: body.currency || 'EUR',
        exchange_rate: parseFloat(body.exchange_rate || 1.0),
        description: body.description,
        transaction_date: body.transaction_date || new Date().toISOString().split('T')[0]
      }

      const transactions = await financialTransaction.createTransfer(transferData)

      return NextResponse.json(transactions, { status: 201 })
    }

    // Handle regular transactions (credit/debit)
    const transactionData = {
      account_id: body.account_id,
      related_account_id: body.related_account_id || null,
      transaction_type: body.transaction_type,
      amount: parseFloat(body.amount),
      currency: body.currency || 'EUR',
      exchange_rate: parseFloat(body.exchange_rate || 1.0),
      amount_in_base_currency: parseFloat(body.amount) * parseFloat(body.exchange_rate || 1.0),
      description: body.description,
      reference_type: body.reference_type || null,
      reference_id: body.reference_id || null,
      transaction_date: body.transaction_date || new Date().toISOString().split('T')[0],
      notes: body.notes || null
    }

    const newTransaction = await financialTransaction.create(transactionData)

    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error) {
    console.error('Error creating financial transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create financial transaction', details: error.message },
      { status: 500 }
    )
  }
}

