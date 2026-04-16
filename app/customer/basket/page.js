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
import { HiX, HiTrash, HiCheckCircle, HiChevronLeft, HiShoppingBag, HiUser, HiLockClosed } from 'react-icons/hi'

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
  const [existingCustomer, setExistingCustomer] = useState(null) // { name, address, ... }
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [savedAddresses, setSavedAddresses] = useState([])

  // Pricing method selected by admin (fetched from settings or default)
  const [pricingMethod, setPricingMethod] = useState(1)
  const [shippingCost, setShippingCost] = useState(0)

  const phoneInputRef = useRef(null)

  const refresh = useCallback(() => {
    setItems(getBasket().items)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => {
        setExchangeRate(d.USD || 6.0)
      })
      .catch(() => {})
  }, [])

  // Fetch pricing method from settings
  useEffect(() => {
    fetch('/api/pricing-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.pricingMethod) setPricingMethod(d.pricingMethod)
        if (typeof d.shippingCost === 'number') setShippingCost(d.shippingCost)
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
    } catch (_) {
      // silent
    } finally {
      setPhoneLoading(false)
    }
  }

  const handleLoginWithPassword = async () => {
    if (!password.trim()) {
      setLoginError('أدخل كلمة المرور')
      return
    }
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
          const addr = data.customer.address || ''
          const lines = addr.split('\n').filter(Boolean)
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

  const skipLogin = () => {
    setShowLoginPrompt(false)
  }

  const goCheckoutContact = () => {
    setCheckoutFieldError('')
    setSubmitError('')
    setCheckoutPhase('contact')
  }

  const goDelivery = () => {
    setCheckoutFieldError('')
    const n = fullName.trim()
    const p = phone.replace(/\s+/g, '').trim()
    if (n.length < 2) {
      setCheckoutFieldError('يرجى إدخال الاسم الكامل')
      return
    }
    if (p.length < 8) {
      setCheckoutFieldError('يرجى إدخال رقم هاتف صحيح')
      return
    }
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
    if (!c) {
      setCheckoutFieldError('يرجى إدخال المدينة')
      return
    }
    if (!a) {
      setCheckoutFieldError('يرجى إدخال عنوان التوصيل بالتفصيل')
      return
    }

    const { items: snapshot, meta } = getBasket()
    if (snapshot.length === 0) {
      setSubmitError('السلة فارغة')
      return
    }

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
          pricingMethod,
          ...(basket_link ? { basket_link } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || data.details || 'تعذر إرسال الطلب')
        return
      }
      const ref = data.internal_ref || data.internalRef
      clearBasket()
      refresh()
      setSubmittedRef(ref)
      setCheckoutPhase('success')
      setFullName('')
      setPhone('')
      setPassword('')
      setEmail('')
      setWhatsApp('')
      setCity('')
      setAddressLine('')
      setOrderNotes('')
      setPhoneChecked(false)
      setExistingCustomer(null)
      setLoggedIn(false)
    } catch {
      setSubmitError('حدث خطأ في الاتصال')
    } finally {
      setSubmitLoading(false)
    }
  }

  const formatLyd = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))
  const formatUsd = (n) => (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))

  const lineTotalLyd = (item) =>
    (item.price || 0) * (item.quantity || 1) * (item.currency === 'LYD' ? 1 : exchangeRate)

  const subtotalLyd = items.reduce((s, i) => s + lineTotalLyd(i), 0)
  const totalLyd = subtotalLyd + (pricingMethod !== 1 ? shippingCost : 0)
  const unitCount = items.reduce((n, i) => n + (i.quantity || 0), 0)

  const bumpQuantity = (item, delta) => {
    const next = (item.quantity || 0) + delta
    if (item.type === 'shein') {
      updateSheinQuantity(item.sheinKey, next)
    } else {
      updateBasketQuantity(item.id, next)
    }
    refresh()
  }

  const pricingLabel = () => {
    if (pricingMethod === 2) return `شحن مدفوع (${formatLyd(shippingCost)} د.ل) — الكوبون للزبون`
    if (pricingMethod === 3) return `شحن مدفوع (${formatLyd(shippingCost)} د.ل) — الكوبون لـ MORE Express`
    return 'شحن مجاني — الكوبون للإدارة'
  }

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={unitCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>سلة المشتريات</h1>

        {/* Pricing method info banner */}
        {pricingMethod !== 1 && (
          <div className={styles.pricingBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{pricingLabel()}</span>
          </div>
        )}

        {checkoutPhase === 'success' && submittedRef && (
          <section className={styles.checkoutSuccess} aria-live="polite">
            <div className={styles.checkoutSuccessIcon} aria-hidden>
              <HiCheckCircle />
            </div>
            <h2 className={styles.checkoutSuccessTitle}>تم استلام طلبك</h2>
            <p className={styles.checkoutSuccessText}>
              شكراً لك. سيقوم فريقنا بمراجعة الطلب والتأكد من التفاصيل والأسعار، ثم التواصل معك لإكمال الإجراءات ودفع
              العربون عند الموافقة.
            </p>
            <div className={styles.checkoutRefBox} dir="ltr">
              {submittedRef}
            </div>
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
            <Link href="/customer/products" className={styles.headerNavLink}>
              قائمة المنتجات
            </Link>{' '}
            أو أضف عناصر من{' '}
            <Link href="/" className={styles.headerNavLink}>
              الصفحة الرئيسية
            </Link>
            .
          </div>
        ) : items.length > 0 ? (
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
                onClick={() => {
                  clearBasket()
                  refresh()
                }}
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
                        <img
                          src={item.image_url}
                          alt=""
                          className={styles.basketItemImg}
                          width={54}
                          height={54}
                        />
                      ) : (
                        <div
                          className={styles.basketItemImg}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(234,234,234,0.25)',
                            fontSize: '0.75rem',
                          }}
                        >
                          —
                        </div>
                      )}
                      <div className={styles.basketItemInfo}>
                        <div className={styles.basketItemName}>{item.name_ar || item.name}</div>
                        <div className={styles.basketItemMeta}>
                          <span>{label}</span>
                          {item.variant && <span> · {item.variant}</span>}
                          <span>
                            {' '}
                            · {item.currency === 'LYD' ? `${formatLyd(item.price)} د.ل` : `${formatUsd(item.price)} ${item.currency}`}{' '}
                            للوحدة
                          </span>
                        </div>
                      </div>
                      <div className={styles.basketQtyControl} aria-label="الكمية">
                        <button
                          type="button"
                          className={styles.basketQtyBtn}
                          onClick={() => bumpQuantity(item, -1)}
                          disabled={(item.quantity || 0) <= 1}
                          aria-label="تقليل الكمية"
                        >
                          −
                        </button>
                        <span className={styles.basketQtyValue}>{item.quantity || 0}</span>
                        <button
                          type="button"
                          className={styles.basketQtyBtn}
                          onClick={() => bumpQuantity(item, 1)}
                          aria-label="زيادة الكمية"
                        >
                          +
                        </button>
                      </div>
                      <span className={styles.basketItemPrice}>{formatLyd(lineTotalLyd(item))} د.ل</span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => {
                          removeBasketLine(item)
                          refresh()
                        }}
                        aria-label="إزالة"
                      >
                        <HiX />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>
                  {pricingMethod !== 1 ? 'المجموع الفرعي' : 'إجمالي السلة بالدينار الليبي'}
                </span>
                <span className={styles.totalAmount}>{formatLyd(subtotalLyd)} د.ل</span>
              </div>
              {pricingMethod !== 1 && shippingCost > 0 && (
                <div className={styles.totalRow} style={{ marginTop: '0.5rem', background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                  <span className={styles.totalLabel}>تكلفة الشحن</span>
                  <span className={styles.totalAmount} style={{ color: '#f59e0b' }}>{formatLyd(shippingCost)} د.ل</span>
                </div>
              )}
              {pricingMethod !== 1 && (
                <div className={styles.totalRow} style={{ marginTop: '0.5rem' }}>
                  <span className={styles.totalLabel} style={{ fontWeight: 800 }}>الإجمالي</span>
                  <span className={styles.totalAmount}>{formatLyd(totalLyd)} د.ل</span>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {items.length > 0 && (
          <div className={styles.checkoutWrap}>
            {checkoutPhase === 'idle' && (
              <button type="button" className={styles.checkoutStartBtn} onClick={goCheckoutContact}>
                إتمام الطلب — بياناتي والتوصيل
                <HiChevronLeft aria-hidden style={{ fontSize: '1.1rem' }} />
              </button>
            )}

            {(checkoutPhase === 'contact' || checkoutPhase === 'delivery') && (
              <div className={styles.checkoutCard}>
                <div className={styles.checkoutCardHead}>
                  <h2 className={styles.checkoutCardTitle}>إتمام الطلب</h2>
                  <div className={styles.checkoutSteps} aria-hidden>
                    <span className={checkoutPhase === 'contact' ? styles.checkoutStepActive : ''}>
                      <span className={styles.checkoutStepDot} />
                      بياناتك
                    </span>
                    <span style={{ opacity: 0.35 }}>←</span>
                    <span className={checkoutPhase === 'delivery' ? styles.checkoutStepActive : ''}>
                      <span className={styles.checkoutStepDot} />
                      التوصيل
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
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#08af66', fontSize: '0.8rem' }}>
                                  جاري التحقق...
                                </span>
                              )}
                              {loggedIn && (
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#08af66', fontSize: '0.8rem' }}>
                                  ✓ تم تسجيل الدخول
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Optional login prompt */}
                          {showLoginPrompt && existingCustomer && !loggedIn && (
                            <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                              <div className={styles.loginPromptBox}>
                                <div className={styles.loginPromptRow}>
                                  <HiUser style={{ color: '#08af66', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden />
                                  <span>
                                    مرحباً <strong>{existingCustomer.name}</strong>! هل تريد تسجيل الدخول لاستخدام بياناتك المحفوظة؟
                                  </span>
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
                                  <button
                                    type="button"
                                    className={styles.checkoutPrimaryBtn}
                                    onClick={handleLoginWithPassword}
                                    disabled={loginLoading}
                                    style={{ flex: 1 }}
                                  >
                                    <HiLockClosed style={{ verticalAlign: 'middle', marginInlineEnd: '0.3rem' }} />
                                    {loginLoading ? 'جاري...' : 'دخول'}
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.checkoutBackBtn}
                                    onClick={skipLogin}
                                    style={{ flex: 1 }}
                                  >
                                    تخطي
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                            <label className={styles.checkoutLabel} htmlFor="co-name">
                              الاسم الكامل <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                              id="co-name"
                              className={styles.checkoutInput}
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              autoComplete="name"
                            />
                          </div>
                          <div className={styles.checkoutField}>
                            <label className={styles.checkoutLabel} htmlFor="co-wa">
                              واتساب (اختياري)
                            </label>
                            <input
                              id="co-wa"
                              className={styles.checkoutInput}
                              type="tel"
                              dir="ltr"
                              value={whatsApp}
                              onChange={(e) => setWhatsApp(e.target.value)}
                            />
                          </div>
                          <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                            <label className={styles.checkoutLabel} htmlFor="co-email">
                              البريد الإلكتروني (اختياري)
                            </label>
                            <input
                              id="co-email"
                              className={styles.checkoutInput}
                              type="email"
                              dir="ltr"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              autoComplete="email"
                            />
                          </div>
                        </div>
                      </fieldset>
                      <div className={styles.checkoutActions}>
                        <button type="button" className={styles.checkoutBackBtn} onClick={() => setCheckoutPhase('idle')}>
                          إلغاء
                        </button>
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
                          <div className={styles.savedAddressesList} style={{ marginBottom: '1rem' }}>
                            <p className={styles.checkoutLabel} style={{ marginBottom: '0.5rem' }}>عناوين محفوظة:</p>
                            {savedAddresses.map((addr, i) => (
                              <button
                                key={i}
                                type="button"
                                className={styles.savedAddressChip}
                                onClick={() => {
                                  setCity(addr.city || '')
                                  setAddressLine(addr.address || '')
                                }}
                              >
                                {addr.city} — {(addr.address || '').slice(0, 30)}...
                              </button>
                            ))}
                          </div>
                        )}
                        <div className={styles.checkoutGrid}>
                          <div className={styles.checkoutField}>
                            <label className={styles.checkoutLabel} htmlFor="co-city">
                              المدينة <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                              id="co-city"
                              className={styles.checkoutInput}
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="مثال: طرابلس، بنغازي..."
                            />
                          </div>
                          <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                            <label className={styles.checkoutLabel} htmlFor="co-address">
                              العنوان التفصيلي <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <textarea
                              id="co-address"
                              className={styles.checkoutTextarea}
                              value={addressLine}
                              onChange={(e) => setAddressLine(e.target.value)}
                              placeholder="الحي، أقرب نقطة دالة، رقم المنزل أو المحل..."
                            />
                          </div>
                          <div className={`${styles.checkoutField} ${styles.checkoutFieldFull}`}>
                            <label className={styles.checkoutLabel} htmlFor="co-notes">
                              ملاحظات إضافية (اختياري)
                            </label>
                            <textarea
                              id="co-notes"
                              className={styles.checkoutTextarea}
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              placeholder="مقاسات، ألوان، تفضيلات التواصل..."
                            />
                          </div>
                        </div>
                      </fieldset>

                      {/* Pricing method summary */}
                      <div className={styles.pricingSummary}>
                        <div className={styles.pricingSummaryRow}>
                          <span>المجموع</span>
                          <span>{formatLyd(subtotalLyd)} د.ل</span>
                        </div>
                        {pricingMethod !== 1 && shippingCost > 0 && (
                          <div className={styles.pricingSummaryRow}>
                            <span>الشحن</span>
                            <span style={{ color: '#f59e0b' }}>{formatLyd(shippingCost)} د.ل</span>
                          </div>
                        )}
                        {pricingMethod === 2 && (
                          <div className={styles.pricingSummaryNote}>
                            ستحصل على كوبون خصم من Shein بعد تأكيد الطلب
                          </div>
                        )}
                        <div className={styles.pricingSummaryTotal}>
                          <span>الإجمالي</span>
                          <span>{formatLyd(totalLyd)} د.ل</span>
                        </div>
                      </div>

                      <div className={styles.checkoutActions}>
                        <button type="button" className={styles.checkoutBackBtn} onClick={goBackToContact}>
                          رجوع
                        </button>
                        <button
                          type="button"
                          className={styles.checkoutPrimaryBtn}
                          onClick={handleSubmitOrder}
                          disabled={submitLoading}
                        >
                          {submitLoading ? 'جاري الإرسال...' : 'إرسال الطلب'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <footer className={styles.footerStrip}>
          <Link href="/" className={styles.headerNavLink}>
            العودة إلى الرئيسية
          </Link>
        </footer>
      </div>
    </div>
  )
}
