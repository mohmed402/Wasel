import { NextResponse } from 'next/server'
import { getBatch, confirmBatch } from '../../../../../server/sheinPurchase'

export async function GET(_request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const batch = await getBatch(id)
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }
    return NextResponse.json(batch, { status: 200 })
  } catch (error) {
    console.error('shein/purchase-batches GET:', error)
    return NextResponse.json(
      { error: 'Failed to load batch', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const body = await request.json()
    const {
      payment_account_id,
      voucher_account_id,
      total_usd,
      total_lyd,
      fx_json,
    } = body

    const batch = await confirmBatch(id, {
      payment_account_id,
      voucher_account_id,
      total_usd,
      total_lyd,
      fx_json,
    })
    return NextResponse.json(batch, { status: 200 })
  } catch (error) {
    console.error('shein/purchase-batches PATCH:', error)
    return NextResponse.json(
      { error: 'Failed to confirm batch', details: error.message },
      { status: 400 }
    )
  }
}
