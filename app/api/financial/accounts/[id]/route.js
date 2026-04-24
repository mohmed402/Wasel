import { NextResponse } from 'next/server'
import { financialAccount, supabaseAdmin } from '../../../../../server/supabase'

export async function GET(request, { params }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const account = await financialAccount.getById(id)

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(account, { status: 200 })
  } catch (error) {
    console.error('Error fetching financial account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial account', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.balance !== undefined) {
      if (supabaseAdmin) {
        const { count, error: countError } = await supabaseAdmin
          .from('financial_transactions')
          .select('*', { count: 'exact', head: true })
          .or(`account_id.eq.${id},related_account_id.eq.${id}`)
        if (countError) throw countError
        if ((count || 0) > 0) {
          return NextResponse.json(
            {
              error:
                'لا يمكن تعديل الرصيد يدوياً مع وجود حركات في السجل. سجّل إيداعاً/سحباً أو معاملة تسوية.',
            },
            { status: 400 }
          )
        }
      }
      updateData.balance = parseFloat(body.balance)
    }
    if (body.due_date !== undefined) updateData.due_date = body.due_date
    if (body.color !== undefined) updateData.color = body.color
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.asset_category !== undefined) updateData.asset_category = body.asset_category
    if (body.liability_category !== undefined) updateData.liability_category = body.liability_category

    const updatedAccount = await financialAccount.update(id, updateData)

    return NextResponse.json(updatedAccount, { status: 200 })
  } catch (error) {
    console.error('Error updating financial account:', error)
    return NextResponse.json(
      { error: 'Failed to update financial account', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const purge = searchParams.get('purge') === 'true'
    const force = searchParams.get('force') === 'true'

    if (purge && force) {
      if (!supabaseAdmin) {
        return NextResponse.json(
          { error: 'Supabase admin client not initialized' },
          { status: 503 }
        )
      }
      const { data: txs, error: listError } = await supabaseAdmin
        .from('financial_transactions')
        .select('id')
        .or(`account_id.eq.${id},related_account_id.eq.${id}`)
      if (listError) throw listError
      for (const row of txs || []) {
        const { error: delTxError } = await supabaseAdmin
          .from('financial_transactions')
          .delete()
          .eq('id', row.id)
        if (delTxError) throw delTxError
      }
      const { error: delAccError } = await supabaseAdmin
        .from('financial_accounts')
        .delete()
        .eq('id', id)
      if (delAccError) throw delAccError
      return NextResponse.json({ ok: true, purged: true }, { status: 200 })
    }

    // Soft delete by setting is_active to false (ledger preserved)
    const deletedAccount = await financialAccount.delete(id)

    return NextResponse.json(deletedAccount, { status: 200 })
  } catch (error) {
    console.error('Error deleting financial account:', error)
    return NextResponse.json(
      { error: 'Failed to delete financial account', details: error.message },
      { status: 500 }
    )
  }
}

