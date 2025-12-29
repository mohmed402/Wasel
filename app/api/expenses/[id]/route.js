import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../server/supabase'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()

    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Failed to update expense', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Expense deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error.message },
      { status: 500 }
    )
  }
}

