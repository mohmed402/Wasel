import { NextResponse } from 'next/server'
import { financialSettings } from '../../../../server/supabase'

export async function GET(request) {
  try {
    const settings = await financialSettings.get()

    return NextResponse.json(settings, { status: 200 })
  } catch (error) {
    console.error('Error fetching financial settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch financial settings', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()

    // Prepare update data
    const updateData = {}
    if (body.base_currency !== undefined) updateData.base_currency = body.base_currency
    if (body.settings_json !== undefined) updateData.settings_json = body.settings_json

    const updatedSettings = await financialSettings.update(updateData)

    return NextResponse.json(updatedSettings, { status: 200 })
  } catch (error) {
    console.error('Error updating financial settings:', error)
    return NextResponse.json(
      { error: 'Failed to update financial settings', details: error.message },
      { status: 500 }
    )
  }
}

