'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './customer.module.css'

/**
 * @param {{ scrollToId?: (id: string) => void, activeTab: string, setActiveTab: (t: string) => void }} props
 */
export default function CustomerCategoryTabs({ scrollToId, activeTab, setActiveTab }) {
  const pathname = usePathname() ?? ''
  const onHome = pathname === '/' || pathname === '/customer' || pathname === '/customer/'

  const isProducts = pathname.startsWith('/customer/products')
  const isBasket = pathname.startsWith('/customer/basket')
  const isShein = pathname.startsWith('/customer/shein')

  const cls = (key) => {
    if (key === 'basket') {
      return isBasket ? styles.categoryTabActive : styles.categoryTab
    }
    if (key === 'products') {
      return isProducts ? styles.categoryTabActive : styles.categoryTab
    }
    if (key === 'shein') {
      return isShein ? styles.categoryTabActive : styles.categoryTab
    }
    if (key === 'howto') {
      return onHome && activeTab === 'howto' ? styles.categoryTabActive : styles.categoryTab
    }
    if (!onHome) {
      return styles.categoryTab
    }
    return activeTab === key ? styles.categoryTabActive : styles.categoryTab
  }

  return (
    <div className={styles.categoryTabsWrap}>
      <div className={styles.categoryTabs} role="tablist" aria-label="أقسام الموقع">
        <Link
          href="/"
          role="tab"
          aria-selected={onHome && activeTab === 'home'}
          className={cls('home')}
          onClick={(e) => {
            if (!onHome) return
            e.preventDefault()
            setActiveTab('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          الرئيسية
        </Link>
        <Link href="/customer/shein" role="tab" aria-selected={isShein} className={cls('shein')}>
          سلة Shein
        </Link>
        <Link
          href="/customer/products"
          role="tab"
          aria-selected={isProducts}
          className={cls('products')}
          onClick={() => onHome && setActiveTab('products')}
        >
          المنتجات
        </Link>
        <Link href="/customer/basket" role="tab" aria-selected={isBasket} className={cls('basket')}>
          سلة المشتريات
        </Link>
        <Link
          href="/#how-to-order"
          role="tab"
          aria-selected={onHome && activeTab === 'howto'}
          className={cls('howto')}
          onClick={(e) => {
            if (!onHome) return
            e.preventDefault()
            setActiveTab('howto')
            scrollToId?.('how-to-order')
          }}
        >
          كيفية الطلب
        </Link>
        <Link
          href="/#about-landing"
          role="tab"
          aria-selected={onHome && activeTab === 'about'}
          className={cls('about')}
          onClick={(e) => {
            if (!onHome) return
            e.preventDefault()
            setActiveTab('about')
            scrollToId?.('about-landing')
          }}
        >
          من نحن
        </Link>
      </div>
    </div>
  )
}
