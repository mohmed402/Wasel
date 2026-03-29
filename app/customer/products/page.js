'use client'

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import styles from '../customer.module.css'
import { getBasket, addToBasket } from '../basket-storage'
import CustomerSiteHeader from '../CustomerSiteHeader'
import { HiSearch, HiX } from 'react-icons/hi'

function normalizeForSearch(s) {
  if (s == null || typeof s !== 'string') return ''
  return s.toLowerCase().trim()
}

function productMatches(p, qRaw, categorySlug) {
  if (categorySlug && (p.category || '') !== categorySlug) return false
  const q = normalizeForSearch(qRaw)
  if (!q) return true
  const hay = normalizeForSearch(
    [p.name, p.name_ar, p.category, p.description, p.description_ar]
      .filter(Boolean)
      .join(' ')
  )
  const parts = q.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return true
  return parts.every((part) => hay.includes(part))
}

function ProductsView() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [basketCount, setBasketCount] = useState(0)

  const qParam = searchParams.get('q') ?? ''
  const categoryParam = searchParams.get('category') ?? ''
  const [searchInput, setSearchInput] = useState(qParam)

  const refreshBasketCount = useCallback(() => {
    setBasketCount(getBasket().items.reduce((n, i) => n + (i.quantity || 0), 0))
  }, [])

  useEffect(() => {
    refreshBasketCount()
  }, [refreshBasketCount])

  useEffect(() => {
    setSearchInput(qParam)
  }, [qParam])

  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof window === 'undefined') return
      const trimmed = searchInput.trim()
      const cur = new URLSearchParams(window.location.search)
      const urlQ = (cur.get('q') || '').trim()
      if (trimmed === urlQ) return
      if (trimmed) cur.set('q', trimmed)
      else cur.delete('q')
      const qs = cur.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput, pathname, router])

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

  const categories = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (p.category && String(p.category).trim()) set.add(String(p.category).trim())
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [products])

  const filteredProducts = useMemo(
    () => products.filter((p) => productMatches(p, searchInput, categoryParam)),
    [products, searchInput, categoryParam]
  )

  const setCategoryFilter = useCallback(
    (slug) => {
      const p = new URLSearchParams(searchParams.toString())
      if (slug) p.set('category', slug)
      else p.delete('category')
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const clearSearch = useCallback(() => {
    setSearchInput('')
    const p = new URLSearchParams(searchParams.toString())
    p.delete('q')
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const formatPrice = (price, currency) => {
    if (price == null || isNaN(price)) return '—'
    const n = Number(price).toFixed(2)
    return currency === 'LYD' ? `${n} د.ل` : `${n} ${currency}`
  }

  const showFilterEmpty =
    !loading &&
    !error &&
    products.length > 0 &&
    filteredProducts.length === 0

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={basketCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>قائمة المنتجات</h1>
        <p className={styles.productPageIntro}>
          المنتجات المعروضة أدناه يمكن طلبها عبر صفحة سلة Shein أو إضافتها من هنا إلى سلة المشتريات.
        </p>

        <div className={styles.productsToolbar} role="search">
          <div className={styles.productsSearchRow}>
            <div className={styles.productsSearchField}>
              <HiSearch className={styles.productsSearchIcon} aria-hidden />
              <input
                type="search"
                className={styles.productsSearchInput}
                placeholder="ابحث بالاسم أو التصنيف..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="بحث في المنتجات"
                autoComplete="off"
              />
              {searchInput.trim() ? (
                <button
                  type="button"
                  className={styles.productsSearchClear}
                  onClick={clearSearch}
                  aria-label="مسح البحث"
                >
                  <HiX aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {categories.length > 0 ? (
            <div className={styles.productsCategoryRow}>
              <button
                type="button"
                className={
                  categoryParam
                    ? styles.productsCategoryChip
                    : `${styles.productsCategoryChip} ${styles.productsCategoryChipActive}`
                }
                onClick={() => setCategoryFilter('')}
              >
                الكل
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={
                    categoryParam === c
                      ? `${styles.productsCategoryChip} ${styles.productsCategoryChipActive}`
                      : styles.productsCategoryChip
                  }
                  onClick={() => setCategoryFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {loading && <div className={styles.loading}>جاري تحميل المنتجات...</div>}
        {!loading && !error && products.length === 0 && (
          <div className={styles.productListEmpty}>
            لا توجد منتجات معروضة حالياً. سيتم إضافة المنتجات من لوحة الإدارة قريباً.
          </div>
        )}
        {showFilterEmpty && (
          <div className={styles.productsFilterEmpty}>
            لا توجد منتجات تطابق البحث أو التصنيف المحدد.
            <button type="button" className={styles.productsFilterReset} onClick={() => { clearSearch(); setCategoryFilter('') }}>
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
        {!loading && filteredProducts.length > 0 && (
          <ul className={styles.productGrid}>
            {filteredProducts.map((p) => (
              <li key={p.id} className={styles.productCard}>
                <div className={styles.productCardImageWrap}>
                  {(p.image_url || (p.images && p.images[0])) ? (
                    <img
                      src={p.image_url || p.images[0]}
                      alt={p.name_ar || p.name}
                      className={styles.productCardImage}
                      width={280}
                      height={280}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={styles.productCardImage}
                      style={{
                        background: 'rgba(234,234,234,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(234,234,234,0.3)',
                        fontSize: '2rem',
                      }}
                    >
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
          <Link href="/" className={styles.headerNavLink}>
            العودة إلى الرئيسية
          </Link>
          <Link href="/customer/basket" className={styles.headerNavLink}>
            سلة المشتريات
          </Link>
        </footer>
      </div>
    </div>
  )
}

function ProductsFallback() {
  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={0} />
      <div className={styles.content}>
        <div className={styles.loading}>جاري تحميل الصفحة...</div>
      </div>
    </div>
  )
}

export default function CustomerProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsView />
    </Suspense>
  )
}
