/**
 * Standalone Shein cart scraper for Railway / VPS.
 * Run from repository root: node shein-scraper-service/server.mjs
 */
import express from 'express'
import cors from 'cors'
import { scrapeCartItems } from '../lib/shein/scrapeCartItems.mjs'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const SECRET = (process.env.SCRAPER_SERVICE_SECRET || '').trim()

app.disable('x-powered-by')
app.use(
  cors({
    origin: true,
    maxAge: 86400,
  })
)
app.use(express.json({ limit: '48kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'shein-cart-scraper' })
})

app.post('/cart-items', async (req, res) => {
  if (SECRET) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${SECRET}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
  }
  try {
    const result = await scrapeCartItems(req.body || {})
    res.status(result.status).json(result.body)
  } catch (err) {
    console.error('cart-items handler error:', err)
    res.status(500).json({
      error: 'Internal server error',
      message: err?.message || 'Unknown error',
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Shein cart scraper listening on 0.0.0.0:${PORT}`)
})
