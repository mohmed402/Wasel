'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from '../customer.module.css'
import { getBasket, addToBasket } from '../basket-storage'
import CustomerSiteHeader from '../CustomerSiteHeader'

export default function CustomerProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [basketCount, setBasketCount] = useState(0)
  const refreshBasketCount = useCallback(() => {
    setBasketCount(getBasket().items.reduce((n, i) => n + (i.quantity || 0), 0))
  }, [])
  useEffect(() => {
    refreshBasketCount()
  }, [refreshBasketCount])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/catalog/products', { cache: 'no-store' })
        const raw = await res.text()
        let data
        try {
          data = raw ? JSON.parse(raw) : []
        } catch {
          throw new Error('استجابة غير صالحة من الخادم')
        }
        if (!res.ok) {
          const msg = data?.error || data?.message || 'فشل تحميل المنتجات'
          throw new Error(typeof msg === 'string' ? msg : 'فشل تحميل المنتجات')
        }
        const list = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : []
        if (!cancelled) {
          setProducts(list)
          setError('')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'حدث خطأ')
          setProducts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const formatPrice = (price, currency) => {
    if (price == null || isNaN(price)) return '—'
    const n = Number(price).toFixed(2)
    return currency === 'LYD' ? `${n} د.ل` : `${n} ${currency}`
  }

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={basketCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>قائمة المنتجات</h1>
        <p className={styles.productPageIntro}>
          المنتجات المعروضة أدناه يمكن طلبها عبر صفحة سلة Shein أو إضافتها من هنا إلى سلة المشتريات.
        </p>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {loading && <div className={styles.loading}>جاري تحميل المنتجات...</div>}
        {!loading && !error && products.length === 0 && (
          <div className={styles.productListEmpty}>
            لا توجد منتجات معروضة حالياً. سيتم إضافة المنتجات من لوحة الإدارة قريباً.
          </div>
        )}
        {!loading && products.length > 0 && (
          <ul className={styles.productGrid}>
            {products.map((p) => (
              <li key={p.id} className={styles.productCard}>
                <div className={styles.productCardImageWrap}>
                  {(p.image_url || (p.images && p.images[0])) ? (
                    <img
                      src={p.image_url || p.images[0]}
                      alt={p.name_ar || p.name}
                      className={styles.productCardImage}
                      width={280}
                      height={280}
                    />
                  ) : (
                    <div className={styles.productCardImage} style={{ background: 'rgba(234,234,234,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(234,234,234,0.3)', fontSize: '2rem' }}>
                      —
                    </div>
                  )}
                </div>
                <div className={styles.productCardBody}>
                  <h2 className={styles.productCardName}>{p.name_ar || p.name}</h2>
                  {p.category && <div className={styles.productCardCategory}>{p.category}</div>}
                  <div className={styles.productCardPrice}>{formatPrice(p.price, p.currency)}</div>
                  <button
                    type="button"
                    className={styles.addToBasketBtn}
                    onClick={() => {
                      addToBasket(p, 1)
                      refreshBasketCount()
                    }}
                  >
                    إضافة إلى السلة
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className={styles.footerStrip}>
          <Link href="/" className={styles.headerNavLink}>العودة إلى الرئيسية</Link>
        </footer>
      </div>
    </div>
  )
}
