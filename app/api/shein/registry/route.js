import { NextResponse } from 'next/server'
import { listRegistry, addRegistry, REGISTRY_ROLES } from '../../../../server/sheinPurchase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    if (role && !REGISTRY_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const rows = await listRegistry(role || null)
    return NextResponse.json(rows, { status: 200 })
  } catch (error) {
    console.error('shein/registry GET:', error)
    return NextResponse.json(
      { error: 'Failed to list registry', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { financial_account_id, role } = body
    if (!financial_account_id || !role) {
      return NextResponse.json(
        { error: 'financial_account_id and role are required' },
        { status: 400 }
      )
    }
    if (!REGISTRY_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const row = await addRegistry({ financial_account_id, role })
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('shein/registry POST:', error)
    const msg = error.message || 'Failed to add registry row'
    const dup = msg.includes('duplicate') || msg.includes('unique') || error.code === '23505'
    return NextResponse.json(
      { error: dup ? 'هذا الحساب مسجل مسبقاً لهذا الدور' : msg, details: error.message },
      { status: dup ? 409 : 500 }
    )
  }
}
