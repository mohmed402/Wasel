'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Cairo, Bebas_Neue } from 'next/font/google'
import styles from './CustomerSiteHeader.module.css'
import {
  HiHome,
  HiShoppingBag,
  HiShoppingCart,
  HiClipboardList,
  HiInformationCircle,
  HiPhone,
  HiTruck,
  HiUserGroup,
  HiUser,
  HiCollection,
  HiCube,
  HiPaperAirplane,
  HiRefresh,
} from 'react-icons/hi'
import CustomerHeaderLogo from './CustomerHeaderLogo'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-cairo',
  display: 'swap',
})

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

function LogoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#00e676" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill="#00e676" />
      <line x1="12" y1="3" x2="12" y2="6" stroke="#00e676" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke="#00e676" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LogoBlock({ small }) {
  return (
    <>
      <div className={small ? `${styles.logoMark} ${styles.logoMarkSm}` : styles.logoMark}>
        <LogoIcon className={small ? styles.logoIconSm : styles.logoIcon} />
      </div>
      <div>
        <div className={styles.logoTextMore}>
          M<span>O</span>RE
        </div>
        <span className={styles.logoSub}>Express</span>
      </div>
    </>
  )
}

/**
 * @param {{
 *   basketCount?: number,
 *   scrollToId?: (id: string) => void,
 *   activeTab?: string,
 *   setActiveTab?: (t: string) => void,
 * }} props
 */
