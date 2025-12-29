import { NextResponse } from 'next/server'

const SHEIN_API_KEY = 'nFXY7TbqUeUygQc17MDPiYUb'
const SHEIN_API_URL = 'https://www.searchapi.io/api/v1/search'

/**
 * GET /api/shein/product/[productId]
 * Fetches product data from Shein API using fetch (no axios)
 */
export async function GET(request, { params }) {
  try {
    const { productId } = params

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Build URL with query parameters
    const paramsObj = new URLSearchParams({
      engine: 'shein_product',
      product_id: productId,
      api_key: SHEIN_API_KEY
    })

    const url = `${SHEIN_API_URL}?${paramsObj.toString()}`

    // Fetch from Shein API using native fetch
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const responseData = await response.json()

    // If the API returns an error, handle it gracefully
    if (!response.ok) {
      // Return the error from the API if available, otherwise use status text
      const errorMessage = responseData.error || responseData.message || `API request failed: ${response.status} ${response.statusText}`
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: response.status,
          details: responseData
        },
        { status: response.status }
      )
    }

    // Check if the API response indicates an error even with 200 status
    if (responseData.error) {
      return NextResponse.json(
        { 
          error: responseData.error,
          details: responseData
        },
        { status: 400 }
      )
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error('Error in API route:', error)
    
    // Handle network errors, timeouts, etc.
    const errorMessage = error.message || 'Failed to fetch product data'
    const statusCode = error.status || 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        type: 'fetch_error'
      },
      { status: statusCode }
    )
  }
}

