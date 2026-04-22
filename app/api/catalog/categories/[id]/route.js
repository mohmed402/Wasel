import { NextResponse } from 'next/server'
import { catalogCategory } from '../../../../../server/supabase'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/catalog/categories/[id]
 * Update labels, sort order, or visibility (admin). Slug is not changed here.
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await request.json()
    const row = await catalogCategory.update(id, body)
    return NextResponse.json(row)
  } catch (error) {
    console.error('Catalog categories PATCH:', error)
    const msg = error.message || 'Failed to update category'
    const status = msg.includes('admin client') ? 503 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
