'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HiEye, HiX } from 'react-icons/hi'
import styles from './customer.module.css'
import SheinBasketLinkLoader from './SheinBasketLinkLoader'
import { buildSheinKey, replaceSheinLinesFromCartShare } from './basket-storage'

function mapApiItemToPreview(it, index) {
  const base = {
    productId: it.productId ?? null,
    sku: it.sku != null ? String(it.sku) : '',
    variant: it.variant || null,
    name: it.name || 'منتج',
    price: typeof it.price === 'number' ? it.price : parseFloat(it.price) || 0,
    currency: it.currency || 'USD',
    qty: Math.max(1, parseInt(it.qty ?? it.quantity, 10) || 1),
    image: it.image || it.images?.[0],
    images: it.images || (it.image ? [it.image] : []),
  }
  const sheinKey = `${buildSheinKey(base)}#${index}`
  return { ...base, sheinKey, rowId: `row-${index}-${sheinKey}` }
}

export default function SheinTools() {
  const router = useRouter()
  const [basketLink, setBasketLink] = useState('')
  const [basketItems, setBasketItems] = useState([])
  const [loadedCartShareUrl, setLoadedCartShareUrl] = useState(null)
  const [basketLoading, setBasketLoading] = useState(false)
  const [basketError, setBasketError] = useState('')
  const [exchangeRate, setExchangeRate] = useState(5.2)

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => setExchangeRate(d.USD || 5.2))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const h = window.location.hash
    if (h === '#tools' || h === '#tools-view' || h === '#tools-share' || h === '#tools-add') {
      const target = `${window.location.pathname}${window.location.search}#tools-view`
      window.history.replaceState(null, '', target)
    }
  }, [])

  const handleFetchBasket = async () => {
    const link = basketLink.trim()
    if (!link || !link.includes('shein.com') || !link.includes('cart/share')) {
      setBasketError('أدخل رابط مشاركة سلة Shein (يجب أن يحتوي على cart/share)')
      return
    }
    setBasketError('')
    setBasketItems([])
    setLoadedCartShareUrl(null)
    setBasketLoading(true)
    try {
      let url = link
      try {
        const u = new URL(link)
        if (u.hostname.includes('shein.com') && !u.searchParams.has('currency')) {
          u.searchParams.set('currency', 'USD')
          url = u.toString()
        }
      } catch (_) {}
      const res = await fetch('/api/shein/cart-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartShareUrl: url }),
        signal: AbortSignal.timeout(70000),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setBasketError(data.error || data.message || 'فشل جلب السلة')
        return
      }
      setLoadedCartShareUrl(url)
      setBasketItems((data.items || []).map((it, i) => mapApiItemToPreview(it, i)))
    } catch (e) {
      setBasketError(e.name === 'AbortError' ? 'انتهت المهلة' : 'حدث خطأ في الاتصال')
    } finally {
      setBasketLoading(false)
    }
  }

  const bumpQty = (rowId, delta) => {
    setBasketItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item
        const next = (item.qty || 1) + delta
        if (next < 1) return item
        return { ...item, qty: next }
      })
    )
  }

  const removeLine = (rowId) => {
    setBasketItems((prev) => prev.filter((item) => item.rowId !== rowId))
  }

  const handleContinueToBasket = () => {
    if (!loadedCartShareUrl || basketItems.length === 0) return
    replaceSheinLinesFromCartShare({
      cartShareUrl: loadedCartShareUrl,
      lines: basketItems,
    })
    router.push('/customer/basket')
  }

  const basketTotalUsd = basketItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)
  const basketTotalLyd = basketTotalUsd * exchangeRate

  const formatLyd = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))
  const formatUsd = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))

  return (
    <section id="shein-tools" className={`${styles.section} ${styles.toolsAnchor}`}>
      <div className={styles.sheinToolsPanelHead}>
        <HiEye className={styles.sheinToolsPanelHeadIcon} aria-hidden />
        عرض السلة
      </div>

      <div className={styles.tabPanel}>
        <p className={styles.rateNote}>
          سعر الصرف: <strong>1 USD = {exchangeRate} د.ل</strong> (يُحدّث تلقائياً)
        </p>
        <div className={styles.basketInputRow}>
          <input
            type="url"
            className={styles.basketInput}
            placeholder="رابط مشاركة السلة من تطبيق Shein (cart/share)..."
            value={basketLink}
            onChange={(e) => setBasketLink(e.target.value)}
          />
          <button type="button" className={styles.fetchBtn} onClick={handleFetchBasket} disabled={basketLoading}>
            {basketLoading ? 'جاري التحميل...' : 'عرض السلة'}
          </button>
        </div>
        {basketError && <div className={styles.errorMsg}>{basketError}</div>}
        {basketLoading && <SheinBasketLinkLoader />}
        {basketItems.length > 0 && (
          <>
            <ul className={styles.basketItems}>
              {basketItems.map((item) => (
                <li key={item.rowId} className={styles.basketItem}>
                  {item.image && (
                    <img src={item.image} alt="" className={styles.basketItemImg} width={54} height={54} />
                  )}
                  <div className={styles.basketItemInfo}>
                    <div className={styles.basketItemName}>{item.name}</div>
                    <div className={styles.basketItemMeta}>
                      {formatUsd(item.price)} {item.currency} للوحدة
                      {item.variant ? ` · ${item.variant}` : ''}
                    </div>
                  </div>
                  <div className={styles.basketQtyControl} aria-label="الكمية">
                    <button
                      type="button"
                      className={styles.basketQtyBtn}
                      onClick={() => bumpQty(item.rowId, -1)}
                      disabled={(item.qty || 0) <= 1}
                      aria-label="تقليل الكمية"
                    >
                      −
                    </button>
                    <span className={styles.basketQtyValue}>{item.qty || 1}</span>
                    <button
                      type="button"
                      className={styles.basketQtyBtn}
                      onClick={() => bumpQty(item.rowId, 1)}
                      aria-label="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                  <span className={styles.basketItemPrice}>
                    {formatLyd((item.price || 0) * (item.qty || 1) * exchangeRate)} د.ل
                  </span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeLine(item.rowId)}
                    aria-label="إزالة من القائمة"
                  >
                    <HiX />
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>الإجمالي بالدينار الليبي</span>
              <span className={styles.totalAmount}>{formatLyd(basketTotalLyd)} د.ل</span>
            </div>
            <div className={styles.sheinPreviewActions}>
              <button type="button" className={styles.checkoutStartBtn} onClick={handleContinueToBasket}>
                متابعة إلى سلة الطلب
              </button>
              <p className={styles.sheinPreviewHint}>
                يتم نقل الأصناف المعروضة أعلاه إلى سلة الطلب مع الحفاظ على منتجات الكتالوج إن وُجدت.
              </p>
            </div>
          </>
        )}

        <p className={styles.rateNote} style={{ marginTop: '1.25rem' }}>
          <strong>كيف تحصل على الرابط؟</strong> بعد نسخ الرابط من Shein، الصقه في الحقل أعلاه لتحويل الأسعار إلى الدينار الليبي.
        </p>
        <div className={styles.featuresGrid} style={{ marginTop: '0.5rem' }}>
          <div className={styles.featCard}>
            <div className={styles.featIcon} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div className={styles.featCardTitle}>1) افتح السلة</div>
            <p className={styles.featCardDesc}>
              افتح تطبيق أو موقع <strong>Shein</strong> ثم اذهب إلى <strong>السلة</strong>.
            </p>
          </div>

          <div className={styles.featCard}>
            <div className={styles.featIcon} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                <path d="M16 6l-4-4-4 4" />
                <path d="M12 2v13" />
              </svg>
            </div>
            <div className={styles.featCardTitle}>2) اختر مشاركة</div>
            <p className={styles.featCardDesc}>
              استخدم خيار <strong>مشاركة</strong> أو <strong>Share</strong> للسلة.
            </p>
          </div>

          <div className={`${styles.featCard} ${styles.featCardWide}`}>
            <div className={styles.featIcon} aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L11.5 5" />
                <path d="M14 11a5 5 0 0 0-7.54-.54L4.54 12.38a5 5 0 0 0 7.07 7.07L12.5 19" />
              </svg>
            </div>
            <div>
              <div className={styles.featCardTitle}>3) انسخ الرابط الصحيح</div>
              <p className={styles.featCardDesc}>
                تأكد أن الرابط يحتوي على <strong>cart/share</strong> ثم انسخه والصقه في الحقل أعلاه.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
