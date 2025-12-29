import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../server/supabase'

export async function PATCH(request, { params }) {
  try {
    const { itemId } = params

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized')
    }

    const body = await request.json()
    const { 
      status, 
      purchase_account_id, 
      purchase_price, 
      purchase_currency, 
      purchase_exchange_rate 
    } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ['pending', 'purchased', 'received', 'missing', 'damaged']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // If status is purchased, validate purchase information
    if (status === 'purchased') {
      if (!purchase_account_id || !purchase_price) {
        return NextResponse.json(
          { error: 'purchase_account_id and purchase_price are required when status is purchased' },
          { status: 400 }
        )
      }

      // Create debit transaction for the purchase
      const { financialTransaction, financialAccount } = require('../../../../../../server/supabase')
      
      // Get account currency to ensure transaction currency matches
      const account = await financialAccount.getById(purchase_account_id)
      if (!account) {
        throw new Error('Purchase account not found')
      }
      
      // Get item details to calculate total cost
      const { data: itemData, error: itemError } = await supabaseAdmin
        .from('order_items')
        .select('quantity')
        .eq('id', itemId)
        .single()

      if (itemError) throw itemError

      const totalCost = parseFloat(purchase_price) * parseFloat(itemData.quantity || 1)
      const exchangeRate = parseFloat(purchase_exchange_rate || 1.0)
      const amountInBaseCurrency = totalCost * exchangeRate

      // Use account's currency for the transaction (purchase is from this account)
      const transactionCurrency = account.currency || purchase_currency || 'LYD'

      // Create debit transaction
      try {
        await financialTransaction.create({
          account_id: purchase_account_id,
          transaction_type: 'debit',
          amount: totalCost,
          currency: transactionCurrency, // Use account's currency
          exchange_rate: exchangeRate,
          amount_in_base_currency: amountInBaseCurrency,
          description: `شراء عنصر من الطلب - ${itemId}`,
          reference_type: 'order_item',
          reference_id: itemId,
          transaction_date: new Date().toISOString().split('T')[0]
        })
      } catch (txError) {
        console.error('Error creating purchase transaction:', txError)
        throw txError // Re-throw to fail the item update if transaction fails
      }
    }

    // Prepare update data
    const updateData = { status }
    
    // Add purchase information if provided
    if (status === 'purchased' && purchase_account_id) {
      updateData.purchase_account_id = purchase_account_id
      updateData.purchase_price = parseFloat(purchase_price)
      updateData.purchase_currency = purchase_currency || 'LYD'
      updateData.purchase_exchange_rate = parseFloat(purchase_exchange_rate || 1.0)
    }

    // Update the order item
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error updating order item:', error)
    return NextResponse.json(
      { error: 'Failed to update order item', details: error.message },
      { status: 500 }
    )
  }
}

