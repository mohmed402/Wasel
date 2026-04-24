import { NextResponse } from 'next/server'
import { createDraftBatch } from '../../../../server/sheinPurchase'

export async function POST(request) {
  try {
    const body = await request.json()
    const order_ids = body.order_ids
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: 'order_ids array is required' }, { status: 400 })
    }
    const batch = await createDraftBatch(order_ids)
    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('shein/purchase-batches POST:', error)
    return NextResponse.json(
      { error: 'Failed to create batch', details: error.message },
      { status: 500 }
    )
  }
}
