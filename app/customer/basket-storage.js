/**
 * Customer basket in localStorage (catalog + Shein lines).
 * Key: wasel_customer_basket
 * Catalog: { type: 'catalog', id, name, name_ar, price, currency, image_url, quantity }
 * Shein: { type: 'shein', sheinKey, productId?, name, price, currency, image_url, quantity, variant?, source_url? }
 */

const KEY = 'wasel_customer_basket'

function normalizeItems(items) {
  return (items || []).map((i) => {
    if (!i) return i
    if (!i.type && i.id != null) return { ...i, type: 'catalog' }
    if (i.type === 'shein' && !i.sheinKey) {
      return { ...i, sheinKey: buildSheinKey(i) }
    }
    return i
  })
}

export function getBasket() {
  if (typeof window === 'undefined') return { items: [] }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { items: [] }
    const data = JSON.parse(raw)
    if (!Array.isArray(data.items)) return { items: [] }
    return { items: normalizeItems(data.items) }
  } catch {
    return { items: [] }
  }
}

export function buildSheinKey(item) {
  const pid = String(item.productId ?? item.goods_id ?? '').trim()
  const v = String(item.variant ?? '').trim().slice(0, 120)
  const n = String(item.name ?? '').trim().slice(0, 80)
  return `shein:${pid}:${v}:${n}`
}

export function setBasket(basket) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify({ items: basket.items || [] }))
  } catch (e) {
    console.warn('Basket set failed', e)
  }
}

export function addToBasket(catalogItem, quantity = 1) {
  const basket = getBasket()
  const entry = {
    type: 'catalog',
    id: catalogItem.id,
    name: catalogItem.name,
    name_ar: catalogItem.name_ar,
    price: parseFloat(catalogItem.price) || 0,
    currency: catalogItem.currency || 'LYD',
    image_url: catalogItem.image_url || (catalogItem.images && catalogItem.images[0]),
    quantity: Math.max(1, parseInt(quantity, 10) || 1)
  }
  const idx = basket.items.findIndex((i) => i.type === 'catalog' && i.id === catalogItem.id)
  if (idx >= 0) {
    basket.items[idx].quantity += entry.quantity
  } else {
    basket.items.push(entry)
  }
  setBasket(basket)
  return getBasket()
}

export function removeFromBasket(catalogId) {
  const basket = getBasket()
  basket.items = basket.items.filter((i) => !(i.type === 'catalog' && i.id === catalogId))
  setBasket(basket)
  return getBasket()
}

export function updateBasketQuantity(catalogId, quantity) {
  const basket = getBasket()
  const item = basket.items.find((i) => i.type === 'catalog' && i.id === catalogId)
  if (item) {
    item.quantity = Math.max(0, parseInt(quantity, 10) || 0)
    if (item.quantity === 0) basket.items = basket.items.filter((i) => i !== item)
  }
  setBasket(basket)
  return getBasket()
}

export function clearBasket() {
  setBasket({ items: [] })
  return getBasket()
}

export function addSheinToBasket(item) {
  const basket = getBasket()
  const sheinKey = item.sheinKey || buildSheinKey(item)
  const entry = {
    type: 'shein',
    sheinKey,
    productId: item.productId ?? null,
    name: item.name || 'منتج',
    price: parseFloat(item.price) || 0,
    currency: item.currency || 'USD',
    image_url: item.image_url || item.image || null,
    quantity: Math.max(1, parseInt(item.qty ?? item.quantity, 10) || 1),
    variant: item.variant || null,
    source_url: item.source_url || null,
  }
  const idx = basket.items.findIndex((i) => i.type === 'shein' && i.sheinKey === sheinKey)
  if (idx >= 0) {
    basket.items[idx].quantity += entry.quantity
  } else {
    basket.items.push(entry)
  }
  setBasket(basket)
  return getBasket()
}

/** Append normalized items from POST /api/shein/cart-items */
export function addSheinCartItemsToBasket(apiItems) {
  for (const it of apiItems || []) {
    addSheinToBasket({
      productId: it.productId ?? null,
      name: it.name || 'منتج',
      price: it.price,
      currency: it.currency || 'USD',
      qty: it.qty || 1,
      image: it.image || it.images?.[0],
      variant: it.variant || null,
    })
  }
  return getBasket()
}

export function removeSheinFromBasket(sheinKey) {
  const basket = getBasket()
  basket.items = basket.items.filter((i) => !(i.type === 'shein' && i.sheinKey === sheinKey))
  setBasket(basket)
  return getBasket()
}

export function updateSheinQuantity(sheinKey, quantity) {
  const basket = getBasket()
  const item = basket.items.find((i) => i.type === 'shein' && i.sheinKey === sheinKey)
  if (item) {
    item.quantity = Math.max(0, parseInt(quantity, 10) || 0)
    if (item.quantity === 0) basket.items = basket.items.filter((i) => i !== item)
  }
  setBasket(basket)
  return getBasket()
}

export function removeBasketLine(item) {
  if (!item) return getBasket()
  if (item.type === 'shein' && item.sheinKey) return removeSheinFromBasket(item.sheinKey)
  if (item.type === 'catalog' || item.id != null) return removeFromBasket(item.id)
  return getBasket()
}

export function basketItemCount() {
  const basket = getBasket()
  return basket.items.reduce((n, i) => n + (i.quantity || 0), 0)
}
