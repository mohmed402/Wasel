import { NextResponse } from 'next/server'
import { catalogCategory } from '../../../../server/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/catalog/categories
 * Default: active categories (storefront + product form).
 * Query include_inactive=true: all rows for admin settings (requires service role).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const rows = includeInactive
      ? await catalogCategory.getAllForAdmin()
      : await catalogCategory.getAllActive()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Catalog categories GET:', error)
    const msg = error.message || 'Failed to fetch categories'
    const status = msg.includes('admin client') ? 503 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/**
 * POST /api/catalog/categories
 * Create a category (admin). Body: slug, name_ar, name?, sort_order?, is_active?
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const row = await catalogCategory.create(body)
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error('Catalog categories POST:', error)
    const msg = error.message || 'Failed to create category'
    const status = msg.includes('admin client') ? 503 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}
