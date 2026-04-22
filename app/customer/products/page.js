'use client'

import {
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import styles from '../customer.module.css'
import { getBasket, addToBasket, parseCatalogStockLimit } from '../basket-storage'
import CustomerSiteHeader from '../CustomerSiteHeader'
import { HiSearch, HiX, HiCheckCircle, HiShoppingBag } from 'react-icons/hi'

function normalizeForSearch(s) {
  if (s == null || typeof s !== 'string') return ''
  return s.toLowerCase().trim()
}

function productMatches(p, qRaw, categorySlug, categoryLabels = {}) {
  if (categorySlug && (p.category || '') !== categorySlug) return false
  const q = normalizeForSearch(qRaw)
  if (!q) return true
  const catForSearch = categoryLabels[p.category] || p.category
  const hay = normalizeForSearch(
    [p.name, p.name_ar, catForSearch, p.size, p.description, p.description_ar]
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
  const [categoriesFromApi, setCategoriesFromApi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [basketCount, setBasketCount] = useState(0)
  const [toast, setToast] = useState(null) // { name, id }
  const toastTimer = useRef(null)

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
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/catalog/products', { cache: 'no-store' }),
          fetch('/api/catalog/categories', { cache: 'no-store' }),
        ])
        const prodRaw = await prodRes.text()
        let prodData
        try {
          prodData = prodRaw ? JSON.parse(prodRaw) : []
        } catch {
          throw new Error('استجابة غير صالحة من الخادم')
        }
        if (!prodRes.ok) {
          const msg = prodData?.error || prodData?.message || 'فشل تحميل المنتجات'
          throw new Error(typeof msg === 'string' ? msg : 'فشل تحميل المنتجات')
        }
        const list = Array.isArray(prodData)
          ? prodData
          : Array.isArray(prodData?.products)
            ? prodData.products
            : []

        let catList = []
        if (catRes.ok) {
          const catRaw = await catRes.text()
          try {
            const parsed = catRaw ? JSON.parse(catRaw) : []
            if (Array.isArray(parsed)) catList = parsed
          } catch {
            /* ignore */
          }
        }

        if (!cancelled) {
          setProducts(list)
          setCategoriesFromApi(catList)
          setError('')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'حدث خطأ')
          setProducts([])
          setCategoriesFromApi([])
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

  const categoryLabelBySlug = useMemo(
    () => Object.fromEntries(categoriesFromApi.map((c) => [c.slug, c.name_ar])),
    [categoriesFromApi]
  )

  const categories = useMemo(() => {
    if (categoriesFromApi.length > 0) {
      return [...categoriesFromApi].sort(
        (a, b) =>
          (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
          String(a.name_ar).localeCompare(String(b.name_ar), 'ar')
      )
    }
    const set = new Set()
    products.forEach((p) => {
      if (p.category && String(p.category).trim()) set.add(String(p.category).trim())
    })
    return [...set].sort((a, b) => a.localeCompare(b, 'ar')).map((slug) => ({
      slug,
      name_ar: slug,
      sort_order: 0,
    }))
  }, [categoriesFromApi, products])

  const filteredProducts = useMemo(
    () =>
      products.filter((p) =>
        productMatches(p, searchInput, categoryParam, categoryLabelBySlug)
      ),
    [products, searchInput, categoryParam, categoryLabelBySlug]
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

      {/* Toast notification */}
      {toast && (
        <div className={styles.addToastWrap} role="status" aria-live="polite">
          <div className={`${styles.addToast} ${toast.error ? styles.addToastError : ''}`}>
            {toast.error ? (
              <div className={styles.addToastText}>
                <span className={styles.addToastTitle}>{toast.error}</span>
              </div>
            ) : (
              <>
                <HiCheckCircle className={styles.addToastIcon} aria-hidden />
                <div className={styles.addToastText}>
                  <span className={styles.addToastTitle}>تمت الإضافة إلى السلة</span>
                  <span className={styles.addToastName}>{toast.name}</span>
                </div>
                <Link href="/customer/basket" className={styles.addToastBtn}>
                  <HiShoppingBag aria-hidden /> عرض السلة
                </Link>
              </>
            )}
            <button type="button" className={styles.addToastClose} onClick={() => { clearTimeout(toastTimer.current); setToast(null) }} aria-label="إغلاق">
              <HiX aria-hidden />
            </button>
          </div>
        </div>
      )}

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
                  key={c.slug}
                  type="button"
                  className={
                    categoryParam === c.slug
                      ? `${styles.productsCategoryChip} ${styles.productsCategoryChipActive}`
                      : styles.productsCategoryChip
                  }
                  onClick={() => setCategoryFilter(c.slug)}
                >
                  {c.name_ar}
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
            {filteredProducts.map((p) => {
              const stock = parseCatalogStockLimit(p)
              return (
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
                  {p.category && (
                    <div className={styles.productCardCategory}>
                      {categoryLabelBySlug[p.category] || p.category}
                    </div>
                  )}
                  {p.size ? (
                    <div className={styles.productCardSize}>المقاس: {p.size}</div>
                  ) : null}
                  {stock != null ? (
                    <div className={styles.productCardStock}>
                      {stock === 0 ? 'غير متوفر' : `المتوفر: ${stock}`}
                    </div>
                  ) : null}
                  <div className={styles.productCardPrice}>{formatPrice(p.price, p.currency)}</div>
                  <button
                    type="button"
                    className={styles.addToBasketBtn}
                    disabled={stock === 0}
                    onClick={() => {
                      const res = addToBasket(p, 1)
                      refreshBasketCount()
                      clearTimeout(toastTimer.current)
                      if (!res.ok) {
                        setToast({
                          error:
                            res.reason === 'out_of_stock'
                              ? 'المنتج غير متوفر حالياً'
                              : 'لا يمكن إضافة أكثر من الكمية المتوفرة في المخزون',
                        })
                      } else {
                        setToast({ name: p.name_ar || p.name, id: p.id })
                      }
                      toastTimer.current = setTimeout(() => setToast(null), 3000)
                    }}
                  >
                    {stock === 0 ? 'غير متوفر' : 'إضافة إلى السلة'}
                  </button>
                </div>
              </li>
              )
            })}
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
