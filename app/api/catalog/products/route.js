import { NextResponse } from 'next/server'
import { catalogProduct } from '../../../../server/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/catalog/products
 * List catalog products.
 * Query: category, limit, offset, active_only (default true for customer; set false for admin to see all)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const activeOnly = searchParams.get('active_only') !== 'false'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const products = activeOnly
      ? await catalogProduct.getAllActive({ category, limit, offset })
      : await catalogProduct.getAll({ category, limit, offset })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Catalog products GET:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/catalog/products
 * Create a catalog product (admin). Body: name, name_ar?, description?, description_ar?, price, currency?, image_url?, images?, category?, quantity? (stock, empty = unlimited), size?, is_active?, sort_order?
 */
export async function POST(request) {
  try {
    const body = await request.json()
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    const product = await catalogProduct.create(body)
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Catalog products POST:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}
