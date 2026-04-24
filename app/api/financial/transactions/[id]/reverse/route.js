import { NextResponse } from 'next/server'
import { financialTransaction } from '../../../../../../server/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/financial/transactions/[id]/reverse
 * Body: { reason?: string, transaction_date?: string (YYYY-MM-DD) }
 */
export async function POST(request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    let body = {}
    try {
      body = await request.json()
    } catch (_) {
      body = {}
    }

    const result = await financialTransaction.reverse(id, {
      reason: body.reason || '',
      transaction_date: body.transaction_date || undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Transaction reverse:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reverse transaction' },
      { status: 400 }
    )
  }
}
