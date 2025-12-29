'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '../financial.module.css'
import { 
  HiCog, 
  HiArrowRight,
  HiCheckCircle,
  HiX,
  HiRefresh
} from 'react-icons/hi'

// Supported currencies
const CURRENCIES = {
  EUR: { code: 'EUR', name: 'يورو', symbol: '€' },
  USD: { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  GBP: { code: 'GBP', name: 'جنيه إسترليني', symbol: '£' },
  LYD: { code: 'LYD', name: 'دينار ليبي', symbol: 'د.ل' },
  TRY: { code: 'TRY', name: 'ليرة تركية', symbol: '₺' }
}

export default function FinancialSettingsPage() {
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    fetchSettings()
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

      // Verify the save by fetching the updated settings
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

