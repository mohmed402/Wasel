'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import styles from './customer.module.css'
import {
  HiSearch,
  HiChevronLeft,
  HiShoppingCart, HiCreditCard, HiTruck, HiLink, HiArrowLeft,
} from 'react-icons/hi'
import { getBasket, replaceSheinLinesFromCartShare } from './basket-storage'
import SheinBasketLinkLoader from './SheinBasketLinkLoader'
import CustomerSiteHeader from './CustomerSiteHeader'

function buildSheinKey(it) {
  return [it.productId, it.sku, it.variant].filter(Boolean).join('-') || String(it.name || '').slice(0, 40)
}

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

const howToSteps = [
  {
    step: 1,
    icon: HiLink,
    text: 'الصق رابط مشاركة سلتك من تطبيق Shein مباشرةً في الحقل أدناه، وشاهد الأسعار بالدينار الليبي فوراً.',
  },
  {
    step: 2,
    icon: HiCreditCard,
    text: 'سيؤكد فريقنا طلبك فور استلام العربون.',
  },
  {
    step: 3,
    icon: HiTruck,
    text: 'يصل طلبك إلى ليبيا ويُرسَل إليك أينما كنت في أي مدينة داخل ليبيا.',
  },
]

export default function CustomerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [trackRef, setTrackRef] = useState('')
  const [trackHint, setTrackHint] = useState('')

  // Basket link state (now on hero)
  const [basketLink, setBasketLink] = useState('')
  const [basketLoading, setBasketLoading] = useState(false)
  const [basketError, setBasketError] = useState('')
  const [exchangeRate, setExchangeRate] = useState(6.0)
  const [heroTab, setHeroTab] = useState('basket') // 'basket' | 'track'

  const [savedBasketItems, setSavedBasketItems] = useState([])
  const [activeTab, setActiveTab] = useState('home')

  const scrollToId = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const refreshSavedBasket = useCallback(() => {
    setSavedBasketItems(getBasket().items)
  }, [])

  useEffect(() => { refreshSavedBasket() }, [refreshSavedBasket])

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => setExchangeRate(d.USD || 6.0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const r = searchParams.get('ref')?.trim()
    if (!r) return
    router.replace(`/customer/track?ref=${encodeURIComponent(r)}`)
  }, [searchParams, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname
    const onCustomerHome = path === '/' || path === '/customer' || path === '/customer/'
    if (!onCustomerHome) return
    const h = window.location.hash
    if (h === '#tools' || h === '#tools-view' || h === '#tools-share' || h === '#tools-add') {
      router.replace('/customer/shein#tools-view')
    }
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#how-to-order') {
      setActiveTab('howto')
      requestAnimationFrame(() => {
        document.getElementById('how-to-order')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  const goToTrack = () => {
    const ref = trackRef.trim()
    if (!ref) {
      setTrackHint('أدخل رقم الطلب')
      return
    }
    setTrackHint('')
    router.push(`/customer/track?ref=${encodeURIComponent(ref)}`)
  }

  const handleFetchBasket = async () => {
    const link = basketLink.trim()
    if (!link || !link.includes('shein.com') || !link.includes('cart/share')) {
      setBasketError('أدخل رابط مشاركة سلة Shein (يجب أن يحتوي على cart/share)')
      return
    }
    setBasketError('')
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
      const lines = (data.items || []).map((it, i) => mapApiItemToPreview(it, i))
      replaceSheinLinesFromCartShare({ cartShareUrl: url, lines })
      refreshSavedBasket()
      router.push('/customer/basket')
    } catch (e) {
      setBasketError(e.name === 'AbortError' ? 'انتهت المهلة' : 'حدث خطأ في الاتصال')
    } finally {
      setBasketLoading(false)
    }
  }

  const u = (photoId, w = 800) =>
    `https://images.unsplash.com/${photoId}?w=${w}&q=82&auto=format&fit=crop`

  const recoCards = [
    {
      title: 'تتبع طلبك',
      chip: 'تتبع',
      desc: 'أدخل رقم الطلب لمتابعة الحالة ومرحلة الشحن حتى التوصيل.',
      href: '/customer/track',
      link: true,
      image: '/track-order.png',
      imageAlt: 'طرود وشحن',
    },
    {
      title: 'سلة Shein بالدينار',
      chip: 'تحويل',
      desc: 'الصق رابط مشاركة السلة لعرض المحتويات والإجمالي بالدينار الليبي.',
      href: '/customer/shein',
      link: true,
      image: u('photo-1556742049-0cfed4f6a45d'),
      imageAlt: 'تسوق إلكتروني',
    },
    {
      title: 'قائمة المنتجات',
      chip: 'تسوق',
      desc: 'تصفح المنتجات المعروضة وأضف إلى السلة أو أضف منتجات من Shein برابط.',
      href: '/customer/products',
      link: true,
      image: u('photo-1441986300917-64674bd600d8'),
      imageAlt: 'متجر أزياء',
    },
  ]

  const navBasketCount = savedBasketItems.reduce((n, i) => n + (i.quantity || 0), 0)

  return (
    <div className={styles.page}>

      <CustomerSiteHeader
        basketCount={navBasketCount}
        scrollToId={scrollToId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* ── HERO ── */}
      <section id="basket-link-section" className={styles.landingHero} aria-label="ترحيب">
        <div className={styles.landingHeroBg}>
          <Image src="/customer-hero.jpg" alt="" fill priority className={styles.landingHeroBgImg} sizes="100vw" />
        </div>
        <div className={styles.landingHeroScrims} aria-hidden />
        <div className={styles.landingHeroGlow} aria-hidden />
        <div className={styles.landingHeroWatermark} aria-hidden>
          <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </div>
        <div className={styles.landingHeroInner}>
          <h1 className={styles.landingHeroTitle}>
            مرحباً بكم في{' '}
            <span className={styles.heroBrandWordmark} aria-label="MORE Express">
              <Image
                src="/more-express-wordmark.png"
                alt="MORE Express"
                width={1024}
                height={173}
                className={styles.heroBrandWordmarkImg}
                priority
              />
            </span>
          </h1>
          <p className={styles.landingHeroSubtitle}>
            أسرع طريقة لطلب منتجاتك من Shein إلى ليبيا — بالدينار الليبي.
          </p>

          {/* Hero tab switcher */}
          <div className={styles.heroTabSwitch}>
            <button
              type="button"
              className={heroTab === 'basket' ? styles.heroTabActive : styles.heroTab}
              onClick={() => setHeroTab('basket')}
            >
              <HiShoppingCart aria-hidden style={{ fontSize: '0.95em' }} />
              رابط سلة Shein
            </button>
            <button
              type="button"
              className={heroTab === 'track' ? styles.heroTabActive : styles.heroTab}
              onClick={() => setHeroTab('track')}
            >
              <HiSearch aria-hidden style={{ fontSize: '0.95em' }} />
              تتبع طلب
            </button>
          </div>

          {heroTab === 'basket' && (
            <>
              <div className={styles.landingHeroSearch}>
                <input
                  type="url"
                  className={styles.landingHeroSearchInput}
                  placeholder="الصق رابط مشاركة سلة Shein هنا..."
                  value={basketLink}
                  onChange={(e) => {
                    setBasketLink(e.target.value)
                    if (basketError) setBasketError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !basketLoading && handleFetchBasket()}
                  dir="ltr"
                />
                <button
                  type="button"
                  className={styles.landingHeroSearchBtn}
                  onClick={handleFetchBasket}
                  disabled={basketLoading}
                  aria-label="عرض السلة"
                >
                  {basketLoading ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  ) : (
                    <HiArrowLeft />
                  )}
                </button>
              </div>
              {basketError && <p className={styles.trackHeroHint} style={{ color: '#fca5a5' }}>{basketError}</p>}
              {basketLoading && <SheinBasketLinkLoader />}
              <p className={styles.heroBasketHint}>
                <strong>كيف تحصل على الرابط؟</strong> افتح تطبيق Shein ← السلة ← مشاركة ← انسخ الرابط والصقه هنا
              </p>
            </>
          )}

          {heroTab === 'track' && (
            <>
              <div className={styles.landingHeroSearch}>
                <input
                  type="text"
                  className={styles.landingHeroSearchInput}
                  placeholder="رقم الطلب (مثال: ORD-1234567890)"
                  value={trackRef}
                  onChange={(e) => {
                    setTrackRef(e.target.value)
                    if (trackHint) setTrackHint('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && goToTrack()}
                />
                <button
                  type="button"
                  className={styles.landingHeroSearchBtn}
                  onClick={goToTrack}
                  aria-label="تتبع الطلب"
                >
                  <HiSearch />
                </button>
              </div>
              {trackHint && <p className={styles.trackHeroHint}>{trackHint}</p>}
            </>
          )}
        </div>
      </section>

      {/* ── CATEGORY TABS ── */}
      <div className={styles.waveDivider} aria-hidden>
        <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className={styles.waveSvg}>
          <path fill="currentColor" d="M0,12 Q300,24 600,12 T1200,12 L1200,24 L0,24 Z" />
        </svg>
      </div>

      <div className={styles.content}>

        {/* ── HOW TO ORDER (3 steps) ── */}
        <section id="how-to-order" className={styles.landingBlock} aria-labelledby="how-to-heading">
          <div className={styles.sectionHead}>
            <h2 id="how-to-heading" className={styles.sectionHeadTitle}>
              كيفية الطلب في 3 خطوات
            </h2>
            <Link href="/customer/shein" className={styles.sectionHeadMore}>
              ابدأ الطلب
            </Link>
          </div>
          <div className={styles.howToGrid}>
            {howToSteps.map(({ step, icon: Icon, text }) => (
              <div key={step} className={styles.howToCard}>
                <div className={styles.howToIconWrap} aria-hidden>
                  <Icon className={styles.howToIcon} />
                </div>
                <span className={styles.howToStepBadge}>{step}</span>
                <p className={styles.howToText}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── RECOMMENDATIONS ── */}
        <section id="recommendations" className={styles.landingBlock}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionHeadTitle}>نوصي لك</h2>
            <Link href="/customer/shein" className={styles.sectionHeadMore}>
              عرض المزيد <HiChevronLeft style={{ verticalAlign: 'middle' }} />
            </Link>
          </div>
          <div className={styles.recoGrid}>
            {recoCards.map((c) => (
              <div key={c.title} className={styles.recoCard}>
                <div className={styles.recoImageWrap}>
                  <Image
                    src={c.image} alt={c.imageAlt || ''} fill
                    className={styles.recoImagePhoto}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className={styles.recoImageGradient} aria-hidden />
                  {c.chip && <span className={styles.recoChip}>{c.chip}</span>}
                </div>
                <div className={styles.recoBody}>
                  <h3 className={styles.recoTitle}>{c.title}</h3>
                  <p className={styles.recoDesc}>{c.desc}</p>
                  {c.link ? (
                    <Link href={c.href} className={styles.recoArrowBtn} aria-label={c.title}>
                      انتقال <HiChevronLeft />
                    </Link>
                  ) : (
                    <button type="button" className={styles.recoArrowBtn} onClick={c.onClick} aria-label={c.title}>
                      انتقال <HiChevronLeft />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section id="about-landing" className={styles.aboutLanding} aria-labelledby="about-heading">
          <div className={styles.aboutLandingCol}>
            <h2 id="about-heading" className={styles.aboutLandingHeading}>من نحن</h2>
            <ul className={styles.aboutLandingBullets}>
              <li>تنسيق طلبات من Shein مع تتبع واضح حتى التوصيل.</li>
            </ul>
            <p className={styles.aboutLandingText}>
              <span className={styles.accent}>MORE Holding Co.</span> تسهّل التسوق الدولي إلى ليبيا: أسعار بالدينار وفق سعر صرف محدث، ومتابعة منسّقة للشحن حتى استلام الطلب.
            </p>
            <Link href="/customer/shein" className={styles.aboutLandingCta}>
              ابدأ طلبك <HiChevronLeft />
            </Link>
          </div>
          <div className={styles.aboutLandingVisual}>
            <Image
              src="/customer-services.jpg" alt="خدمات الشركة"
              className={styles.aboutLandingImage}
              width={520} height={400}
              sizes="(max-width: 768px) 100vw, 45vw"
            />
          </div>
        </section>

        {/* ── OFFER BOX ── */}
        <section className={styles.featuresSection} aria-labelledby="offer-heading">
  <div className={styles.featuresBadge}>
    <span className={styles.featuresBadgeDot} />
    متاح الآن للعملاء
  </div>

  <h2 id="offer-heading" className={styles.featuresHeadline}>مميزات حصرية للعملاء</h2>
  <p className={styles.featuresSub}>كل ما تحتاجه لتسهيل تسوّقك من Shein وتتبّع طلباتك بكل يسر</p>

  <div className={styles.featuresGrid}>

    <div className={styles.featCard}>
      <div className={styles.featIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
      <div className={styles.featCardTitle}>تتبّع الطلب</div>
      <p className={styles.featCardDesc}>متابعة حالة طلبك فورياً برقم مرجع واحد حتى لحظة التسليم</p>
    </div>

    <div className={styles.featCard}>
      <div className={styles.featIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
        </svg>
      </div>
      <div className={styles.featCardTitle}>أسعار آنية بالدينار</div>
      <p className={styles.featCardDesc}>تحويل تلقائي للأسعار وفق سعر الصرف المحدّث لحظة بلحظة</p>
    </div>

    <div className={`${styles.featCard} ${styles.featCardWide}`}>
      <div className={styles.featIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      </div>
      <div>
        <div className={styles.featCardTitle}>عرض سلة Shein برابط المشاركة</div>
        <p className={styles.featCardDesc}>الصق رابط سلتك من تطبيق Shein وشاهد جميع المنتجات وإجمالي التكلفة بالدينار الليبي فوراً — دون الحاجة لتسجيل الدخول</p>
      </div>
    </div>

    <div className={styles.featCard}>
      <div className={styles.featIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
        </svg>
      </div>
      <div className={styles.featCardTitle}>قائمة المنتجات</div>
      <p className={styles.featCardDesc}>تصفّح المنتجات المتاحة وأضف ما تريد إلى سلتك مباشرةً</p>
    </div>

    <div className={styles.featCard}>
      <div className={styles.featIcon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div className={styles.featCardTitle}>بيانات آمنة</div>
      <p className={styles.featCardDesc}>لا حاجة لتسجيل الدخول أو مشاركة كلمات المرور</p>
    </div>

  </div>

  <div className={styles.featuresFooter}>
    <p className={styles.featuresFooterText}>ابدأ الآن — أدخل رقم طلبك أو الصق رابط سلتك من Shein</p>
    <button type="button" className={styles.featuresCta} onClick={() => router.push('/customer/shein#shein-tools')}>
      ابدأ الآن
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
  </div>
</section>

        <footer className={styles.footerStrip}>
          MORE Holding Co. — تسوق من Shein، تتبع طلباتك، وأسعارك بالدينار الليبي.
        </footer>
      </div>
    </div>
  )
}