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
  HiKey,
  HiPencil,
  HiLocationMarker,
  HiPhone,
  HiCreditCard,
  HiCash,
} from 'react-icons/hi'
import { getSession, setSession, authHeaders } from '../auth'

// ── Pricing method options ──────────────────────────────────────────
const PRICING_OPTIONS = [
  {
    id: 1,
    Icon: HiTruck,
    title: 'شحن مجاني',
    subtitle: 'بدون رسوم شحن إضافية',
    desc: 'الشحن مجاني عليك. تستفيد الشركة من كوبونات الخصم.',
    badge: null,
    badgeColor: null,
  },
  {
    id: 2,
    Icon: HiTicket,
    title: 'شحن مدفوع + كوبون خصم لك',
    subtitle: 'ادفع الشحن واحصل على كوبون',
    desc: 'تدفع رسوم الشحن وتحصل أنت على كوبون خصم من Shein لاستخدامه لاحقاً.',
    badge: 'كوبون لك',
    badgeColor: '#08af66',
  },
  {
    id: 3,
    Icon: HiCube,
    title: 'شحن مدفوع فقط',
    subtitle: 'ادفع الشحن بسعر مميز',
    desc: 'تدفع رسوم الشحن. الكوبونات تُوظَّف لخفض تكلفة الطلب الكلية.',
    badge: null,
    badgeColor: null,
  },
]

// ── Payment method options ──────────────────────────────────────────
const PAYMENT_OPTIONS = [
  {
    id: 'libyan_card',
    label: 'بطاقة ليبية',
    sub: 'تحويل عبر البطاقة الليبية',
    Icon: HiCreditCard,
  },
  {
    id: 'ly_pay',
    label: 'Ly Pay',
    sub: 'تحويل عبر Ly Pay',
    Icon: ({ style, ...p }) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    id: 'mastercard_visa',
    label: 'Mastercard / Visa',
    sub: 'دفع دولي بالبطاقة',
    Icon: HiCreditCard,
  },
  {
    id: 'cash',
    label: 'نقداً',
    sub: 'الدفع عند الاستلام',
    Icon: HiCash,
  },
  {
    id: 'wallet',
    label: 'المحفظة',
    sub: 'استخدام رصيد محفظتك',
    Icon: ({ ...p }) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
        <path d="M18 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
      </svg>
    ),
  },
]

