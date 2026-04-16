'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '../financial.module.css'
import { 
  HiCog, 
  HiArrowRight,
  HiCheckCircle,
  HiX,
  HiRefresh,
  HiTruck,
  HiCurrencyDollar,
} from 'react-icons/hi'

// Supported currencies
const CURRENCIES = {
  EUR: { code: 'EUR', name: 'يورو', symbol: '€' },
  USD: { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  GBP: { code: 'GBP', name: 'جنيه إسترليني', symbol: '£' },
  LYD: { code: 'LYD', name: 'دينار ليبي', symbol: 'د.ل' },
  TRY: { code: 'TRY', name: 'ليرة تركية', symbol: '₺' }
}

const PRICING_METHODS = [
  {
    id: 1,
    label: 'الطريقة الأولى — شحن مجاني للزبون',
    desc: 'الشحن مجاني على الزبون. الكوبون خاص بالإدارة (More Express).',
  },
  {
    id: 2,
    label: 'الطريقة الثانية — شحن مدفوع، الكوبون للزبون',
    desc: 'الزبون يدفع تكلفة الشحن. الكوبون يُعطى للزبون ليستفيد منه.',
  },
  {
    id: 3,
    label: 'الطريقة الثالثة — شحن مدفوع، الكوبون لـ More Express',
    desc: 'الزبون يدفع تكلفة الشحن. الكوبونات تبقى لـ More Express.',
  },
]

export default function FinancialSettingsPage() {
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Pricing system
  const [pricingMethod, setPricingMethod] = useState(1)
  const [shippingCost, setShippingCost] = useState(0)
  const [exchangeRateDisplay, setExchangeRateDisplay] = useState(6.0)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingSuccess, setPricingSuccess] = useState(false)
  const [pricingError, setPricingError] = useState(null)

  useEffect(() => {
    fetchSettings()
    fetchPricingSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/financial/settings')
      if (response.ok) {
        const settings = await response.json()
        setBaseCurrency(settings.base_currency || 'LYD')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setSaveError('حدث خطأ أثناء تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  const fetchPricingSettings = async () => {
    try {
      const res = await fetch('/api/pricing-settings')
      if (res.ok) {
        const d = await res.json()
        if (d.pricingMethod) setPricingMethod(d.pricingMethod)
        if (typeof d.shippingCost === 'number') setShippingCost(d.shippingCost)
        if (typeof d.exchangeRateDisplay === 'number') setExchangeRateDisplay(d.exchangeRateDisplay)
      }
    } catch (_) {}
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      const response = await fetch('/api/financial/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_currency: baseCurrency })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update settings')
      }

      const verifyResponse = await fetch('/api/financial/settings')
      if (verifyResponse.ok) {
        const updatedSettings = await verifyResponse.json()
        setBaseCurrency(updatedSettings.base_currency || 'LYD')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveError(error.message || 'حدث خطأ أثناء حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePricing = async () => {
    setPricingSaving(true)
    setPricingError(null)
    setPricingSuccess(false)
    try {
      const res = await fetch('/api/pricing-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingMethod, shippingCost: Number(shippingCost), exchangeRateDisplay: Number(exchangeRateDisplay) }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'فشل الحفظ')
      }
      setPricingSuccess(true)
      setTimeout(() => setPricingSuccess(false), 3000)
    } catch (e) {
      setPricingError(e.message)
    } finally {
      setPricingSaving(false)
    }
  }

  const formatCurrencySymbol = (currency) => {
    return CURRENCIES[currency]?.symbol || currency
  }

  return (
    <div className={styles.financialPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <Link 
            href="/financial" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'var(--primary)',
              marginBottom: '1rem',
              textDecoration: 'none'
            }}
          >
            <HiArrowRight style={{ transform: 'rotate(180deg)' }} />
            العودة
          </Link>
          <h1 className={styles.pageTitle}>
            <HiCog className={styles.titleIcon} />
            الإعدادات المالية
          </h1>
          <p className={styles.pageSubtitle}>
            إدارة إعدادات النظام المالي
          </p>
        </div>
        <button 
          className={styles.addButton}
          onClick={fetchSettings}
          title="تحديث"
        >
          <HiRefresh />
          تحديث
        </button>
      </div>

      {/* Settings Form */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>إعدادات العملة</h2>
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          maxWidth: '600px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>جاري التحميل...</p>
            </div>
          ) : (
            <>
              <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                <label className={styles.required} style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  العملة الأساسية للتقارير
                </label>
                <p className={styles.helpText} style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  جميع المبالغ سيتم تحويلها إلى هذه العملة في التقارير والعروض الإجمالية
                </p>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className={styles.modalSelect}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '1rem'
                  }}
                >
                  {Object.values(CURRENCIES).map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.code}) {curr.symbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Selection Display */}
              <div style={{ 
                background: '#F3F4F6', 
                padding: '1rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontWeight: '500' }}>العملة الحالية:</span>
                <span style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: 'var(--primary)'
                }}>
                  {formatCurrencySymbol(baseCurrency)} {baseCurrency}
                </span>
              </div>

              {/* Success/Error Messages */}
              {saveSuccess && (
                <div style={{ 
                  background: '#ECFDF5', 
                  border: '1px solid #16A34A', 
                  color: '#16A34A',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <HiCheckCircle />
                  تم حفظ الإعدادات بنجاح
                </div>
              )}

              {saveError && (
                <div style={{ 
                  background: '#FEF2F2', 
                  border: '1px solid #DC2626', 
                  color: '#DC2626',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <HiX />
                  {saveError}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <Link 
                  href="/financial"
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#374151',
                    textDecoration: 'none',
                    fontWeight: '500',
                    display: 'inline-block'
                  }}
                >
                  إلغاء
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: saving ? '#9CA3AF' : 'var(--primary)',
                    color: 'white',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Pricing Method Section ── */}
      <div className={styles.section} style={{ marginTop: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <HiTruck style={{ marginInlineEnd: '0.5rem', verticalAlign: 'middle' }} />
            نظام التسعير والشحن
          </h2>
        </div>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#6B7280', marginBottom: '1.25rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
            اختر طريقة التسعير التي تنطبق على الطلبات القادمة من موقع العملاء.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {PRICING_METHODS.map((m) => (
              <label
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: `2px solid ${pricingMethod === m.id ? '#16a34a' : '#e5e7eb'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: pricingMethod === m.id ? '#f0fdf4' : 'white',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="pricingMethod"
                  value={m.id}
                  checked={pricingMethod === m.id}
                  onChange={() => setPricingMethod(m.id)}
                  style={{ marginTop: '0.2rem', accentColor: '#16a34a' }}
                />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{m.label}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.5 }}>{m.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {pricingMethod !== 1 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
                تكلفة الشحن (د.ل)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', width: '100%', maxWidth: '240px' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <HiCurrencyDollar />
              سعر الدولار المعروض للزبون (د.ل لكل $1)
            </label>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '0.5rem' }}>
              السعر الذي يُعرض للزبون عند احتساب إجمالي السلة بالدينار (مثال: 6 أو 6.25)
            </p>
            <input
              type="number"
              min="1"
              step="0.25"
              value={exchangeRateDisplay}
              onChange={(e) => setExchangeRateDisplay(e.target.value)}
              style={{ padding: '0.65rem 1rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', width: '100%', maxWidth: '240px' }}
            />
          </div>

          {pricingSuccess && (
            <div style={{ background: '#ECFDF5', border: '1px solid #16A34A', color: '#16A34A', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiCheckCircle /> تم حفظ إعدادات التسعير بنجاح
            </div>
          )}
          {pricingError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #DC2626', color: '#DC2626', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiX /> {pricingError}
            </div>
          )}

          <button
            onClick={handleSavePricing}
            disabled={pricingSaving}
            style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px', background: pricingSaving ? '#9CA3AF' : '#16a34a', color: 'white', fontWeight: 600, cursor: pricingSaving ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
          >
            {pricingSaving ? 'جاري الحفظ...' : 'حفظ إعدادات التسعير'}
          </button>
        </div>
      </div>

      {/* Additional Settings Section */}
      <div className={styles.section} style={{ marginTop: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>معلومات إضافية</h2>
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '2rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>حول العملة الأساسية</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.6' }}>
              العملة الأساسية هي العملة التي يتم استخدامها في جميع التقارير والعروض الإجمالية. 
              جميع المبالغ في العملات الأخرى سيتم تحويلها تلقائياً إلى العملة الأساسية باستخدام أسعار الصرف المحددة.
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>أسعار الصرف</h3>
            <p style={{ color: '#6B7280', lineHeight: '1.6' }}>
              حالياً يتم استخدام أسعار صرف افتراضية. يمكن تحديث هذه الأسعار من خلال واجهة برمجة التطبيقات أو قاعدة البيانات.
            </p>
          </div>

          <div>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '600' }}>العملات المدعومة</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {Object.values(CURRENCIES).map((curr) => (
                <span 
                  key={curr.code}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#F3F4F6',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span>{curr.symbol}</span>
                  <span>{curr.name}</span>
                  <span style={{ color: '#6B7280' }}>({curr.code})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

