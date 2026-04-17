'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import styles from '../customer.module.css'
import CustomerSiteHeader from '../CustomerSiteHeader'
import {
  getBasket,
  clearBasket,
  removeBasketLine,
  updateBasketQuantity,
  updateSheinQuantity,
} from '../basket-storage'
import {
  HiX,
  HiTrash,
  HiCheckCircle,
  HiChevronLeft,
  HiShoppingBag,
  HiUser,
  HiLockClosed,
  HiTag,
  HiTruck,
  HiTicket,
  HiCube,
} from 'react-icons/hi'

// Pricing method definitions shown to the customer
const PRICING_OPTIONS = [
  {
    id: 1,
    Icon: HiTruck,
    title: 'شحن مجاني',
    subtitle: 'بدون رسوم شحن إضافية',
    desc: 'الشحن مجاني عليك. تستفيد الشركة من كوبونات الخصم.',
    badge: null,
    badgeColor: null,
    shippingNote: null,
  },
  {
    id: 2,
    Icon: HiTicket,
    title: 'شحن مدفوع + كوبون خصم لك',
    subtitle: 'ادفع الشحن واحصل على كوبون',
    desc: 'تدفع رسوم الشحن وتحصل أنت على كوبون خصم من Shein لاستخدامه لاحقاً.',
    badge: 'كوبون لك',
    badgeColor: '#08af66',
    shippingNote: 'يُضاف سعر الشحن إلى الإجمالي',
  },
  {
    id: 3,
    Icon: HiCube,
    title: 'شحن مدفوع فقط',
    subtitle: 'ادفع الشحن بسعر مميز',
    desc: 'تدفع رسوم الشحن. الكوبونات تُوظَّف لخفض تكلفة الطلب الكلية.',
    badge: null,
    badgeColor: null,
    shippingNote: 'يُضاف سعر الشحن إلى الإجمالي',
  },
]

