import { NextResponse } from 'next/server'
import { catalogProduct } from '../../../../../server/supabase'

/**
 * GET /api/catalog/products/[id]
 * Get a single catalog product (for customer or admin).
 */
export async function GET(request, { params }) {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const product = await catalogProduct.getById(id)
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Catalog product GET:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/catalog/products/[id]
 * Update a catalog product (admin).
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const body = await request.json()
    const product = await catalogProduct.update(id, body)
    return NextResponse.json(product)
  } catch (error) {
    console.error('Catalog product PATCH:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/catalog/products/[id]
 * Delete a catalog product (admin).
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await catalogProduct.delete(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Catalog product DELETE:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}