export default function CustomerBasketPage() {
  const [items, setItems] = useState([])
  const [exchangeRate, setExchangeRate] = useState(6.0)

  const [checkoutPhase, setCheckoutPhase] = useState('idle')
  const [submittedRef, setSubmittedRef] = useState(null)
  const [orderNotes, setOrderNotes] = useState('')
  const [checkoutFieldError, setCheckoutFieldError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Logged-in session
  const [session, setSessionState] = useState(null)

  // Contact fields — pre-filled from session but editable
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [email, setEmail] = useState('')
  const [editingContact, setEditingContact] = useState(false)

  // Address fields — pre-filled from session but editable
  const [city, setCity] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [editingAddress, setEditingAddress] = useState(false)

  // Guest phone lookup
  const [phoneChecked, setPhoneChecked] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [guestLoggedIn, setGuestLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Post-order password creation
  const [submittedPhone, setSubmittedPhone] = useState('')
  const [submittedName, setSubmittedName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)

  // Pricing
  const [availableMethods, setAvailableMethods] = useState([1, 2, 3])
  const [shippingCost, setShippingCost] = useState(30)
  const [selectedMethod, setSelectedMethod] = useState(null)

  // Payment
  const [paymentMethod, setPaymentMethod] = useState(null)

  const phoneInputRef = useRef(null)

  const refresh = useCallback(() => { setItems(getBasket().items) }, [])

  useEffect(() => { refresh() }, [refresh])

  // Load session on mount and pre-fill contact/address
  useEffect(() => {
    const s = getSession()
    setSessionState(s)
    if (s) {
      setFullName(s.name || '')
      setPhone(s.phone || '')
      // Parse city/address from session.address
      if (s.address) {
        const lines = (s.address || '').split('\n').filter(Boolean)
        const cityLine = lines.find((l) => l.startsWith('المدينة:'))
        const addrLine = lines.find((l) => l.startsWith('العنوان:'))
        if (cityLine) setCity(cityLine.replace('المدينة:', '').trim())
        if (addrLine) setAddressLine(addrLine.replace('العنوان:', '').trim())
      }
    }

    const sync = () => {
      const ns = getSession()
      setSessionState(ns)
    }
    window.addEventListener('wasel_session_change', sync)
    return () => window.removeEventListener('wasel_session_change', sync)
  }, [])

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => setExchangeRate(d.USD || 6.0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/pricing-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.forcedMethod) { setAvailableMethods([d.forcedMethod]); setSelectedMethod(d.forcedMethod) }
        if (typeof d.shippingCost === 'number' && d.shippingCost > 0) setShippingCost(d.shippingCost)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (checkoutPhase === 'success' && submittedRef && items.length > 0) {
      setCheckoutPhase('idle'); setSubmittedRef(null)
    }
  }, [checkoutPhase, submittedRef, items.length])

  // Guest phone auto-lookup after 10 digits (only when not already logged in via session)
  useEffect(() => {
    if (session) return
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10 && !phoneChecked && !phoneLoading) lookupPhone(phone)
  }, [phone]) // eslint-disable-line react-hooks/exhaustive-deps

  const lookupPhone = async (rawPhone) => {
    const p = rawPhone.replace(/\s+/g, '').trim()
    if (p.length < 8) return
    setPhoneLoading(true)
    try {
      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(p)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.found && data.customer.hasPassword) {
          setExistingCustomer(data.customer)
          setShowLoginPrompt(true)
          setPhoneChecked(true)
        } else {
          setPhoneChecked(true)
          setShowLoginPrompt(false)
          setExistingCustomer(null)
        }
      }
    } catch (_) {} finally { setPhoneLoading(false) }
  }

  const handleGuestLogin = async () => {
    if (!loginPassword.trim()) { setLoginError('أدخل كلمة المرور'); return }
    setLoginLoading(true); setLoginError('')
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password: loginPassword.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSession(data.session)
        setSessionState(data.session)
        setGuestLoggedIn(true)
        setShowLoginPrompt(false)
        setFullName(data.session.name || fullName)
        if (data.session.address) {
          const lines = (data.session.address || '').split('\n').filter(Boolean)
          const cityLine = lines.find((l) => l.startsWith('المدينة:'))
          const addrLine = lines.find((l) => l.startsWith('العنوان:'))
          if (cityLine) setCity(cityLine.replace('المدينة:', '').trim())
          if (addrLine) setAddressLine(addrLine.replace('العنوان:', '').trim())
        }
      } else {
        setLoginError(data.error || 'كلمة المرور غير صحيحة')
      }
    } catch (_) { setLoginError('حدث خطأ في الاتصال') } finally { setLoginLoading(false) }
  }

  const goCheckoutContact = () => {
    if (!selectedMethod) return
    setCheckoutFieldError(''); setSubmitError('')
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

  const goPayment = () => {
    setCheckoutFieldError('')
    const c = city.trim(), a = addressLine.trim()
    if (!c) { setCheckoutFieldError('يرجى إدخال المدينة'); return }
    if (!a) { setCheckoutFieldError('يرجى إدخال عنوان التوصيل'); return }
    setCheckoutPhase('payment')
  }

  const goBackToContact = () => { setCheckoutFieldError(''); setCheckoutPhase('contact') }
  const goBackToDelivery = () => { setCheckoutFieldError(''); setCheckoutPhase('delivery') }

  const handleSubmitOrder = async () => {
    if (!paymentMethod) { setCheckoutFieldError('اختر طريقة الدفع'); return }
    setCheckoutFieldError(''); setSubmitError('')
    const { items: snapshot, meta } = getBasket()
    if (snapshot.length === 0) { setSubmitError('السلة فارغة'); return }
    const basket_link = meta?.sheinCartShareUrl?.trim() || undefined
    setSubmitLoading(true)
    try {
      const headers = { 'Content-Type': 'application/json', ...authHeaders() }
      const res = await fetch('/api/customer/submit-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          whatsApp: whatsApp.trim() || undefined,
          city: city.trim(),
          address: addressLine.trim(),
          notes: [orderNotes.trim(), `طريقة الدفع: ${PAYMENT_OPTIONS.find(p => p.id === paymentMethod)?.label || paymentMethod}`].filter(Boolean).join('\n'),
          items: snapshot,
          exchangeRateUsdLyd: exchangeRate,
          pricingMethod: selectedMethod,
          paymentMethod,
          ...(basket_link ? { basket_link } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || data.details || 'تعذر إرسال الطلب'); return }
      const ref = data.internal_ref || data.internalRef
      const capturedPhone = phone.trim()
      const capturedName = fullName.trim()
      clearBasket(); refresh()
      setSubmittedRef(ref); setSubmittedPhone(capturedPhone); setSubmittedName(capturedName)
      setCheckoutPhase('success')
      if (!session) {
        setFullName(''); setPhone(''); setEmail(''); setWhatsApp('')
      }
      setCity(''); setAddressLine(''); setOrderNotes(''); setPaymentMethod(null)
      setPhoneChecked(false); setExistingCustomer(null); setGuestLoggedIn(false)
    } catch { setSubmitError('حدث خطأ في الاتصال') } finally { setSubmitLoading(false) }
  }

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (newPassword !== newPasswordConfirm) { setPasswordError('كلمتا المرور غير متطابقتين'); return }
    setPasswordError(''); setPasswordSaving(true)
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: submittedPhone, password: newPassword, name: submittedName }),
      })
      const data = await res.json()
      if (!res.ok) { setPasswordError(data.error || 'تعذر حفظ كلمة المرور'); return }
      setSession(data.session); setPasswordSaved(true)
    } catch { setPasswordError('حدث خطأ في الاتصال') } finally { setPasswordSaving(false) }
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
  const isLoggedIn = !!(session || guestLoggedIn)
  const steps = ['contact', 'delivery', 'payment']
  const stepLabels = { contact: 'بياناتك', delivery: 'التوصيل', payment: 'الدفع' }

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={unitCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>سلة المشتريات</h1>

        {/* ── Success screen ── */}
        {checkoutPhase === 'success' && submittedRef && (
          <section className={styles.checkoutSuccess} aria-live="polite">
            <div className={styles.checkoutSuccessIcon} aria-hidden><HiCheckCircle /></div>
            <h2 className={styles.checkoutSuccessTitle}>تم استلام طلبك 🎉</h2>
            <p className={styles.checkoutSuccessText}>
              شكراً لك. سيقوم فريقنا بمراجعة الطلب والتأكد من التفاصيل والأسعار، ثم التواصل معك لإكمال الإجراءات ودفع العربون عند الموافقة.
            </p>
            <div className={styles.checkoutRefBox} dir="ltr">{submittedRef}</div>
            <p className={styles.checkoutSuccessText} style={{ fontSize: '0.88rem' }}>
              احتفظ بهذا الرقم لمتابعة حالة طلبك.
            </p>

            {/* Optional password creation — only shown to guest customers who don't have a password yet */}
            {!session && submittedPhone && (
              <div className={styles.postOrderPasswordBox}>
                {passwordSaved ? (
                  <div className={styles.postOrderPasswordDone}>
                    <HiCheckCircle style={{ color: '#08af66', fontSize: '1.3rem', flexShrink: 0 }} aria-hidden />
                    <div>
                      <strong>تم إنشاء حسابك بنجاح!</strong>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'rgba(232,232,234,0.6)' }}>
                        يمكنك الآن تتبع طلباتك ورصيد محفظتك من حسابك الشخصي.
                      </p>
                    </div>
                    <Link href="/customer/dashboard" className={styles.postOrderDashBtn}>الذهاب للحساب</Link>
                  </div>
                ) : (
                  <>
                    <div className={styles.postOrderPasswordHead}>
                      <span className={styles.postOrderPasswordIcon} aria-hidden><HiKey /></span>
                      <div>
                        <strong className={styles.postOrderPasswordTitle}>أنشئ كلمة مرور لحسابك</strong>
                        <p className={styles.postOrderPasswordSub}>اختياري — تتيح لك متابعة طلباتك ورصيد محفظتك في أي وقت.</p>
                      </div>
                    </div>
                    <div className={styles.postOrderPasswordFields}>
                      <input className={styles.checkoutInput} type={showNewPass ? 'text' : 'password'} placeholder="كلمة مرور جديدة (6 أحرف على الأقل)" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError('') }} autoComplete="new-password" />
                      <input className={styles.checkoutInput} type={showNewPass ? 'text' : 'password'} placeholder="تأكيد كلمة المرور" value={newPasswordConfirm} onChange={(e) => { setNewPasswordConfirm(e.target.value); setPasswordError('') }} onKeyDown={(e) => e.key === 'Enter' && handleSavePassword()} autoComplete="new-password" />
                      <label className={styles.postOrderShowPass}>
                        <input type="checkbox" checked={showNewPass} onChange={(e) => setShowNewPass(e.target.checked)} style={{ accentColor: '#08af66' }} />
                        إظهار كلمة المرور
                      </label>
                    </div>
                    {passwordError && <p className={styles.postOrderPasswordError}>{passwordError}</p>}
                    <div className={styles.postOrderPasswordActions}>
                      <button type="button" className={styles.checkoutPrimaryBtn} onClick={handleSavePassword} disabled={passwordSaving || !newPassword || !newPasswordConfirm}>
                        {passwordSaving ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
                      </button>
                      <button type="button" className={styles.checkoutBackBtn} onClick={() => setSubmittedPhone('')}>تخطي</button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className={styles.checkoutSuccessLinks} style={{ marginTop: '1.25rem' }}>
              <Link href={`/customer/track?ref=${encodeURIComponent(submittedRef)}`} className={styles.fetchBtn} style={{ textDecoration: 'none' }}>تتبع الطلب</Link>
              <Link href="/customer/products" className={styles.checkoutBackBtn} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>متابعة التسوق</Link>
            </div>
          </section>
        )}

        {/* ── Empty basket ── */}
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
                <button type="button" className={styles.clearBasketBtn} onClick={() => { clearBasket(); refresh() }}>
                  <HiTrash style={{ verticalAlign: 'middle', marginInlineEnd: '0.25rem' }} />إفراغ السلة
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
                  <h2 id="pricing-heading" className={styles.pricingSectionTitle}><HiTag aria-hidden />اختر طريقة التسعير</h2>
                  <p className={styles.pricingSectionSub}>اختر الخيار الذي يناسبك للمتابعة</p>
                </div>
                <div className={styles.pricingCards}>
                  {visibleOptions.map((opt) => {
                    const CardIcon = opt.Icon
                    const isSelected = selectedMethod === opt.id
                    const total = totalForMethod(opt.id)
                    const hasShipping = opt.id !== 1
                    return (
                      <button key={opt.id} type="button" className={`${styles.pricingCard} ${isSelected ? styles.pricingCardSelected : ''}`} onClick={() => setSelectedMethod(opt.id)} aria-pressed={isSelected}>
                        <div className={styles.pricingCardTop}>
                          <span className={styles.pricingCardIcon} aria-hidden><CardIcon /></span>
                          {opt.badge && <span className={styles.pricingCardBadge} style={{ background: opt.badgeColor }}>{opt.badge}</span>}
                          {isSelected && (
                            <span className={styles.pricingCardCheck} aria-hidden>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          )}
                        </div>
                        <div className={styles.pricingCardTitle}>{opt.title}</div>
                        <div className={styles.pricingCardSubtitle}>{opt.subtitle}</div>
                        <div className={styles.pricingCardDesc}>{opt.desc}</div>
                        <div className={styles.pricingCardFooter}>
                          {hasShipping && <div className={styles.pricingCardShipping}><HiTruck aria-hidden /><span>+{formatLyd(shippingCost)} د.ل شحن</span></div>}
                          <div className={styles.pricingCardTotal}><span>الإجمالي</span><strong>{formatLyd(total)} د.ل</strong></div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <button type="button" className={styles.checkoutStartBtn} onClick={goCheckoutContact} disabled={!selectedMethod} style={!selectedMethod ? { opacity: 0.45, cursor: 'not-allowed' } : {}}>
                  {selectedMethod ? `متابعة — الإجمالي ${formatLyd(totalLyd)} د.ل` : 'اختر طريقة التسعير أولاً'}
                  <HiChevronLeft aria-hidden style={{ fontSize: '1.1rem' }} />
                </button>
              </section>
            )}

            {/* ── Checkout form ── */}
            {steps.includes(checkoutPhase) && (
              <div className={styles.checkoutWrap}>
                {/* Pricing pill */}
                {selectedMethod && (() => {
                  const sel = PRICING_OPTIONS.find((o) => o.id === selectedMethod)
                  const PillIcon = sel?.Icon
                  return (
                    <div className={styles.selectedMethodPill}>
                      {PillIcon && <span className={styles.selectedMethodPillIcon} aria-hidden><PillIcon /></span>}
                      <span>{sel?.title}</span>
                      <button type="button" className={styles.selectedMethodChange} onClick={() => setCheckoutPhase('idle')}>تغيير</button>
                    </div>
                  )
                })()}

                <div className={styles.checkoutCard}>
                  <div className={styles.checkoutCardHead}>
                    <h2 className={styles.checkoutCardTitle}>إتمام الطلب</h2>
                    <div className={styles.checkoutSteps} aria-hidden>
                      {steps.map((s, i) => (
                        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {i > 0 && <span style={{ opacity: 0.3 }}>←</span>}
                          <span className={checkoutPhase === s ? styles.checkoutStepActive : ''}>
                            <span className={styles.checkoutStepDot} />{stepLabels[s]}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.checkoutCardBody}>
                    {checkoutFieldError && <div className={styles.errorMsg} style={{ marginBottom: '1rem' }}>{checkoutFieldError}</div>}
                    {submitError && <div className={styles.errorMsg} style={{ marginBottom: '1rem' }}>{submitError}</div>}

                    {/* ── STEP 1: Contact ── */}
                    {checkoutPhase === 'contact' && (
                      <>
                        {/* Logged-in customer: show info card */}
                        {isLoggedIn && !editingContact ? (
                          <div className={styles.loggedInfoCard}>
                            <div className={styles.loggedInfoCardHead}>
                              <div className={styles.loggedInfoAvatar}>{(fullName || 'ع').charAt(0)}</div>
                              <div className={styles.loggedInfoText}>
                                <span className={styles.loggedInfoName}>{fullName}</span>
                                <span className={styles.loggedInfoPhone} dir="ltr">{phone}</span>
                              </div>
                              <button type="button" className={styles.loggedInfoEditBtn} onClick={() => setEditingContact(true)} aria-label="تعديل">
                                <HiPencil />
                              </button>
                            </div>
                            <p className={styles.loggedInfoHint}>
                              بيانات حسابك. يمكنك تعديلها لهذا الطلب فقط.
                            </p>
                          </div>
                        ) : (
                          /* Guest or editing mode */
                          <fieldset className={styles.checkoutFieldset}>
                            <legend className={styles.checkoutLegend}>
                              {isLoggedIn ? 'تعديل بيانات التواصل لهذا الطلب' : 'بيانات التواصل'}
                              {isLoggedIn && (
                                <button type="button" className={styles.cancelEditBtn} onClick={() => {
                                  setEditingContact(false)
                                  const s = getSession()
                                  if (s) { setFullName(s.name || ''); setPhone(s.phone || '') }
                                }}>← استعادة بيانات الحساب</button>
                              )}
                            </legend>
                            <div className={styles.checkoutGrid}>
                              <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                                <label className={styles.checkoutLabel} htmlFor="co-phone">رقم الهاتف <span style={{ color: '#f87171' }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                  <input id="co-phone" ref={phoneInputRef} className={styles.checkoutInput} type="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneChecked(false); setShowLoginPrompt(false); setExistingCustomer(null) }} autoComplete="tel" placeholder="09xxxxxxxx" />
                                  {phoneLoading && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#08af66', fontSize: '0.78rem' }}>جاري التحقق...</span>}
                                </div>
                              </div>

                              {/* Login prompt for guest with existing password */}
                              {showLoginPrompt && existingCustomer && (
                                <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                                  <div className={styles.loginPromptBox}>
                                    <div className={styles.loginPromptRow}>
                                      <HiUser style={{ color: '#08af66', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden />
                                      <span>مرحباً <strong>{existingCustomer.name}</strong>! أدخل كلمة المرور للدخول.</span>
                                    </div>
                                    <input className={styles.checkoutInput} style={{ marginTop: '0.65rem' }} type="password" value={loginPassword} onChange={(e) => { setLoginPassword(e.target.value); setLoginError('') }} onKeyDown={(e) => e.key === 'Enter' && handleGuestLogin()} placeholder="كلمة المرور" />
                                    {loginError && <span style={{ color: '#fca5a5', fontSize: '0.8rem' }}>{loginError}</span>}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                                      <button type="button" className={styles.checkoutPrimaryBtn} onClick={handleGuestLogin} disabled={loginLoading} style={{ flex: 1 }}>
                                        <HiLockClosed style={{ verticalAlign: 'middle', marginInlineEnd: '0.3rem' }} />
                                        {loginLoading ? 'جاري...' : 'دخول'}
                                      </button>
                                      <button type="button" className={styles.checkoutBackBtn} onClick={() => setShowLoginPrompt(false)} style={{ flex: 1 }}>تخطي</button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                                <label className={styles.checkoutLabel} htmlFor="co-name">الاسم الكامل <span style={{ color: '#f87171' }}>*</span></label>
                                <input id="co-name" className={styles.checkoutInput} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                              </div>
                              <div className={styles.checkoutField}>
                                <label className={styles.checkoutLabel} htmlFor="co-wa">رقم التواصل الخارجي (اختياري)</label>
                                <input id="co-wa" className={styles.checkoutInput} type="tel" dir="ltr" value={whatsApp} onChange={(e) => setWhatsApp(e.target.value)} placeholder="لو مختلف عن رقم الهاتف" />
                              </div>
                              <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                                <label className={styles.checkoutLabel} htmlFor="co-email">البريد الإلكتروني (اختياري)</label>
                                <input id="co-email" className={styles.checkoutInput} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                              </div>
                            </div>
                          </fieldset>
                        )}

                        <div className={styles.checkoutActions}>
                          <button type="button" className={styles.checkoutBackBtn} onClick={() => setCheckoutPhase('idle')}>رجوع</button>
                          <button type="button" className={styles.checkoutPrimaryBtn} onClick={goDelivery}>
                            التالي: التوصيل <HiChevronLeft style={{ verticalAlign: 'middle', marginInlineStart: '0.25rem' }} />
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── STEP 2: Delivery ── */}
                    {checkoutPhase === 'delivery' && (
                      <>
                        {/* Logged-in address card */}
                        {isLoggedIn && city && addressLine && !editingAddress ? (
                          <div className={styles.loggedInfoCard}>
                            <div className={styles.loggedInfoCardHead}>
                              <HiLocationMarker style={{ color: '#08af66', fontSize: '1.3rem', flexShrink: 0 }} aria-hidden />
                              <div className={styles.loggedInfoText}>
                                <span className={styles.loggedInfoName}>{city}</span>
                                <span className={styles.loggedInfoPhone}>{addressLine}</span>
                              </div>
                              <button type="button" className={styles.loggedInfoEditBtn} onClick={() => setEditingAddress(true)} aria-label="تعديل العنوان">
                                <HiPencil />
                              </button>
                            </div>
                            <p className={styles.loggedInfoHint}>عنوانك المحفوظ. يمكنك تعديله لهذا الطلب فقط.</p>
                          </div>
                        ) : (
                          <fieldset className={styles.checkoutFieldset}>
                            <legend className={styles.checkoutLegend}>
                              {isLoggedIn ? 'تعديل عنوان التوصيل لهذا الطلب' : 'عنوان التوصيل داخل ليبيا'}
                              {isLoggedIn && city && addressLine && (
                                <button type="button" className={styles.cancelEditBtn} onClick={() => {
                                  setEditingAddress(false)
                                  const s = getSession()
                                  if (s?.address) {
                                    const lines = s.address.split('\n').filter(Boolean)
                                    const cl = lines.find((l) => l.startsWith('المدينة:'))
                                    const al = lines.find((l) => l.startsWith('العنوان:'))
                                    if (cl) setCity(cl.replace('المدينة:', '').trim())
                                    if (al) setAddressLine(al.replace('العنوان:', '').trim())
                                  }
                                }}>← استعادة العنوان المحفوظ</button>
                              )}
                            </legend>
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
                        )}

                        {/* Summary row */}
                        <div className={styles.pricingSummary} style={{ marginBottom: '1rem' }}>
                          <div className={styles.pricingSummaryRow}><span>المجموع الفرعي</span><span>{formatLyd(subtotalLyd)} د.ل</span></div>
                          {selectedMethod !== 1 && <div className={styles.pricingSummaryRow}><span>الشحن</span><span style={{ color: '#f59e0b' }}>{formatLyd(shippingCost)} د.ل</span></div>}
                          <div className={styles.pricingSummaryTotal}><span>الإجمالي</span><span>{formatLyd(totalLyd)} د.ل</span></div>
                        </div>

                        <div className={styles.checkoutActions}>
                          <button type="button" className={styles.checkoutBackBtn} onClick={goBackToContact}>رجوع</button>
                          <button type="button" className={styles.checkoutPrimaryBtn} onClick={goPayment}>
                            التالي: طريقة الدفع <HiChevronLeft style={{ verticalAlign: 'middle', marginInlineStart: '0.25rem' }} />
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── STEP 3: Payment ── */}
                    {checkoutPhase === 'payment' && (
                      <>
                        <fieldset className={styles.checkoutFieldset}>
                          <legend className={styles.checkoutLegend}>اختر طريقة الدفع</legend>
                          <div className={styles.paymentGrid}>
                            {PAYMENT_OPTIONS.map((opt) => {
                              const PayIcon = opt.Icon
                              const isSelected = paymentMethod === opt.id
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  className={`${styles.paymentCard} ${isSelected ? styles.paymentCardSelected : ''}`}
                                  onClick={() => setPaymentMethod(opt.id)}
                                  aria-pressed={isSelected}
                                >
                                  <span className={styles.paymentCardIcon} aria-hidden>
                                    <PayIcon width="20" height="20" />
                                  </span>
                                  <span className={styles.paymentCardLabel}>{opt.label}</span>
                                  <span className={styles.paymentCardSub}>{opt.sub}</span>
                                  {isSelected && (
                                    <span className={styles.paymentCardCheck} aria-hidden>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </fieldset>

                        {/* Final summary */}
                        <div className={styles.pricingSummary} style={{ marginBottom: '1rem' }}>
                          <div className={styles.pricingSummaryRow}><span>المجموع الفرعي</span><span>{formatLyd(subtotalLyd)} د.ل</span></div>
                          {selectedMethod !== 1 && <div className={styles.pricingSummaryRow}><span>الشحن</span><span style={{ color: '#f59e0b' }}>{formatLyd(shippingCost)} د.ل</span></div>}
                          {paymentMethod && <div className={styles.pricingSummaryRow}><span>طريقة الدفع</span><span style={{ color: '#08af66' }}>{PAYMENT_OPTIONS.find(p => p.id === paymentMethod)?.label}</span></div>}
                          <div className={styles.pricingSummaryTotal}><span>الإجمالي</span><span>{formatLyd(totalLyd)} د.ل</span></div>
                        </div>

                        <div className={styles.checkoutActions}>
                          <button type="button" className={styles.checkoutBackBtn} onClick={goBackToDelivery}>رجوع</button>
                          <button type="button" className={styles.checkoutPrimaryBtn} onClick={handleSubmitOrder} disabled={submitLoading || !paymentMethod}>
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
