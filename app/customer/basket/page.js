'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { HiX, HiTrash, HiCheckCircle, HiChevronLeft, HiShoppingBag } from 'react-icons/hi'

function extractProductIdFromSheinUrl(input) {
  const s = (input || '').trim()
  if (!s) return null
  const m =
    s.match(/-p-(\d+)/i) ||
    s.match(/\/product[s]?\/?(\d+)/i) ||
    s.match(/goods_id[=:](\d+)/i) ||
    s.match(/(\d{6,})/)
  return m ? m[1] : null
}

export default function CustomerBasketPage() {
  const [items, setItems] = useState([])
  const [exchangeRate, setExchangeRate] = useState(5.2)

  const [checkoutPhase, setCheckoutPhase] = useState('idle')
  const [submittedRef, setSubmittedRef] = useState(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [whatsApp, setWhatsApp] = useState('')
  const [city, setCity] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [checkoutFieldError, setCheckoutFieldError] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const refresh = useCallback(() => {
    setItems(getBasket().items)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d) => setExchangeRate(d.USD || 5.2))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (checkoutPhase === 'success' && submittedRef && items.length > 0) {
      setCheckoutPhase('idle')
      setSubmittedRef(null)
    }
  }, [checkoutPhase, submittedRef, items.length])

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

    const snapshot = getBasket().items
    if (snapshot.length === 0) {
      setSubmitError('السلة فارغة')
      return
    }

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
      setEmail('')
      setWhatsApp('')
      setCity('')
      setAddressLine('')
      setOrderNotes('')
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

  const totalLyd = items.reduce((s, i) => s + lineTotalLyd(i), 0)
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

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={unitCount} />

      <div className={styles.content}>
        <h1 className={styles.productListTitle}>سلة المشتريات</h1>
        <p className={styles.basketPageIntro}>هنا تظهر فقط المنتجات التي قمت بإضافتها إلى السلة.</p>

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
            أو أضف عناصر من Shein بالأعلى.
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
                  setImportMessage('')
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
                <span className={styles.totalLabel}>إجمالي السلة بالدينار الليبي</span>
                <span className={styles.totalAmount}>{formatLyd(totalLyd)} د.ل</span>
              </div>
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
                            <label className={styles.checkoutLabel} htmlFor="co-phone">
                              رقم الهاتف <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                              id="co-phone"
                              className={styles.checkoutInput}
                              type="tel"
                              dir="ltr"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              autoComplete="tel"
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
