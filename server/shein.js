/**
 * Shein API utility functions
 * Uses fetch API (no axios dependency)
 */

const SHEIN_API_KEY = 'nFXY7TbqUeUygQc17MDPiYUb'
const SHEIN_API_URL = 'https://www.searchapi.io/api/v1/search'

/**
 * Fetch product data from Shein API
 * @param {string} productId - The Shein product ID
 * @returns {Promise<Object>} Product data
 */
async function fetchSheinProduct(productId) {
  if (!productId) {
    throw new Error('Product ID is required')
  }

  const params = new URLSearchParams({
    engine: 'shein_product',
    product_id: productId,
    api_key: SHEIN_API_KEY
  })

  const url = `${SHEIN_API_URL}?${params.toString()}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Shein product:', error)
    throw error
  }
}

module.exports = {
  fetchSheinProduct
}

