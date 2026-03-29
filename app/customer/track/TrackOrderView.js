'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from '../customer.module.css'
import CustomerSiteHeader from '../CustomerSiteHeader'
import { getBasket } from '../basket-storage'
import {
  HiSearch,
  HiShoppingBag,
  HiClock,
  HiPaperAirplane,
  HiLocationMarker,
  HiTruck,
  HiCheckCircle,
  HiBan,
} from 'react-icons/hi'

const STAGES = [
  { key: 'not_started', label: 'قيد التجهيز', Icon: HiClock },
  { key: 'international_shipping', label: 'الشحن الدولي', Icon: HiPaperAirplane },
  { key: 'arrived_libya', label: 'وصلت ليبيا', Icon: HiLocationMarker },
  { key: 'local_delivery', label: 'التوصيل المحلي', Icon: HiTruck },
  { key: 'delivered', label: 'تم التوصيل', Icon: HiCheckCircle },
]

function formatLyd(n) {
  return n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2)
}

function currentStageIndex(data) {
  if (!data || data.status === 'cancelled') return -1
  const stage = data.shipping?.shipping_stage
  if (stage) {
    const i = STAGES.findIndex((s) => s.key === stage)
    if (i >= 0) return i
  }
  if (data.status === 'delivered') return STAGES.length - 1
  return 0
}