export default function CustomerSiteHeader({
  basketCount = 0,
  scrollToId,
  activeTab = 'home',
  setActiveTab,
}) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSub, setOpenSub] = useState(null)
  const [searchQ, setSearchQ] = useState('')

  const onHome = pathname === '/' || pathname === '/customer' || pathname === '/customer/'
  const isProducts = pathname.startsWith('/customer/products')
  const isBasket = pathname.startsWith('/customer/basket')
  const isShein = pathname.startsWith('/customer/shein')
  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    setOpenSub(null)
    if (typeof document !== 'undefined') document.body.style.overflow = ''
  }, [])

  const toggleMenu = useCallback(() => {
    setMenuOpen((o) => {
      const next = !o
      if (typeof document !== 'undefined') {
        document.body.style.overflow = next ? 'hidden' : ''
      }
      if (!next) setOpenSub(null)
      return next
    })
  }, [])

  useEffect(() => {
    closeMenu()
  }, [pathname, closeMenu])

  const runSearch = () => {
    const q = searchQ.trim()
    if (q) {
      router.push(`/customer/products?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/customer/products')
    }
    closeMenu()
  }

  const onSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      runSearch()
    }
  }

  const navClass = (active) => `${styles.navItem} ${active ? styles.navItemActive : ''}`

  const homeNavActive = onHome && activeTab === 'home'
  const howtoActive = onHome && activeTab === 'howto'
  const aboutActive = onHome && activeTab === 'about'

  const goHowTo = () => {
    setActiveTab?.('howto')
    scrollToId?.('how-to-order')
    closeMenu()
  }

  const goAbout = () => {
    setActiveTab?.('about')
    scrollToId?.('about-landing')
    closeMenu()
  }

  const goPromo = () => {
    if (onHome) {
      scrollToId?.('recommendations')
    } else {
      router.push('/#recommendations')
    }
    closeMenu()
  }

  const goHomeTab = () => {
    setActiveTab?.('home')
    if (onHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    closeMenu()
  }

  const toggleSub = (key) => {
    setOpenSub((k) => (k === key ? null : key))
  }

  const sheinSectionActive = isShein || isBasket

  return (
    <div className={`${styles.root} ${cairo.variable} ${bebas.variable}`}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.topbarBadge}>
            <HiPaperAirplane className={styles.topbarBadgeIcon} aria-hidden />
            توصيل سريع
          </span>
          <Link href="/customer/track">تتبع طلبك</Link>
          <Link href="/#about-landing">تواصل معنا</Link>
        </div>
        <div className={styles.topbarRight}>
          <span>شحن مجاني للطلبات فوق 2000 دينار</span>
        </div>
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="MORE Express — الرئيسية" onClick={goHomeTab}>
          <CustomerHeaderLogo />
        </Link>

        <div className={styles.searchWrap}>
          <input
            type="search"
            placeholder="ابحث عن منتجات، ماركات..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={onSearchKeyDown}
            aria-label="بحث عن منتجات"
          />
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        <div className={styles.headerActions}>
          <Link href="/customer/products" className={`${styles.iconBtn} ${styles.desktopOnly}`} title="حسابي" aria-label="حسابي">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link href="/#recommendations" className={`${styles.iconBtn} ${styles.desktopOnly}`} title="المفضلة" aria-label="المفضلة">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </Link>
          <Link href="/customer/basket" className={styles.cartBtn} aria-label={`السلة — ${basketCount} وحدة`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className={styles.cartLabel}>السلة</span>
            <span className={styles.cartCount}>{basketCount}</span>
          </Link>
          <button
            type="button"
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={styles.mobileSearch}>
        <input
          type="search"
          placeholder="ابحث عن منتجات، ماركات..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          onKeyDown={onSearchKeyDown}
          aria-label="بحث عن منتجات"
        />
        <svg className={styles.sIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      <nav className={styles.navbar} aria-label="التنقل الرئيسي">
        <Link href="/" className={navClass(homeNavActive)} onClick={goHomeTab}>
          <span className={styles.navDot} aria-hidden />
          الرئيسية
        </Link>
        <div className={styles.navDivider} aria-hidden />

        <div className={styles.navDropWrap}>
          <Link href="/customer/products" className={`${styles.navItem} ${styles.navDropTrigger} ${isProducts ? styles.navItemActive : ''}`}>
            المنتجات
            <svg className={styles.dropArrow} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Link>
          <div className={styles.dropdown}>
            <Link href="/customer/products" className={styles.dropItem}>
              <HiShoppingBag className={styles.dropIconSvg} aria-hidden /> عرض الكل
            </Link>
            <Link href="/customer/products" className={styles.dropItem}>
              <HiUserGroup className={styles.dropIconSvg} aria-hidden /> ملابس نسائية
            </Link>
            <Link href="/customer/products" className={styles.dropItem}>
              <HiUser className={styles.dropIconSvg} aria-hidden /> ملابس رجالية
            </Link>
            <Link href="/customer/products" className={styles.dropItem}>
              <HiCube className={styles.dropIconSvg} aria-hidden /> أحذية
            </Link>
            <Link href="/customer/products" className={styles.dropItem}>
              <HiCollection className={styles.dropIconSvg} aria-hidden /> حقائب وإكسسوارات
            </Link>
            <Link href="/customer/products" className={styles.dropItem}>
              <HiHome className={styles.dropIconSvg} aria-hidden /> المنزل والديكور
            </Link>
          </div>
        </div>
        <div className={styles.navDivider} aria-hidden />

        <div className={styles.navDropWrap}>
          <Link href="/customer/shein" className={`${styles.navItem} ${styles.navDropTrigger} ${sheinSectionActive ? styles.navItemActive : ''}`}>
            سلة Shein
            <svg className={styles.dropArrow} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Link>
          <div className={styles.dropdown}>
            <Link href="/customer/basket" className={styles.dropItem}>
              <HiShoppingCart className={styles.dropIconSvg} aria-hidden /> سلة المشتريات
            </Link>
            <Link href="/customer/track" className={styles.dropItem}>
              <HiClipboardList className={styles.dropIconSvg} aria-hidden /> طلباتي
            </Link>
            <Link href="/#about-landing" className={styles.dropItem}>
              <HiRefresh className={styles.dropIconSvg} aria-hidden /> الإرجاع والاستبدال
            </Link>
          </div>
        </div>
        <div className={styles.navDivider} aria-hidden />

        <Link
          href={onHome ? '/#how-to-order' : '/customer/how-to-order'}
          className={navClass(howtoActive)}
          onClick={(e) => {
            if (!onHome) return
            e.preventDefault()
            goHowTo()
          }}
        >
          كيفية الطلب
        </Link>
        <div className={styles.navDivider} aria-hidden />

        <Link
          href="/#about-landing"
          className={navClass(aboutActive)}
          onClick={(e) => {
            if (!onHome) return
            e.preventDefault()
            goAbout()
          }}
        >
          من نحن
        </Link>

        <div className={styles.navSpacer} aria-hidden />
        <button type="button" className={styles.navPromo} onClick={goPromo}>
          <span className={styles.pulse} aria-hidden />
          عروض اليوم
        </button>
      </nav>

      <button
        type="button"
        className={`${styles.mobileOverlay} ${menuOpen ? styles.mobileOverlayOpen : ''}`}
        aria-label="إغلاق القائمة"
        onClick={toggleMenu}
      />

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`} id="customer-mobile-menu">
        <div className={styles.mobileMenuHeader}>
          <Link href="/" className={styles.logo} onClick={goHomeTab} aria-label="الرئيسية">
            <LogoBlock small />
          </Link>
          <button type="button" className={styles.mobileClose} onClick={toggleMenu} aria-label="إغلاق">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button type="button" className={styles.mobilePromoBanner} onClick={goPromo}>
          <span className={styles.pulse} aria-hidden />
          عروض اليوم – خصومات تصل لـ 70%
        </button>

        <nav className={styles.mobileNav} aria-label="قائمة الجوال">
          <Link
            href="/"
            className={`${styles.mobileNavItem} ${homeNavActive ? styles.mobileNavItemActive : ''}`}
            onClick={goHomeTab}
          >
            <div className={styles.itemLeft}>
              <HiHome className={styles.navIconSvg} aria-hidden />
              الرئيسية
            </div>
          </Link>

          <button
            type="button"
            className={`${styles.mobileNavItem} ${openSub === 'products' ? styles.mobileNavItemSubOpen : ''}`}
            onClick={() => toggleSub('products')}
          >
            <div className={styles.itemLeft}>
              <HiShoppingBag className={styles.navIconSvg} aria-hidden />
              المنتجات
            </div>
            <svg className={styles.mobileChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div className={`${styles.mobileSub} ${openSub === 'products' ? styles.mobileSubOpen : ''}`}>
            <Link href="/customer/products" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiShoppingBag className={styles.mobileSubIconSvg} aria-hidden /> عرض الكل
            </Link>
            <Link href="/customer/products" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiUserGroup className={styles.mobileSubIconSvg} aria-hidden /> ملابس نسائية
            </Link>
            <Link href="/customer/products" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiUser className={styles.mobileSubIconSvg} aria-hidden /> ملابس رجالية
            </Link>
            <Link href="/customer/products" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiCube className={styles.mobileSubIconSvg} aria-hidden /> أحذية
            </Link>
            <Link href="/customer/products" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiCollection className={styles.mobileSubIconSvg} aria-hidden /> حقائب وإكسسوارات
            </Link>
            <Link href="/customer/products" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiHome className={styles.mobileSubIconSvg} aria-hidden /> المنزل والديكور
            </Link>
          </div>

          <button
            type="button"
            className={`${styles.mobileNavItem} ${openSub === 'shein' ? styles.mobileNavItemSubOpen : ''}`}
            onClick={() => toggleSub('shein')}
          >
            <div className={styles.itemLeft}>
              <HiShoppingCart className={styles.navIconSvg} aria-hidden />
              سلة Shein
            </div>
            <svg className={styles.mobileChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div className={`${styles.mobileSub} ${openSub === 'shein' ? styles.mobileSubOpen : ''}`}>
            <Link href="/customer/basket" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiShoppingCart className={styles.mobileSubIconSvg} aria-hidden /> سلة المشتريات
            </Link>
            <Link href="/customer/track" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiClipboardList className={styles.mobileSubIconSvg} aria-hidden /> طلباتي
            </Link>
            <Link href="/#about-landing" className={styles.mobileSubItem} onClick={closeMenu}>
              <HiRefresh className={styles.mobileSubIconSvg} aria-hidden /> الإرجاع والاستبدال
            </Link>
          </div>

          {onHome ? (
            <button type="button" className={`${styles.mobileNavItem} ${howtoActive ? styles.mobileNavItemActive : ''}`} onClick={goHowTo}>
              <div className={styles.itemLeft}>
                <HiClipboardList className={styles.navIconSvg} aria-hidden />
                كيفية الطلب
              </div>
            </button>
          ) : (
            <Link href="/customer/how-to-order" className={styles.mobileNavItem} onClick={closeMenu}>
              <div className={styles.itemLeft}>
                <HiClipboardList className={styles.navIconSvg} aria-hidden />
                كيفية الطلب
              </div>
            </Link>
          )}

          {onHome ? (
            <button type="button" className={`${styles.mobileNavItem} ${aboutActive ? styles.mobileNavItemActive : ''}`} onClick={goAbout}>
              <div className={styles.itemLeft}>
                <HiInformationCircle className={styles.navIconSvg} aria-hidden />
                من نحن
              </div>
            </button>
          ) : (
            <Link href="/#about-landing" className={styles.mobileNavItem} onClick={closeMenu}>
              <div className={styles.itemLeft}>
                <HiInformationCircle className={styles.navIconSvg} aria-hidden />
                من نحن
              </div>
            </Link>
          )}

          <Link href="/#about-landing" className={styles.mobileNavItem} onClick={closeMenu}>
            <div className={styles.itemLeft}>
              <HiPhone className={styles.navIconSvg} aria-hidden />
              تواصل معنا
            </div>
          </Link>
          <Link href="/customer/track" className={styles.mobileNavItem} onClick={closeMenu}>
            <div className={styles.itemLeft}>
              <HiTruck className={styles.navIconSvg} aria-hidden />
              تتبع طلبك
            </div>
          </Link>
        </nav>

        <div className={styles.mobileMenuFooter}>
          <Link href="/customer/products" className={`${styles.mobileFooterBtn} ${styles.mobileFooterBtnOutlined}`} onClick={closeMenu}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            حسابي
          </Link>
          <Link href="/customer/basket" className={`${styles.mobileFooterBtn} ${styles.mobileFooterBtnFilled}`} onClick={closeMenu}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            السلة ({basketCount})
          </Link>
        </div>
      </div>
    </div>
  )
}
