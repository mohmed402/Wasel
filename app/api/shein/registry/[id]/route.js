import { NextResponse } from 'next/server'
import { removeRegistry } from '../../../../../server/sheinPurchase'

export async function DELETE(_request, { params }) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await removeRegistry(id)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('shein/registry DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to remove registry row', details: error.message },
      { status: 500 }
    )
  }
}