export default function CustomerBasketPage() {
  const [items, setItems] = useState([])
  const [exchangeRate, setExchangeRate] = useState(6.0)

  const [checkoutPhase, setCheckoutPhase] = useState('idle')
  const [submittedRef, setSubmittedRef] = useState(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [city, setCity] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [checkoutFieldError, setCheckoutFieldError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Phone lookup / optional login
  const [phoneChecked, setPhoneChecked] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [savedAddresses, setSavedAddresses] = useState([])

  // Pricing: admin sets available methods & shipping cost; customer picks their preference
  const [availableMethods, setAvailableMethods] = useState([1, 2, 3]) // all 3 shown by default
  const [shippingCost, setShippingCost] = useState(30) // default mock; overridden by settings
  const [selectedMethod, setSelectedMethod] = useState(null) // null = not yet chosen

  const phoneInputRef = useRef(null)

  const refresh = useCallback(() => {
    setItems(getBasket().items)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => setExchangeRate(d.USD || 6.0))
      .catch(() => {})
  }, [])

  // Fetch pricing settings from admin
  useEffect(() => {
    fetch('/api/pricing-settings')
      .then((r) => r.json())
      .then((d) => {
        // If admin has set a single forced method, pre-select it and only show that one
        if (d.forcedMethod) {
          setAvailableMethods([d.forcedMethod])
          setSelectedMethod(d.forcedMethod)
        }
        if (typeof d.shippingCost === 'number' && d.shippingCost > 0) {
          setShippingCost(d.shippingCost)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (checkoutPhase === 'success' && submittedRef && items.length > 0) {
      setCheckoutPhase('idle')
      setSubmittedRef(null)
    }
  }, [checkoutPhase, submittedRef, items.length])

  // Phone auto-lookup after 10 digits
  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10 && !phoneChecked && !phoneLoading) {
      lookupPhone(phone)
    }
  }, [phone]) // eslint-disable-line react-hooks/exhaustive-deps

  const lookupPhone = async (rawPhone) => {
    const p = rawPhone.replace(/\s+/g, '').trim()
    if (p.length < 8) return
    setPhoneLoading(true)
    try {
      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(p)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found) {
          setExistingCustomer(data.customer)
          setShowLoginPrompt(true)
          setPhoneChecked(true)
        } else {
          setPhoneChecked(true)
          setShowLoginPrompt(false)
          setExistingCustomer(null)
        }
      }
    } catch (_) {} finally {
      setPhoneLoading(false)
    }
  }

  const handleLoginWithPassword = async () => {
    if (!password.trim()) { setLoginError('أدخل كلمة المرور'); return }
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setLoggedIn(true)
        setShowLoginPrompt(false)
        setFullName(data.customer.name || fullName)
        if (data.customer.address) {
          const lines = (data.customer.address || '').split('\n').filter(Boolean)
          const cityLine = lines.find((l) => l.startsWith('المدينة:'))
          const addrLine = lines.find((l) => l.startsWith('العنوان:'))
          if (cityLine) setCity(cityLine.replace('المدينة:', '').trim())
          if (addrLine) setAddressLine(addrLine.replace('العنوان:', '').trim())
        }
        setSavedAddresses(data.customer.saved_addresses || [])
      } else {
        setLoginError(data.error || 'كلمة المرور غير صحيحة')
      }
    } catch (_) {
      setLoginError('حدث خطأ في الاتصال')
    } finally {
      setLoginLoading(false)
    }
  }

  const skipLogin = () => setShowLoginPrompt(false)

  const goCheckoutContact = () => {
    if (!selectedMethod) return // should not happen; guarded by button
    setCheckoutFieldError('')
    setSubmitError('')
    setCheckoutPhase('contact')
  }

  const goDelivery = () => {
    setCheckoutFieldError('')
    const n = fullName.trim()
    const p = phone.replace(/\s+/g, '').trim()
    if (n.length < 2) { setCheckoutFieldError('يرجى إدخال الاسم الكامل'); return }
    if (p.length < 8) { setCheckoutFieldError('يرجى إدخال رقم هاتف صحيح'); return }
    setCheckoutPhase('delivery')
  }

  const goBackToContact = () => {
    setCheckoutFieldError('')
    setCheckoutPhase('contact')
  }

  const handleSubmitOrder = async () => {
    setCheckoutFieldError('')
    setSubmitError('')
    const c = city.trim()
    const a = addressLine.trim()
    if (!c) { setCheckoutFieldError('يرجى إدخال المدينة'); return }
    if (!a) { setCheckoutFieldError('يرجى إدخال عنوان التوصيل بالتفصيل'); return }

    const { items: snapshot, meta } = getBasket()
    if (snapshot.length === 0) { setSubmitError('السلة فارغة'); return }

    const basket_link = meta?.sheinCartShareUrl && String(meta.sheinCartShareUrl).trim()
      ? String(meta.sheinCartShareUrl).trim()
      : undefined

    setSubmitLoading(true)
    try {
      const res = await fetch('/api/customer/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          whatsApp: whatsApp.trim() || undefined,
          city: c,
          address: a,
          notes: orderNotes.trim() || undefined,
          items: snapshot,
          exchangeRateUsdLyd: exchangeRate,
          pricingMethod: selectedMethod,
          ...(basket_link ? { basket_link } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || data.details || 'تعذر إرسال الطلب'); return }
      const ref = data.internal_ref || data.internalRef
      clearBasket()
      refresh()
      setSubmittedRef(ref)
      setCheckoutPhase('success')
      setFullName(''); setPhone(''); setPassword(''); setEmail('')
      setWhatsApp(''); setCity(''); setAddressLine(''); setOrderNotes('')
      setPhoneChecked(false); setExistingCustomer(null); setLoggedIn(false)
    } catch {
      setSubmitError('حدث خطأ في الاتصال')
    } finally {
      setSubmitLoading(false)
    }
  }

  const formatLyd = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))
  const formatUsd = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))
  const lineTotalLyd = (item) => (item.price || 0) * (item.quantity || 1) * (item.currency === 'LYD' ? 1 : exchangeRate)
  const subtotalLyd = items.reduce((s, i) => s + lineTotalLyd(i), 0)
  const shippingForMethod = (m) => (m !== 1 ? shippingCost : 0)
  const totalForMethod = (m) => subtotalLyd + shippingForMethod(m)
  const totalLyd = selectedMethod ? totalForMethod(selectedMethod) : subtotalLyd
  const unitCount = items.reduce((n, i) => n + (i.quantity || 0), 0)

  const bumpQuantity = (item, delta) => {
    const next = (item.quantity || 0) + delta
    if (item.type === 'shein') updateSheinQuantity(item.sheinKey, next)
    else updateBasketQuantity(item.id, next)
    refresh()
  }

  const visibleOptions = PRICING_OPTIONS.filter((o) => availableMethods.includes(o.id))

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={unitCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>سلة المشتريات</h1>

        {checkoutPhase === 'success' && submittedRef && (
          <section className={styles.checkoutSuccess} aria-live="polite">
            <div className={styles.checkoutSuccessIcon} aria-hidden><HiCheckCircle /></div>
            <h2 className={styles.checkoutSuccessTitle}>تم استلام طلبك</h2>
            <p className={styles.checkoutSuccessText}>
              شكراً لك. سيقوم فريقنا بمراجعة الطلب والتأكد من التفاصيل والأسعار، ثم التواصل معك لإكمال الإجراءات ودفع العربون عند الموافقة.
            </p>
            <div className={styles.checkoutRefBox} dir="ltr">{submittedRef}</div>
            <p className={styles.checkoutSuccessText} style={{ fontSize: '0.88rem' }}>
              احتفظ بهذا الرقم لمتابعة حالة الطلب من صفحة تتبع الطلب.
            </p>
            <div className={styles.checkoutSuccessLinks}>
              <Link href={`/customer/track?ref=${encodeURIComponent(submittedRef)}`} className={styles.fetchBtn} style={{ textDecoration: 'none' }}>
                الانتقال للتتبع
              </Link>
              <Link href="/customer/products" className={styles.checkoutBackBtn} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                متابعة التسوق
              </Link>
            </div>
          </section>
        )}

        {items.length === 0 && checkoutPhase !== 'success' ? (
          <div className={styles.productListEmpty}>
            سلتك فارغة. تصفح{' '}
            <Link href="/customer/products" className={styles.headerNavLink}>قائمة المنتجات</Link>
            {' '}أو أضف عناصر من{' '}
            <Link href="/" className={styles.headerNavLink}>الصفحة الرئيسية</Link>.
          </div>
        ) : items.length > 0 ? (
          <>
            {/* ── Basket items ── */}
            <section className={styles.basketSection} aria-label="محتويات السلة">
              <div className={styles.basketSectionHeader}>
                <div className={styles.basketSectionTitle}>
                  <HiShoppingBag className={styles.basketSectionTitleIcon} aria-hidden />
                  الأصناف
                  <span className={styles.basketItemCount}>{items.length}</span>
                </div>
                <button
                  type="button"
                  className={styles.clearBasketBtn}
                  onClick={() => { clearBasket(); refresh() }}
                >
                  <HiTrash style={{ verticalAlign: 'middle', marginInlineEnd: '0.25rem' }} />
                  إفراغ السلة
                </button>
              </div>
              <div className={styles.basketBody}>
                <ul className={styles.basketItems}>
                  {items.map((item) => {
                    const key = item.type === 'shein' ? item.sheinKey : `cat-${item.id}`
                    const label = item.type === 'shein' ? 'Shein' : 'محلي'
                    return (
                      <li key={key} className={styles.basketItem}>
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className={styles.basketItemImg} width={54} height={54} />
                        ) : (
                          <div className={styles.basketItemImg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(234,234,234,0.25)', fontSize: '0.75rem' }}>—</div>
                        )}
                        <div className={styles.basketItemInfo}>
                          <div className={styles.basketItemName}>{item.name_ar || item.name}</div>
                          <div className={styles.basketItemMeta}>
                            <span>{label}</span>
                            {item.variant && <span> · {item.variant}</span>}
                            <span> · {item.currency === 'LYD' ? `${formatLyd(item.price)} د.ل` : `${formatUsd(item.price)} ${item.currency}`} للوحدة</span>
                          </div>
                        </div>
                        <div className={styles.basketQtyControl} aria-label="الكمية">
                          <button type="button" className={styles.basketQtyBtn} onClick={() => bumpQuantity(item, -1)} disabled={(item.quantity || 0) <= 1} aria-label="تقليل الكمية">−</button>
                          <span className={styles.basketQtyValue}>{item.quantity || 0}</span>
                          <button type="button" className={styles.basketQtyBtn} onClick={() => bumpQuantity(item, 1)} aria-label="زيادة الكمية">+</button>
                        </div>
                        <span className={styles.basketItemPrice}>{formatLyd(lineTotalLyd(item))} د.ل</span>
                        <button type="button" className={styles.removeBtn} onClick={() => { removeBasketLine(item); refresh() }} aria-label="إزالة"><HiX /></button>
                      </li>
                    )
                  })}
                </ul>

                {/* Subtotal */}
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>المجموع الفرعي</span>
                  <span className={styles.totalAmount}>{formatLyd(subtotalLyd)} د.ل</span>
                </div>
              </div>
            </section>

            {/* ── Pricing method selector ── */}
            {checkoutPhase === 'idle' && (
              <section className={styles.pricingSection} aria-labelledby="pricing-heading">
                <div className={styles.pricingSectionHead}>
                  <h2 id="pricing-heading" className={styles.pricingSectionTitle}>
                    <HiTag aria-hidden />
                    اختر طريقة التسعير
                  </h2>
                  <p className={styles.pricingSectionSub}>اختر الخيار الذي يناسبك للمتابعة</p>
                </div>

                <div className={styles.pricingCards}>
                  {visibleOptions.map((opt) => {
                    const CardIcon = opt.Icon
                    const isSelected = selectedMethod === opt.id
                    const total = totalForMethod(opt.id)
                    const hasShipping = opt.id !== 1
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`${styles.pricingCard} ${isSelected ? styles.pricingCardSelected : ''}`}
                        onClick={() => setSelectedMethod(opt.id)}
                        aria-pressed={isSelected}
                      >
                        <div className={styles.pricingCardTop}>
                          <span className={styles.pricingCardIcon} aria-hidden>
                            <CardIcon />
                          </span>
                          {opt.badge && (
                            <span className={styles.pricingCardBadge} style={{ background: opt.badgeColor }}>
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && (
                            <span className={styles.pricingCardCheck} aria-hidden>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className={styles.pricingCardTitle}>{opt.title}</div>
                        <div className={styles.pricingCardSubtitle}>{opt.subtitle}</div>
                        <div className={styles.pricingCardDesc}>{opt.desc}</div>
                        <div className={styles.pricingCardFooter}>
                          {hasShipping && (
                            <div className={styles.pricingCardShipping}>
                              <HiTruck aria-hidden />
                              <span>+{formatLyd(shippingCost)} د.ل شحن</span>
                            </div>
                          )}
                          <div className={styles.pricingCardTotal}>
                            <span>الإجمالي</span>
                            <strong>{formatLyd(total)} د.ل</strong>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Proceed button — only enabled when method selected */}
                <button
                  type="button"
                  className={styles.checkoutStartBtn}
                  onClick={goCheckoutContact}
                  disabled={!selectedMethod}
                  style={!selectedMethod ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                >
                  {selectedMethod
                    ? `متابعة — الإجمالي ${formatLyd(totalLyd)} د.ل`
                    : 'اختر طريقة التسعير أولاً'}
                  <HiChevronLeft aria-hidden style={{ fontSize: '1.1rem' }} />
                </button>
              </section>
            )}

            {/* ── Checkout form ── */}
            {(checkoutPhase === 'contact' || checkoutPhase === 'delivery') && (
              <div className={styles.checkoutWrap}>
                {/* Selected method summary pill */}
                {selectedMethod && (() => {
                  const sel = PRICING_OPTIONS.find((o) => o.id === selectedMethod)
                  const PillIcon = sel?.Icon
                  return (
                  <div className={styles.selectedMethodPill}>
                    {PillIcon && (
                      <span className={styles.selectedMethodPillIcon} aria-hidden>
                        <PillIcon />
                      </span>
                    )}
                    <span>{sel?.title}</span>
                    <button
                      type="button"
                      className={styles.selectedMethodChange}
                      onClick={() => setCheckoutPhase('idle')}
                    >
                      تغيير
                    </button>
                  </div>
                  )
                })()}

                <div className={styles.checkoutCard}>
                  <div className={styles.checkoutCardHead}>
                    <h2 className={styles.checkoutCardTitle}>إتمام الطلب</h2>
                    <div className={styles.checkoutSteps} aria-hidden>
                      <span className={checkoutPhase === 'contact' ? styles.checkoutStepActive : ''}>
                        <span className={styles.checkoutStepDot} />بياناتك
                      </span>
                      <span style={{ opacity: 0.35 }}>←</span>
                      <span className={checkoutPhase === 'delivery' ? styles.checkoutStepActive : ''}>
                        <span className={styles.checkoutStepDot} />التوصيل
                      </span>
                    </div>
                  </div>
                  <div className={styles.checkoutCardBody}>
                    {checkoutFieldError && <div className={styles.errorMsg} style={{ marginBottom: '1rem' }}>{checkoutFieldError}</div>}
                    {submitError && <div className={styles.errorMsg} style={{ marginBottom: '1rem' }}>{submitError}</div>}

                    {checkoutPhase === 'contact' && (
                      <>
                        <fieldset className={styles.checkoutFieldset}>
                          <legend className={styles.checkoutLegend}>بيانات التواصل</legend>
                          <div className={styles.checkoutGrid}>
                            <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                              <label className={styles.checkoutLabel} htmlFor="co-phone">
                                رقم الهاتف <span style={{ color: '#f87171' }}>*</span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  id="co-phone"
                                  ref={phoneInputRef}
                                  className={styles.checkoutInput}
                                  type="tel"
                                  dir="ltr"
                                  value={phone}
                                  onChange={(e) => {
                                    setPhone(e.target.value)
                                    setPhoneChecked(false)
                                    setShowLoginPrompt(false)
                                    setExistingCustomer(null)
                                    setLoggedIn(false)
                                  }}
                                  autoComplete="tel"
                                  placeholder="09xxxxxxxx"
                                />
                                {phoneLoading && (
                                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#08af66', fontSize: '0.78rem' }}>
                                    جاري التحقق...
                                  </span>
                                )}
                                {loggedIn && (
                                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#08af66', fontSize: '0.78rem' }}>
                                    ✓ تم تسجيل الدخول
                                  </span>
                                )}
                              </div>
                            </div>

                            {showLoginPrompt && existingCustomer && !loggedIn && (
                              <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                                <div className={styles.loginPromptBox}>
                                  <div className={styles.loginPromptRow}>
                                    <HiUser style={{ color: '#08af66', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden />
                                    <span>مرحباً <strong>{existingCustomer.name}</strong>! هل تريد تسجيل الدخول لاستخدام بياناتك المحفوظة؟</span>
                                  </div>
                                  <div className={styles.checkoutField} style={{ marginTop: '0.75rem' }}>
                                    <label className={styles.checkoutLabel} htmlFor="co-pass">كلمة المرور (اختياري)</label>
                                    <input
                                      id="co-pass"
                                      className={styles.checkoutInput}
                                      type="password"
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleLoginWithPassword()}
                                      placeholder="أدخل كلمة المرور للدخول..."
                                    />
                                    {loginError && <span style={{ color: '#fca5a5', fontSize: '0.8rem' }}>{loginError}</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                                    <button type="button" className={styles.checkoutPrimaryBtn} onClick={handleLoginWithPassword} disabled={loginLoading} style={{ flex: 1 }}>
                                      <HiLockClosed style={{ verticalAlign: 'middle', marginInlineEnd: '0.3rem' }} />
                                      {loginLoading ? 'جاري...' : 'دخول'}
                                    </button>
                                    <button type="button" className={styles.checkoutBackBtn} onClick={skipLogin} style={{ flex: 1 }}>تخطي</button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                              <label className={styles.checkoutLabel} htmlFor="co-name">
                                الاسم الكامل <span style={{ color: '#f87171' }}>*</span>
                              </label>
                              <input id="co-name" className={styles.checkoutInput} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                            </div>
                            <div className={styles.checkoutField}>
                              <label className={styles.checkoutLabel} htmlFor="co-wa">واتساب (اختياري)</label>
                              <input id="co-wa" className={styles.checkoutInput} type="tel" dir="ltr" value={whatsApp} onChange={(e) => setWhatsApp(e.target.value)} />
                            </div>
                            <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                              <label className={styles.checkoutLabel} htmlFor="co-email">البريد الإلكتروني (اختياري)</label>
                              <input id="co-email" className={styles.checkoutInput} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                            </div>
                          </div>
                        </fieldset>
                        <div className={styles.checkoutActions}>
                          <button type="button" className={styles.checkoutBackBtn} onClick={() => setCheckoutPhase('idle')}>رجوع</button>
                          <button type="button" className={styles.checkoutPrimaryBtn} onClick={goDelivery}>
                            التالي: التوصيل
                            <HiChevronLeft style={{ verticalAlign: 'middle', marginInlineStart: '0.25rem' }} />
                          </button>
                        </div>
                      </>
                    )}

                    {checkoutPhase === 'delivery' && (
                      <>
                        <fieldset className={styles.checkoutFieldset}>
                          <legend className={styles.checkoutLegend}>عنوان التوصيل داخل ليبيا</legend>
                          {savedAddresses.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                              <p className={styles.checkoutLabel} style={{ marginBottom: '0.5rem' }}>عناوين محفوظة:</p>
                              {savedAddresses.map((addr, i) => (
                                <button key={i} type="button" className={styles.savedAddressChip} onClick={() => { setCity(addr.city || ''); setAddressLine(addr.address || '') }}>
                                  {addr.city} — {(addr.address || '').slice(0, 30)}...
                                </button>
                              ))}
                            </div>
                          )}
                          <div className={styles.checkoutGrid}>
                            <div className={styles.checkoutField}>
                              <label className={styles.checkoutLabel} htmlFor="co-city">المدينة <span style={{ color: '#f87171' }}>*</span></label>
                              <input id="co-city" className={styles.checkoutInput} value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: طرابلس، بنغازي..." />
                            </div>
                            <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                              <label className={styles.checkoutLabel} htmlFor="co-address">العنوان التفصيلي <span style={{ color: '#f87171' }}>*</span></label>
                              <textarea id="co-address" className={styles.checkoutTextarea} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="الحي، أقرب نقطة دالة، رقم المنزل أو المحل..." />
                            </div>
                            <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                              <label className={styles.checkoutLabel} htmlFor="co-notes">ملاحظات إضافية (اختياري)</label>
                              <textarea id="co-notes" className={styles.checkoutTextarea} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="مقاسات، ألوان، تفضيلات التواصل..." />
                            </div>
                          </div>
                        </fieldset>

                        {/* Final order summary */}
                        <div className={styles.pricingSummary}>
                          <div className={styles.pricingSummaryRow}>
                            <span>المجموع الفرعي</span>
                            <span>{formatLyd(subtotalLyd)} د.ل</span>
                          </div>
                          {selectedMethod !== 1 && (
                            <div className={styles.pricingSummaryRow}>
                              <span>رسوم الشحن</span>
                              <span style={{ color: '#f59e0b' }}>{formatLyd(shippingCost)} د.ل</span>
                            </div>
                          )}
                          <div className={styles.pricingSummaryRow} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <span>طريقة التسعير</span>
                            <span style={{ color: '#08af66', fontSize: '0.82rem' }}>
                              {PRICING_OPTIONS.find((o) => o.id === selectedMethod)?.title}
                            </span>
                          </div>
                          {selectedMethod === 2 && (
                            <div className={styles.pricingSummaryNote}>ستحصل على كوبون خصم من Shein بعد تأكيد الطلب</div>
                          )}
                          <div className={styles.pricingSummaryTotal}>
                            <span>الإجمالي</span>
                            <span>{formatLyd(totalLyd)} د.ل</span>
                          </div>
                        </div>

                        <div className={styles.checkoutActions}>
                          <button type="button" className={styles.checkoutBackBtn} onClick={goBackToContact}>رجوع</button>
                          <button type="button" className={styles.checkoutPrimaryBtn} onClick={handleSubmitOrder} disabled={submitLoading}>
                            {submitLoading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}

        <footer className={styles.footerStrip}>
          <Link href="/" className={styles.headerNavLink}>العودة إلى الرئيسية</Link>
        </footer>
      </div>
    </div>
  )
}
