/**
 * Test script for Shein cart items API
 * 
 * Prerequisites:
 * 1. Make sure Next.js dev server is running: npm run dev
 * 2. Run this script: node test-shein-cart.js
 * 
 * Note: This requires Node.js 18+ for native fetch support
 */

const testUrl = 'https://m.shein.com/ar/cart/share/landing?group_id=631392305&local_country=AE'

async function testCartItems() {
  try {
    console.log('🧪 Testing Shein cart items API...')
    console.log('📋 URL:', testUrl)
    console.log('⏳ This may take 10-45 seconds...\n')

    const startTime = Date.now()
    
    const response = await fetch('http://localhost:3000/api/shein/cart-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cartShareUrl: testUrl
      })
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    
    // Get response text first to debug JSON parsing issues
    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON response:', jsonError.message)
      console.error('📄 Response text (first 500 chars):', responseText.substring(0, 500))
      return
    }

    if (!response.ok) {
      console.error('❌ Error:', data.error || data.message)
      if (data.debug) {
        console.error('🔍 Debug info:', JSON.stringify(data.debug, null, 2))
      }
      if (data.type) {
        console.error('📌 Error type:', data.type)
      }
      return
    }

    console.log(`✅ Success! (took ${elapsed}s)`)
    console.log('📍 Source:', data.source || data.sourceApiUrl || 'N/A')
    console.log(`📦 Total items extracted: ${data.count}`)
    
    if (data.metadata) {
      console.log('\n📊 Metadata:')
      console.log(`   Group ID: ${data.metadata.groupId}`)
      console.log(`   Country: ${data.metadata.localCountry}`)
      console.log(`   Language: ${data.metadata.language}`)
      console.log(`   Captured at: ${data.metadata.capturedAt}`)
    }

    if (data.items && data.items.length > 0) {
      console.log('\n🛍️  Items Summary:')
      console.log(`   Total unique items: ${data.items.length}`)
      
      // Count items with variants
      const itemsWithVariants = data.items.filter(item => item.variant).length
      console.log(`   Items with variant info: ${itemsWithVariants}`)
      
      // Count items with images
      const itemsWithImages = data.items.filter(item => item.images && item.images.length > 0).length
      console.log(`   Items with images: ${itemsWithImages}`)
      
      // Count total images
      const totalImages = data.items.reduce((sum, item) => sum + (item.images?.length || 0), 0)
      console.log(`   Total images: ${totalImages}`)
      
      console.log('\n📋 Items List:')
      data.items.forEach((item, index) => {
        console.log(`\n   ${index + 1}. ${item.name || 'Unknown Product'}`)
        console.log(`      Product ID: ${item.productId || 'N/A'}`)
        console.log(`      SKU: ${item.sku || 'N/A'}`)
        console.log(`      Variant: ${item.variant || 'N/A'}`)
        console.log(`      Price: ${item.price || 'N/A'} ${item.currency || 'USD'}`)
        console.log(`      Quantity: ${item.qty || 1}`)
        if (item.images && item.images.length > 0) {
          console.log(`      Images: ${item.images.length} total`)
          if (item.images.length <= 3) {
            item.images.forEach((img, imgIndex) => {
              console.log(`         ${imgIndex + 1}. ${img.substring(0, 80)}...`)
            })
          } else {
            console.log(`         1. ${item.images[0].substring(0, 80)}...`)
            console.log(`         ... and ${item.images.length - 1} more images`)
          }
        } else {
          console.log(`      Images: None`)
        }
      })
    } else {
      console.log('\n⚠️  No items found in the cart')
    }

    console.log('\n📄 Full response summary:')
    console.log(`   Source: ${data.source || 'unknown'}`)
    console.log(`   Count: ${data.count || 0}`)
    console.log(`   Items array length: ${data.items?.length || 0}`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('\n💡 Make sure:')
    console.error('   1. Next.js dev server is running: npm run dev')
    console.error('   2. Server is accessible on http://localhost:3000')
    console.error('   3. Playwright is installed: npx playwright install chromium')
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Connection refused. Is the server running?')
    }
  }
}

// Run the test
testCartItems()
