import { NextResponse } from 'next/server'
import { financialTransaction, supabaseAdmin } from '../../../../../server/supabase'

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized')
    }

    // Get transaction to get account_id for balance update
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('financial_transactions')
      .select('account_id, transaction_type, amount, currency, exchange_rate, related_account_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete the transaction
    const { error: deleteError } = await supabaseAdmin
      .from('financial_transactions')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    // Recalculate account balance after deletion
    // Recalculate balance for the main account
    if (transaction.account_id) {
      await financialTransaction.recalculateAccountBalance(transaction.account_id)
    }
    
    // Recalculate balance for related account if it's a transfer
    if (transaction.related_account_id && transaction.transaction_type === 'transfer') {
      await financialTransaction.recalculateAccountBalance(transaction.related_account_id)
    }

    return NextResponse.json({ message: 'Transaction deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete transaction', details: error.message },
      { status: 500 }
    )
  }
}

