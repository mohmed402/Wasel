'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import styles from '../customer.module.css'
import { getBasket } from '../basket-storage'
import SheinTools from '../SheinTools'
import CustomerSiteHeader from '../CustomerSiteHeader'

export default function CustomerSheinPage() {
  const [basketCount, setBasketCount] = useState(0)
  const refreshBasketCount = useCallback(() => {
    setBasketCount(getBasket().items.reduce((n, i) => n + (i.quantity || 0), 0))
  }, [])
  useEffect(() => {
    refreshBasketCount()
  }, [refreshBasketCount])

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={basketCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>سلة Shein</h1>
        <p style={{ color: 'rgba(234,234,234,0.7)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          الصق رابط مشاركة السلة لعرض المحتويات والإجمالي بالدينار، أو أضف منتجات برابط Shein.
        </p>

        <SheinTools />

        <footer className={styles.footerStrip}>
          <Link href="/" className={styles.headerNavLink}>العودة إلى الرئيسية</Link>
        </footer>
      </div>
    </div>
  )
}
