'use client'

import { useEffect, useState } from 'react'
import styles from './SheinBasketLinkLoader.module.css'

const MESSAGES = [
  'جاري جلب محتويات السلة...',
  'جاري تحليل المنتجات...',
  'جاري حساب الأسعار بالدينار...',
  'لحظات وستكون السلة جاهزة...',
]

/** Shown while POST /api/shein/cart-items is in flight from the Shein basket link flow. */
export default function SheinBasketLinkLoader({ className = '' }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setMsgIndex(i => (i + 1) % MESSAGES.length),
      1900,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      aria-busy="true"
      dir="rtl"
    >
      {/* ── Animated bag + falling items ── */}
      <div className={styles.visual} aria-hidden="true">
        <div className={styles.items}>
          <span className={`${styles.item} ${styles.itemA}`} />
          <span className={`${styles.item} ${styles.itemB}`} />
          <span className={`${styles.item} ${styles.itemC}`} />
        </div>

        <svg
          className={styles.bagSvg}
          viewBox="0 0 56 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M18 16 Q18 6 28 6 Q38 6 38 16"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M8 16 L4 52 Q4 56 8 56 L48 56 Q52 56 52 52 L48 16 Z"
            stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path className={styles.bagFill}
            d="M10 18 L6 51 Q6 54 10 54 L46 54 Q50 54 50 51 L46 18 Z"
            fill="currentColor" />
        </svg>

        <div className={styles.glow} />
      </div>

      {/* ── Cycling Arabic status message ── */}
      <p key={msgIndex} className={styles.label}>
        {MESSAGES[msgIndex]}
      </p>

      {/* ── Skeleton product rows matching the real list layout ── */}
      <div className={styles.skeletons} aria-hidden="true">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={styles.skRow}
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className={styles.skPrice} />
            <div className={styles.skBody}>
              <div className={styles.skLine} style={{ width: `${[62, 55, 70][i]}%` }} />
              <div className={styles.skLine}
                style={{ width: `${[36, 30, 44][i]}%`, animationDelay: '0.18s' }} />
            </div>
            <div className={styles.skThumb} />
          </div>
        ))}
      </div>
    </div>
  )
}