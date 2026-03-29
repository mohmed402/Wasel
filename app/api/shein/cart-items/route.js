import { NextResponse } from 'next/server'

// Increase timeout for this route (scraping can take 30–60+ seconds)
export const maxDuration = 120

/**
 * GET /api/shein/cart-items - Health check
 */
export async function GET() {
  const forwardBase = process.env.SHEIN_SCRAPER_SERVICE_URL?.trim()
  if (forwardBase) {
    try {
      const r = await fetch(`${forwardBase.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(8000),
      })
      const j = await r.json().catch(() => ({}))
      return NextResponse.json({
        status: 'ok',
        message: 'Cart items API (proxy to scraper service)',
        playwrightAvailable: j.ok === true,
        scraperMode: 'remote',
        remoteHealth: j,
      })
    } catch {
      return NextResponse.json({
        status: 'ok',
        message: 'Cart items API (proxy to scraper service)',
        playwrightAvailable: false,
        scraperMode: 'remote',
        remoteHealth: null,
      })
    }
  }

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
    playwrightAvailable,
    scraperMode: 'inline',
  })
}

/**
 * POST /api/shein/cart-items
 * Forwards to SHEIN_SCRAPER_SERVICE_URL when set (e.g. Railway); otherwise runs Playwright locally.
 */
export async function POST(request) {
  const forwardBase = process.env.SHEIN_SCRAPER_SERVICE_URL?.trim()
  let body
  try {
    body = await request.json()
  } catch (jsonError) {
    return NextResponse.json(
      { error: 'Invalid JSON in request body', message: jsonError.message },
      { status: 400 }
    )
  }

  if (forwardBase) {
    const url = `${forwardBase.replace(/\/$/, '')}/cart-items`
    const headers = { 'Content-Type': 'application/json' }
    const secret = process.env.SHEIN_SCRAPER_SERVICE_SECRET
    if (secret) headers.Authorization = `Bearer ${secret}`
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })
      const text = await r.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON from scraper service', raw: text.slice(0, 500) },
          { status: 502 }
        )
      }
      return NextResponse.json(data, { status: r.status })
    } catch (e) {
      return NextResponse.json(
        { error: 'Scraper service unreachable', message: e.message },
        { status: 502 }
      )
    }
  }

  const { scrapeCartItems } = await import('../../../../lib/shein/scrapeCartItems.mjs')
  const result = await scrapeCartItems(body)
  return NextResponse.json(result.body, { status: result.status })
}
