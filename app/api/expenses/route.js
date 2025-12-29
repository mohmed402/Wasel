import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '../../../server/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.cost) {
      return NextResponse.json(
        { error: 'Name and cost are required' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')

    // Create expense in Supabase
    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert([{
        name: body.name,
        name_en: body.nameEn || null,
        description: body.description || null,
        cost: parseFloat(body.cost),
        currency: body.currency || 'LYD',
        category: body.category || 'other',
        is_active: body.is_active !== false
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Failed to create expense', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [], { status: 200 })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error.message },
      { status: 500 }
    )
  }
}