export default function TrackOrderView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refFromUrl = searchParams.get('ref')?.trim() ?? ''

  const [refInput, setRefInput] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [basketCount, setBasketCount] = useState(0)

  const refreshBasket = useCallback(() => {
    setBasketCount(getBasket().items.reduce((n, i) => n + (i.quantity || 0), 0))
  }, [])

  useEffect(() => {
    refreshBasket()
  }, [refreshBasket])

  useEffect(() => {
    if (!refFromUrl) {
      setResult(null)
      setError('')
      setLoading(false)
      return
    }

    setRefInput(refFromUrl)
    const ac = new AbortController()
    setLoading(true)
    setError('')
    setResult(null)

    fetch(`/api/orders/track?ref=${encodeURIComponent(refFromUrl)}`, { signal: ac.signal })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || data.message || 'لم يتم العثور على الطلب')
          return
        }
        setResult(data)
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setError('حدث خطأ في الاتصال')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [refFromUrl, refreshKey])

  const onSubmit = (e) => {
    e.preventDefault()
    const r = refInput.trim()
    if (!r) {
      setError('أدخل رقم الطلب')
      return
    }
    setError('')
    if (r === refFromUrl) {
      setRefreshKey((k) => k + 1)
    } else {
      router.push(`/customer/track?ref=${encodeURIComponent(r)}`)
    }
  }

  const idx = result ? currentStageIndex(result) : -1
  const cancelled = result?.status === 'cancelled'

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={basketCount} />

      <div className={styles.content}>
        <section className={styles.trackPageSection} aria-labelledby="track-page-title">
          <div className={styles.trackPageIntro}>
            <div className={styles.trackPageIntroIconWrap} aria-hidden>
              <HiSearch className={styles.trackPageIntroIcon} />
            </div>
            <div>
              <h1 id="track-page-title" className={styles.trackPageTitle}>
                تتبع طلبك
              </h1>
              <p className={styles.trackPageSubtitle}>
                أدخل رقم المرجع (مثال: ORD-1234567890) لمشاهدة الحالة ومراحل الشحن.
              </p>
            </div>
          </div>

          <form className={styles.trackPageForm} onSubmit={onSubmit}>
            <input
              type="text"
              className={styles.trackInput}
              placeholder="رقم الطلب"
              value={refInput}
              onChange={(e) => {
                setRefInput(e.target.value)
                if (error) setError('')
              }}
              dir="ltr"
              autoComplete="off"
              aria-label="رقم الطلب"
            />
            <button type="submit" className={styles.trackBtn} disabled={loading && !!refFromUrl}>
              {loading && refFromUrl ? '...' : <HiSearch style={{ fontSize: '1.25rem' }} />}
              <span className={styles.trackBtnLabel}>بحث</span>
            </button>
          </form>

          {loading && refFromUrl && (
            <div className={styles.trackLoadingPanel} aria-live="polite">
              <div className={styles.trackLoadingSpinner} aria-hidden />
              <p className={styles.trackLoadingText}>جاري البحث عن الطلب...</p>
            </div>
          )}

          {error && !loading && <div className={styles.errorMsg}>{error}</div>}

          {result && !loading && (
            <div className={styles.trackResultPanel}>
              <div className={styles.trackResultHeader}>
                {!cancelled && (
                  <img
                    src="/track-success.gif"
                    alt=""
                    width={72}
                    height={72}
                    className={styles.trackResultHeaderGif}
                  />
                )}
                {cancelled && (
                  <div className={styles.trackResultIconCancel} aria-hidden>
                    <HiBan />
                  </div>
                )}
                <div>
                  <h2 className={styles.trackResultHeadline}>
                    {cancelled ? 'الطلب ملغي' : `حالة الطلب: ${result.status_label}`}
                  </h2>
                  <p className={styles.trackResultRef} dir="ltr">
                    {result.internal_ref}
                  </p>
                </div>
              </div>

              <ul className={styles.trackDetailList}>
                <li className={styles.trackDetailItem}>
                  <span className={styles.trackDetailIcon} aria-hidden>
                    <HiClock />
                  </span>
                  <span>التاريخ: {result.order_date}</span>
                </li>
                {result.shipping_stage_label && !cancelled && (
                  <li className={styles.trackDetailItem}>
                    <span className={styles.trackDetailIcon} aria-hidden>
                      <HiTruck />
                    </span>
                    <span>مرحلة الشحن: {result.shipping_stage_label}</span>
                  </li>
                )}
                {result.total_amount != null && (
                  <li className={styles.trackDetailItem}>
                    <span className={styles.trackDetailIcon} aria-hidden>
                      <HiShoppingBag />
                    </span>
                    <span>الإجمالي: {formatLyd(result.total_amount)} د.ل</span>
                  </li>
                )}
                {result.shipping?.international_tracking && (
                  <li className={styles.trackDetailItem}>
                    <span className={styles.trackDetailIcon} aria-hidden>
                      <HiPaperAirplane />
                    </span>
                    <span dir="ltr">دولي: {result.shipping.international_tracking}</span>
                  </li>
                )}
                {result.shipping?.local_tracking && (
                  <li className={styles.trackDetailItem}>
                    <span className={styles.trackDetailIcon} aria-hidden>
                      <HiLocationMarker />
                    </span>
                    <span dir="ltr">محلي: {result.shipping.local_tracking}</span>
                  </li>
                )}
              </ul>

              {!cancelled && (
                <div className={styles.trackTimeline} aria-label="مراحل الشحن">
                  {STAGES.map((s, i) => {
                    const isDone = i < idx
                    const isActive = i === idx
                    const Icon = s.Icon
                    return (
                      <div
                        key={s.key}
                        className={`${styles.trackTimelineStep} ${isDone ? styles.trackTimelineStepDone : ''} ${isActive ? styles.trackTimelineStepActive : ''} ${!isDone && !isActive ? styles.trackTimelineStepFuture : ''}`}
                      >
                        <div className={styles.trackTimelineIconWrap} aria-hidden>
                          {isDone ? <HiCheckCircle className={styles.trackTimelineCheck} /> : <Icon />}
                        </div>
                        <div className={styles.trackTimelineLabel}>{s.label}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <footer className={styles.footerStrip}>
          <Link href="/" className={styles.headerNavLink}>
            العودة إلى الرئيسية
          </Link>
        </footer>
      </div>
    </div>
  )
}
