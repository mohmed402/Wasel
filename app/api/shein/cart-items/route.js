import { NextResponse } from 'next/server'

/**
 * GET /api/shein/cart-items - Health check
 */
export async function GET() {
  let playwrightAvailable = false
  try {
    await import('playwright')
    playwrightAvailable = true
  } catch (e) {
    playwrightAvailable = false
  }
  
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Cart items API is running',
    playwrightAvailable
  })
}

/**
 * POST /api/shein/cart-items
 * Scrapes cart items from a Shein cart share URL using Playwright
 */
export async function POST(request) {
  console.log('📥 POST /api/shein/cart-items - Request received')
  
  // Lazy load Playwright
  let chromium
  try {
    const playwright = await import('playwright')
    chromium = playwright.chromium
    console.log('✅ Playwright loaded successfully')
  } catch (e) {
    console.error('❌ Playwright import failed:', e.message)
    return NextResponse.json(
      {
        error: 'Playwright not available',
        message: e.message,
        suggestion: 'Install Playwright: npm install playwright && npx playwright install chromium'
      },
      { status: 500 }
    )
  }
  let browser = null
  
  try {
    let body
    try {
      body = await request.json()
      console.log('✅ Request body parsed successfully')
    } catch (jsonError) {
      console.error('❌ JSON parse error:', jsonError.message)
      return NextResponse.json(
        { error: 'Invalid JSON in request body', message: jsonError.message },
        { status: 400 }
      )
    }
    
    const { cartShareUrl } = body

    if (!cartShareUrl) {
      console.error('❌ Missing cartShareUrl')
      return NextResponse.json(
        { error: 'cartShareUrl is required' },
        { status: 400 }
      )
    }

    console.log('🔗 Cart Share URL:', cartShareUrl)

    // Validate URL
    if (!cartShareUrl.includes('shein.com') || !cartShareUrl.includes('cart/share')) {
      console.error('❌ Invalid URL format')
      return NextResponse.json(
        { error: 'Invalid Shein cart share URL' },
        { status: 400 }
      )
    }

    console.log('🌐 Launching browser...')
    // Launch browser
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // For server environments
      })
      console.log('✅ Browser launched successfully')
    } catch (launchError) {
      console.error('❌ Browser launch failed:', launchError.message)
      return NextResponse.json(
        {
          error: 'Failed to launch browser',
          message: launchError.message,
          suggestion: 'Make sure Playwright is installed: npx playwright install chromium'
        },
        { status: 500 }
      )
    }
    
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    })

    // Set headers to match the URL parameters
    const urlObj = new URL(cartShareUrl)
    const groupId = urlObj.searchParams.get('group_id')
    const localCountry = urlObj.searchParams.get('local_country') || 'AE'
    const language = urlObj.pathname.includes('/ar/') ? 'ar' : 'en'

    // Set additional headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': language === 'ar' ? 'ar,en-US;q=0.9,en;q=0.8' : 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Referer': 'https://m.shein.com/',
    })

    const captured = []

    // Intercept network responses to capture cart data
    page.on('response', async (response) => {
      try {
        const url = response.url()
        const contentType = response.headers()['content-type'] || ''

        // Look for JSON API responses from Shein
        const looksJson = contentType.includes('application/json') || 
                         contentType.includes('text/json') ||
                         url.includes('.json')

        if (!looksJson) return

        // Must be from Shein domain
        if (!/shein\./i.test(url)) return

        // Only exclude very specific non-cart endpoints (be less strict)
        const isExcluded = 
          url.includes('/campaignsTinyUrlList') ||
          url.includes('/tracking/') ||
          url.includes('/analytics/') ||
          url.includes('/log/') ||
          url.includes('/beacon')

        if (isExcluded) return

        const data = await response.json().catch(() => null)
        if (!data) return

        // Try multiple possible data structures for cart items
        let items = null
        
        // Try nested structures first
        items =
          data?.info?.cart?.items ||
          data?.info?.cart?.goodsList ||
          data?.data?.cart?.items ||
          data?.data?.cart?.goodsList ||
          data?.data?.list?.items ||
          data?.result?.cart?.items ||
          data?.result?.cart?.goodsList ||
          data?.result?.list?.items ||
          data?.cart?.items ||
          data?.cart?.goodsList ||
          data?.goodsList ||
          data?.goods_list ||
          data?.data?.items ||
          data?.result?.items ||
          data?.items ||
          null

        // If items found, validate they look like cart items (have product identifiers)
        if (Array.isArray(items) && items.length > 0) {
          // Check if items have cart-item-like properties
          const firstItem = items[0]
          
          // These are the patterns we saw in the campaigns response - exclude them specifically
          const isNotCartItem = 
            (firstItem?.tinyUrl && !firstItem?.goods_id && !firstItem?.goods_name) ||
            (firstItem?.identity === null && firstItem?.tinyUrl && !firstItem?.goods_id)

          // Check for cart item properties (at least one should exist)
          const hasCartItemProperties = 
            firstItem?.goods_id ||
            firstItem?.productId ||
            firstItem?.goodsId ||
            firstItem?.sku ||
            firstItem?.goods_name ||
            firstItem?.name ||
            firstItem?.title ||
            firstItem?.sale_price ||
            firstItem?.price ||
            (firstItem?.goods_img || firstItem?.image)

          // Only capture if it has cart item properties and doesn't match non-cart patterns
          if (hasCartItemProperties && !isNotCartItem) {
            const score = (hasCartItemProperties ? 10 : 0) + (items.length > 0 ? items.length : 0)
            captured.push({ 
              url, 
              items, 
              raw: data,
              timestamp: new Date().toISOString(),
              score: score
            })
            console.log(`📦 Captured potential cart data from: ${url.substring(0, 100)}... (${items.length} items, score: ${score})`)
          }
        }
      } catch (error) {
        // Ignore non-JSON or blocked responses
        console.debug('Response capture error:', error.message)
      }
    })

    // Set up response listener BEFORE navigation
    console.log('🌐 Navigating to cart share URL...')
    
    try {
      // Navigate to the cart share URL
      await page.goto(cartShareUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      })

      console.log('✅ Page loaded, waiting for network activity...')

      // Wait for network to be idle (Playwright uses waitForLoadState with timeout as second param)
      try {
        await page.waitForLoadState('networkidle', { timeout: 30000 })
      } catch (e) {
        console.log('⚠️ Network idle timeout, continuing...')
      }
    } catch (navError) {
      console.error('Navigation error:', navError)
      throw navError
    }

    // Helper function to wait
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    // Wait a bit more for any delayed API calls and let JavaScript execute
    await wait(5000)
    
    // Try scrolling to trigger lazy loading and dynamic content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 3)
    })
    await wait(2000)
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await wait(2000)
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await wait(2000)
    
    console.log(`📊 Captured ${captured.length} potential responses so far...`)

    // Sort by score (items with proper cart item properties score higher)
    // Then by number of items as tiebreaker
    const best = captured.sort((a, b) => {
      const scoreDiff = (b.score || 0) - (a.score || 0)
      if (scoreDiff !== 0) return scoreDiff
      return (b.items?.length || 0) - (a.items?.length || 0)
    })[0]

    if (!best || !best.items || best.items.length === 0) {
      console.log('🔍 No valid items from network interception, trying page content extraction...')
      
      // Try to extract from page content as fallback - this is often more reliable
      try {
        const pageContent = await page.content()
        console.log(`📄 Page content length: ${pageContent.length} chars`)
        
        // Try to evaluate JavaScript variables that might contain cart data
        const jsCartData = await page.evaluate(() => {
          const data = {}
          
          // Try to access various window/global variables that might contain cart data
          if (window.__INITIAL_STATE__) data.__INITIAL_STATE__ = window.__INITIAL_STATE__
          if (window.__REDUX_STATE__) data.__REDUX_STATE__ = window.__REDUX_STATE__
          if (window.cartData) data.cartData = window.cartData
          if (window.cart) data.cart = window.cart
          if (window.goodsList) data.goodsList = window.goodsList
          if (window.shareCart) data.shareCart = window.shareCart
          
          // Try to find any object with cart/items/goods properties
          for (const key in window) {
            if (key.toLowerCase().includes('cart') || key.toLowerCase().includes('goods')) {
              try {
                const val = window[key]
                if (val && typeof val === 'object') {
                  data[key] = JSON.stringify(val).substring(0, 1000) // Limit size
                }
              } catch (e) {}
            }
          }
          
          return data
        }).catch(() => null)
        
        if (jsCartData && Object.keys(jsCartData).length > 0) {
          console.log('✅ Found JavaScript variables:', Object.keys(jsCartData))
        }
        
        // Try multiple patterns for cart data in page content
        const patterns = [
          /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
          /window\.__REDUX_STATE__\s*=\s*({.+?});/s,
          /window\.cartData\s*=\s*({.+?});/s,
          /window\.cart\s*=\s*({.+?});/s,
          /window\.shareCart\s*=\s*({.+?});/s,
          /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s,
          /"cartItems?":\s*(\[[^\]]+\])/s,
          /"items?":\s*(\[[^\]]+\])/s,
          /"goodsList":\s*(\[[^\]]+\])/s,
          /"goods_list":\s*(\[[^\]]+\])/s
        ]

        for (const pattern of patterns) {
          try {
            const match = pageContent.match(pattern)
            if (match) {
              const jsonData = JSON.parse(match[1])
              
              // Try multiple paths in the parsed data
              const fallbackItems = 
                jsonData?.cart?.items ||
                jsonData?.cart?.goodsList ||
                jsonData?.cart?.goods_list ||
                jsonData?.cartData?.items ||
                jsonData?.cartData?.goodsList ||
                jsonData?.pageProps?.cart?.items ||
                jsonData?.pageProps?.cartData?.items ||
                jsonData?.props?.pageProps?.cart?.items ||
                jsonData?.props?.cart?.items ||
                jsonData?.data?.cart?.items ||
                jsonData?.data?.items ||
                jsonData?.items ||
                (Array.isArray(jsonData) ? jsonData : null)

              if (Array.isArray(fallbackItems) && fallbackItems.length > 0) {
                // Validate these look like cart items
                const firstItem = fallbackItems[0]
                const hasCartItemProps = 
                  firstItem?.goods_id ||
                  firstItem?.productId ||
                  firstItem?.goods_name ||
                  firstItem?.name ||
                  firstItem?.sale_price ||
                  firstItem?.price

                if (hasCartItemProps) {
                  const normalized = fallbackItems.map((it) => ({
                    productId: it?.goods_id || it?.productId || it?.id || it?.goodsId,
                    sku: it?.sku || it?.sku_id || it?.skuId,
                    name: it?.goods_name || it?.name || it?.title || it?.goodsName,
                    price: it?.sale_price?.amount || it?.price || it?.salePrice || it?.sale_price,
                    currency: it?.sale_price?.currency || it?.currency || 'USD',
                    qty: it?.quantity || it?.qty || 1,
                    image: it?.goods_img || it?.image || it?.goodsImg,
                    variant: it?.spec || it?.variant || it?.specInfo,
                    raw: it,
                  }))

                  return NextResponse.json({
                    source: 'page_content',
                    count: normalized.length,
                    items: normalized,
                    metadata: {
                      groupId,
                      localCountry,
                      language
                    }
                  })
                }
              }
            }
          } catch (parseError) {
            // Try next pattern
            continue
          }
        }

        // Also try to extract from DOM if JavaScript extraction failed
        try {
          // Trigger lazy-loaded images before extraction
          await page.evaluate(() => {
            // Scroll each cart item into view to trigger lazy loading
            const cartItems = document.querySelectorAll('[class*="cart-be-shared-goods-item"], [class*="cart-goods-item"], [data-goods-id]')
            cartItems.forEach((item, index) => {
              if (item) {
                item.scrollIntoView({ behavior: 'instant', block: 'center' })
                // Trigger image loading by accessing srcset/data-src attributes
                const imgs = item.querySelectorAll('img')
                imgs.forEach(img => {
                  // Force load lazy images by accessing data-src
                  const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-srcset')
                  if (dataSrc && !img.src) {
                    try {
                      img.src = dataSrc.split(',')[0].trim().split(' ')[0] || dataSrc
                    } catch (e) {}
                  }
                })
              }
            })
          })
          
          // Wait a moment for images to load
          await wait(2000)
          
          const domItems = await page.evaluate(() => {
            try {
            const items = []
            const seenItems = new Set() // Track seen items to avoid duplicates
            
            // Look for the specific cart item containers based on the className pattern we saw
            // Priority: specific cart item classes first
            const selectors = [
              '[class*="cart-be-shared-goods-item"]',  // Specific Shein cart item class
              '[class*="cart-goods-item"]',
              '[class*="share-cart-item"]',
              '[data-goods-id]',
              '[data-product-id]',
              '[data-goods_id]',
              '.cart-item',
              '.goods-item'
            ]
            
            let itemElements = []
            for (const selector of selectors) {
              try {
                const elements = document.querySelectorAll(selector)
                if (elements.length > 0) {
                  itemElements = Array.from(elements)
                  break
                }
              } catch (e) {
                continue
              }
            }
            
            // If no specific items found, look for all elements with cart/goods classes
            if (itemElements.length === 0) {
              const allElements = document.querySelectorAll('*')
              allElements.forEach(el => {
                const className = el.className || ''
                const attrs = Array.from(el.attributes || [])
                
                // Check if it looks like a cart item container
                const hasCartClass = className.includes('cart') && (className.includes('item') || className.includes('goods'))
                const hasGoodsAttr = attrs.some(attr => 
                  (attr.name.includes('goods') || attr.name.includes('product')) && 
                  (attr.name.includes('id') || attr.name.includes('data'))
                )
                
                if (hasCartClass || hasGoodsAttr) {
                  itemElements.push(el)
                }
              })
            }
            
            itemElements.forEach(el => {
              // Extract product ID from various possible locations
              const goodsId = 
                el.getAttribute('data-goods-id') || 
                el.getAttribute('data-goods_id') ||
                el.getAttribute('data-product-id') ||
                el.getAttribute('goods-id') ||
                el.getAttribute('goods_id') ||
                el.getAttribute('data-goods') ||
                el.closest('[data-goods-id]')?.getAttribute('data-goods-id')
              
              // Extract name - try multiple nested selectors
              let name = null
              const nameSelectors = [
                '.goods-name',
                '.product-name',
                '[class*="goods-name"]',
                '[class*="product-name"]',
                '[class*="name"]',
                'a[title]',
                '[title]'
              ]
              
              for (const selector of nameSelectors) {
                const nameEl = el.querySelector(selector)
                if (nameEl) {
                  name = nameEl.textContent?.trim() || nameEl.getAttribute('title') || nameEl.getAttribute('alt')
                  if (name) break
                }
              }
              
              // If still no name, try direct child text or title attribute
              if (!name) {
                name = el.getAttribute('title') || el.getAttribute('data-name') || el.getAttribute('alt')
              }
              
              // Extract price - clean up the text
              let price = null
              const priceEl = el.querySelector('[class*="price"], [class*="Price"], .price, .sale-price')
              if (priceEl) {
                price = priceEl.textContent?.trim()
              } else {
                price = el.getAttribute('data-price')
              }
              
              // Clean price: remove currency symbols, extract numbers
              if (price) {
                // Remove common currency symbols and text, keep numbers and decimal points
                price = price.replace(/[^\d.,]/g, '').replace(/,/g, '')
              }
              
              // Extract ALL images from the item container
              // Strategy: Get all images from the product container, including galleries/carousels
              const images = []
              const seenImageUrls = new Set() // Track seen URLs to avoid duplicates
              const allImgElements = new Set() // Use Set to avoid duplicate img elements
              
              // Helper function to normalize URL to absolute (define early for use in data attributes)
              const normalizeUrl = (url) => {
                if (!url || url.includes('data:image')) return null
                if (url.startsWith('//')) return 'https:' + url
                if (url.startsWith('/')) return 'https://m.shein.com' + url
                if (url.startsWith('http')) return url
                return null // Skip relative URLs
              }
              
              // First, check for image URLs in data attributes (often used in React/Vue apps)
              // Look for data attributes that might contain image URLs or arrays
              const dataAttrNames = Array.from(el.attributes || [])
                .map(attr => attr.name)
                .filter(name => name.startsWith('data-'))
              
              // Helper to extract images from data attributes
              const extractImagesFromAttr = (attrValue) => {
                if (!attrValue) return []
                const foundImages = []
                
                try {
                  // Try to parse as JSON (might be an array of URLs or an object)
                  const parsed = JSON.parse(attrValue)
                  if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                      if (typeof item === 'string' && (item.includes('http') || item.includes('.webp') || item.includes('.jpg') || item.includes('.png'))) {
                        foundImages.push(item)
                      } else if (typeof item === 'object' && item.url) {
                        foundImages.push(item.url)
                      }
                    })
                  } else if (typeof parsed === 'object') {
                    // Object might have images, goods_img, imgs, etc.
                    if (parsed.images && Array.isArray(parsed.images)) {
                      foundImages.push(...parsed.images)
                    }
                    if (parsed.goods_img) {
                      if (Array.isArray(parsed.goods_img)) {
                        foundImages.push(...parsed.goods_img)
                      } else {
                        foundImages.push(parsed.goods_img)
                      }
                    }
                    if (parsed.imgs && Array.isArray(parsed.imgs)) {
                      foundImages.push(...parsed.imgs)
                    }
                    if (parsed.imageList && Array.isArray(parsed.imageList)) {
                      foundImages.push(...parsed.imageList)
                    }
                    // Check nested objects
                    if (parsed.goods && parsed.goods.goods_img) {
                      if (Array.isArray(parsed.goods.goods_img)) {
                        foundImages.push(...parsed.goods.goods_img)
                      } else {
                        foundImages.push(parsed.goods.goods_img)
                      }
                    }
                  }
                } catch (e) {
                  // Not JSON, might be a single URL string or comma-separated URLs
                  if (attrValue.includes('http') || attrValue.includes('.webp') || attrValue.includes('.jpg')) {
                    // Check if it's comma-separated
                    if (attrValue.includes(',')) {
                      attrValue.split(',').forEach(url => {
                        const trimmed = url.trim()
                        if (trimmed.includes('http') || trimmed.includes('.webp') || trimmed.includes('.jpg')) {
                          foundImages.push(trimmed)
                        }
                      })
                    } else {
                      foundImages.push(attrValue)
                    }
                  }
                }
                
                return foundImages
              }
              
              // Check all data attributes (not just image-related ones, as product data might be stored in data-goods, data-product, etc.)
              dataAttrNames.forEach(attrName => {
                const attrValue = el.getAttribute(attrName)
                if (attrValue && (
                  attrName.includes('img') || 
                  attrName.includes('image') || 
                  attrName.includes('pic') || 
                  attrName.includes('photo') ||
                  attrName.includes('goods') ||
                  attrName.includes('product') ||
                  attrName.includes('data')
                )) {
                  const foundImages = extractImagesFromAttr(attrValue)
                  foundImages.forEach(url => {
                    const normalized = normalizeUrl(url)
                    if (normalized && !seenImageUrls.has(normalized)) {
                      images.push(normalized)
                      seenImageUrls.add(normalized)
                    }
                  })
                }
              })
              
              // Get ALL images in the entire product container (including nested elements, hidden ones too)
              // This will catch images in galleries, carousels, lazy-loaded images, etc.
              const directImgs = el.querySelectorAll('img')
              directImgs.forEach(img => allImgElements.add(img))
              
              // Also check for hidden images (display:none or visibility:hidden)
              // These might be gallery images that aren't currently visible
              const allElements = el.querySelectorAll('*')
              allElements.forEach(element => {
                if (element.tagName === 'IMG') {
                  allImgElements.add(element)
                }
              })
              
              // Also look for image containers/galleries that might contain additional images
              const imageContainerSelectors = [
                // Shein-specific classes
                '[class*="cart-item-goods-img"]',
                '[class*="goods-img"]',
                '[class*="cart-item-share"]',
                '[class*="bsc-cart-item"]',
                // Generic image containers
                '[class*="gallery"]',
                '[class*="carousel"]',
                '[class*="swiper"]',
                '[class*="slider"]',
                '[class*="image"]',
                '[class*="img"]',
                '[class*="photo"]',
                '[class*="pic"]',
                'picture',
                '[role="img"]'
              ]
              
              // Collect images from containers too
              imageContainerSelectors.forEach(selector => {
                try {
                  const containers = el.querySelectorAll(selector)
                  containers.forEach(container => {
                    // Get all images inside this container
                    const containerImgs = container.querySelectorAll('img')
                    containerImgs.forEach(img => allImgElements.add(img))
                    
                    // Also check for background images in containers
                    try {
                      const style = window.getComputedStyle ? window.getComputedStyle(container) : null
                      const bgImg = style?.backgroundImage || container.style?.backgroundImage
                      if (bgImg && bgImg.includes('url(')) {
                        const match = bgImg.match(/url\(['"]?([^'"]+)['"]?\)/)
                        if (match && match[1] && !match[1].includes('data:image')) {
                          // Store background image as a special object
                          allImgElements.add({ 
                            src: match[1], 
                            isBgImage: true,
                            tagName: 'IMG', // Make it look like an img element
                            nodeName: 'IMG'
                          })
                        }
                      }
                    } catch (e) {
                      // Ignore
                    }
                  })
                } catch (e) {
                  // Ignore selector errors
                }
              })
              
              // Helper function to parse srcset and extract all image URLs
              const parseSrcset = (srcsetStr) => {
                if (!srcsetStr) return []
                const urls = []
                // srcset format: "url1 1x, url2 2x, url3 640w" etc.
                const parts = srcsetStr.split(',')
                parts.forEach(part => {
                  const trimmed = part.trim()
                  // Extract URL (everything before space or comma)
                  const urlMatch = trimmed.match(/^([^\s,]+)/)
                  if (urlMatch && urlMatch[1]) {
                    urls.push(urlMatch[1])
                  }
                })
                return urls
              }
              
              // Convert NodeList/Set to Array and extract image URLs
              // Handle both regular img elements and background image objects
              Array.from(allImgElements).forEach(img => {
                const imgUrls = []
                
                // If it's a background image object (from our custom addition)
                if (img.isBgImage && img.src) {
                  const normalized = normalizeUrl(img.src)
                  if (normalized) imgUrls.push(normalized)
                } else if (img.tagName === 'IMG' || img.nodeName === 'IMG') {
                  // Extract from src (primary source)
                  const src = img.src || img.currentSrc
                  if (src) {
                    const normalized = normalizeUrl(src)
                    if (normalized) imgUrls.push(normalized)
                  }
                  
                  // Extract from lazy-load attributes
                  const lazyAttrs = ['data-src', 'data-lazy-src', 'data-original', 'data-url', 'data-img']
                  lazyAttrs.forEach(attr => {
                    const val = img.getAttribute(attr)
                    if (val) {
                      const normalized = normalizeUrl(val)
                      if (normalized) imgUrls.push(normalized)
                    }
                  })
                  
                  // Extract ALL URLs from srcset (not just first)
                  const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset')
                  if (srcset) {
                    const srcsetUrls = parseSrcset(srcset)
                    srcsetUrls.forEach(url => {
                      const normalized = normalizeUrl(url)
                      if (normalized) imgUrls.push(normalized)
                    })
                  }
                  
                  // Check picture > source elements (parent might be a picture tag)
                  const picture = img.closest('picture')
                  if (picture) {
                    const sources = picture.querySelectorAll('source')
                    sources.forEach(source => {
                      const sourceSrcset = source.getAttribute('srcset') || source.getAttribute('data-srcset')
                      if (sourceSrcset) {
                        const sourceUrls = parseSrcset(sourceSrcset)
                        sourceUrls.forEach(url => {
                          const normalized = normalizeUrl(url)
                          if (normalized) imgUrls.push(normalized)
                        })
                      }
                      // Also check src attribute in source
                      const sourceSrc = source.getAttribute('src') || source.getAttribute('data-src')
                      if (sourceSrc) {
                        const normalized = normalizeUrl(sourceSrc)
                        if (normalized) imgUrls.push(normalized)
                      }
                    })
                  }
                }
                
                // Add all unique image URLs from this element
                imgUrls.forEach(url => {
                  // Use base URL (without query params) for deduplication, but keep full URL
                  // This allows us to get different sizes of the same image
                  const baseUrl = url.split('?')[0]
                  
                  // Only add if we haven't seen this exact URL
                  // We're more lenient now - allow different query params (which often indicate different sizes)
                  if (!seenImageUrls.has(url)) {
                    seenImageUrls.add(url)
                    // Also track base URL to avoid truly duplicate images
                    if (!seenImageUrls.has('base:' + baseUrl)) {
                      images.push(url)
                      seenImageUrls.add('base:' + baseUrl)
                    } else {
                      // If we have the same base URL but different query params, still add it
                      // (different sizes/quality)
                      images.push(url)
                    }
                  }
                })
              })
              
              // Also check for background images on containers
              try {
                // Check main container
                const computedStyle = window.getComputedStyle ? window.getComputedStyle(el) : null
                const bgImage = computedStyle?.backgroundImage || el.style?.backgroundImage
                if (bgImage && typeof bgImage === 'string' && bgImage.includes('url(')) {
                  const bgMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/)
                  if (bgMatch && bgMatch[1]) {
                    const bgUrl = bgMatch[1].startsWith('//') ? 'https:' + bgMatch[1] : bgMatch[1]
                    if (!seenImageUrls.has(bgUrl)) {
                      seenImageUrls.add(bgUrl)
                      images.unshift(bgUrl) // Add background image first as it's often the main image
                    }
                  }
                }
                
                // Check image containers for background images too
                for (const selector of imageContainerSelectors) {
                  const containers = el.querySelectorAll(selector)
                  containers.forEach(container => {
                    try {
                      const containerStyle = window.getComputedStyle ? window.getComputedStyle(container) : null
                      const containerBg = containerStyle?.backgroundImage || container.style?.backgroundImage
                      if (containerBg && typeof containerBg === 'string' && containerBg.includes('url(')) {
                        const bgMatch = containerBg.match(/url\(['"]?([^'"]+)['"]?\)/)
                        if (bgMatch && bgMatch[1]) {
                          const bgUrl = bgMatch[1].startsWith('//') ? 'https:' + bgMatch[1] : bgMatch[1]
                          if (!seenImageUrls.has(bgUrl)) {
                            seenImageUrls.add(bgUrl)
                            if (images.length === 0 || !images[0].includes(bgUrl)) {
                              images.push(bgUrl)
                            }
                          }
                        }
                      }
                    } catch (e) {
                      // Ignore errors for individual containers
                    }
                  })
                }
              } catch (e) {
                // Ignore style extraction errors
              }
              
              // Create a unique key for deduplication
              // Use product ID if available, otherwise use name+price combination
              const uniqueKey = goodsId || (name && price ? `${name}_${price}` : null)
              
              // Skip if we've already seen this item
              if (!uniqueKey || seenItems.has(uniqueKey)) {
                return
              }
              
              // Only add if we have at least a product ID, name, or price
              if (goodsId || name || price) {
                seenItems.add(uniqueKey)
                items.push({
                  productId: goodsId || null,
                  name: name || null,
                  price: price || null,
                  currency: 'USD', // Default, could be extracted from price text
                  qty: 1, // Default quantity
                  images: images.length > 0 ? images : null,
                  image: images[0] || null, // Keep first image for backward compatibility
                  raw: { 
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id
                  }
                })
              }
            })
            
            return items
            } catch (evalError) {
              console.error('Error in page.evaluate:', evalError)
              return []
            }
          }).catch(err => {
            console.error('page.evaluate failed:', err)
            return []
          })

          if (domItems && domItems.length > 0) {
            // Normalize the DOM-extracted items to match the expected format
            const normalized = domItems.map(item => ({
              productId: item.productId || null,
              sku: item.sku || null,
              name: item.name || null,
              price: item.price ? parseFloat(item.price) : null,
              currency: item.currency || 'USD',
              qty: item.qty || 1,
              image: item.image || item.images?.[0] || null,
              images: item.images || (item.image ? [item.image] : []),
              variant: item.variant || null,
              raw: item.raw || {}
            })).filter(item => item.name || item.productId || item.price) // Filter out completely empty items
            
            return NextResponse.json({
              source: 'dom_extraction',
              count: normalized.length,
              items: normalized,
              metadata: {
                groupId,
                localCountry,
                language,
                capturedAt: new Date().toISOString()
              }
            })
          }
        } catch (domError) {
          console.debug('DOM extraction failed:', domError.message)
        }

      } catch (fallbackError) {
        console.debug('Fallback extraction failed:', fallbackError.message)
      }

      // Log all captured URLs for debugging
      console.log('🔍 Debug: All captured responses:', captured.map(c => ({
        url: c.url.substring(0, 150),
        itemCount: c.items?.length || 0,
        hasValidItems: c.items?.length > 0 && (c.items[0]?.goods_id || c.items[0]?.name || c.items[0]?.sale_price)
      })))

      return NextResponse.json(
        {
          error: 'Could not capture cart items. The endpoint may be protected or payload shape differs.',
          debug: {
            capturedUrls: captured.map(c => c.url.substring(0, 200)),
            capturedCount: captured.length,
            capturedSamples: captured.slice(0, 3).map(c => ({
              url: c.url.substring(0, 150),
              itemCount: c.items?.length || 0,
              firstItemSample: c.items?.[0] ? Object.keys(c.items[0]).slice(0, 5) : []
            })),
            suggestion: 'Try checking the browser Network tab to see which API endpoint returns the actual cart items. The cart items API might use a different structure.'
          }
        },
        { status: 404 }
      )
    }

    // Normalize items to a consistent format
    const normalized = best.items.map((it) => ({
      productId: it?.goods_id || it?.productId || it?.id || it?.goodsId,
      sku: it?.sku || it?.sku_id || it?.skuId,
      name: it?.goods_name || it?.name || it?.title || it?.goodsName,
      price: it?.sale_price?.amount || it?.price || it?.salePrice || it?.sale_price,
      currency: it?.sale_price?.currency || it?.currency || 'USD',
      qty: it?.quantity || it?.qty || 1,
      image: it?.goods_img || it?.image || it?.goodsImg,
      variant: it?.spec || it?.variant || it?.specInfo,
      raw: it,
    }))

    return NextResponse.json({
      sourceApiUrl: best.url,
      count: normalized.length,
      items: normalized,
      metadata: {
        groupId,
        localCountry,
        language,
        capturedAt: best.timestamp
      }
    })

  } catch (error) {
    console.error('Error scraping cart items:', error)
    console.error('Error stack:', error.stack)
    
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser in catch:', closeError)
      }
    }
    
    return NextResponse.json(
      {
        error: 'Failed to scrape cart items',
        message: error.message || 'Unknown error occurred',
        type: error.name || 'UnknownError',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  } finally {
    // Always close the browser
    if (browser) {
      try {
        await browser.close()
      } catch (closeError) {
        console.error('Error closing browser:', closeError)
      }
    }
  }
}
