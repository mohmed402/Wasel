import { NextResponse } from 'next/server'
import { updateBatchOrderOutcomes } from '../../../../../../server/sheinPurchase'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const body = await request.json()
    const { updates, applyPurchaseFields, split } = body
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }
    const batch = await updateBatchOrderOutcomes(id, updates, {
      applyPurchaseFields: Boolean(applyPurchaseFields),
      split: split && typeof split === 'object' ? split : {},
    })
    return NextResponse.json(batch, { status: 200 })
  } catch (error) {
    console.error('shein/purchase-batches/orders PATCH:', error)
    return NextResponse.json(
      { error: 'Failed to update outcomes', details: error.message },
      { status: 400 }
    )
  }
}
