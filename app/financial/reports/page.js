'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from '../financial.module.css'
import { 
  HiCurrencyDollar, 
  HiArrowRight,
  HiTrendingUp,
  HiTrendingDown,
  HiChartBar,
  HiDownload,
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

// Exchange rates (mock - will be fetched from API or database)
const EXCHANGE_RATES = {
  EUR: { EUR: 1, USD: 1.08, GBP: 0.85, LYD: 5.2, TRY: 33.5 },
  USD: { EUR: 0.93, USD: 1, GBP: 0.79, LYD: 4.8, TRY: 31.0 },
  GBP: { EUR: 1.18, USD: 1.27, GBP: 1, LYD: 6.1, TRY: 39.4 },
  LYD: { EUR: 0.19, USD: 0.21, GBP: 0.16, LYD: 1, TRY: 6.4 },
  TRY: { EUR: 0.030, USD: 0.032, GBP: 0.025, LYD: 0.16, TRY: 1 }
}

export default function FinancialReportsPage() {
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)
  const [reportPeriod, setReportPeriod] = useState('month') // 'day', 'week', 'month', 'year', 'custom'
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [assets, setAssets] = useState([])
  const [liabilities, setLiabilities] = useState([])
  const [transactions, setTransactions] = useState([])

  const getDateRange = useCallback(() => {
    const today = new Date()
    let dateFrom, dateTo

    switch (reportPeriod) {
      case 'day':
        dateFrom = today.toISOString().split('T')[0]
        dateTo = today.toISOString().split('T')[0]
        break
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        dateFrom = weekStart.toISOString().split('T')[0]
        dateTo = today.toISOString().split('T')[0]
        break
      case 'month':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        dateTo = today.toISOString().split('T')[0]
        break
      case 'year':
        dateFrom = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
        dateTo = today.toISOString().split('T')[0]
        break
      case 'custom':
        dateFrom = customDateFrom
        dateTo = customDateTo
        break
      default:
        dateFrom = null
        dateTo = null
    }

    return { dateFrom, dateTo }
  }, [reportPeriod, customDateFrom, customDateTo])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch settings to get base currency
      const settingsResponse = await fetch('/api/financial/settings')
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        setBaseCurrency(settings.base_currency || 'LYD')
      }

      // Fetch accounts
      const assetsResponse = await fetch('/api/financial/accounts?accountType=asset&activeOnly=true')
      const liabilitiesResponse = await fetch('/api/financial/accounts?accountType=liability&activeOnly=true')
      
      const assetsData = assetsResponse.ok ? await assetsResponse.json() : []
      const liabilitiesData = liabilitiesResponse.ok ? await liabilitiesResponse.json() : []
      setAssets(assetsData)
      setLiabilities(liabilitiesData)

      // Calculate date range
      const { dateFrom, dateTo } = getDateRange()
      
      // Fetch all transactions (we'll filter by date client-side)
      const params = new URLSearchParams()
      params.append('limit', '10000')

      const transactionsResponse = await fetch(`/api/financial/transactions?${params.toString()}`)
      if (transactionsResponse.ok) {
        let transactionsData = await transactionsResponse.json()
        
        // Filter by date if custom dates are set
        if (dateFrom || dateTo) {
          transactionsData = transactionsData.filter(tx => {
            const txDate = new Date(tx.transaction_date)
            txDate.setHours(0, 0, 0, 0) // Reset time to start of day
            
            if (dateFrom) {
              const fromDate = new Date(dateFrom)
              fromDate.setHours(0, 0, 0, 0)
              if (txDate < fromDate) return false
            }
            
            if (dateTo) {
              const toDate = new Date(dateTo)
              toDate.setHours(23, 59, 59, 999) // End of day
              if (txDate > toDate) return false
            }
            
            return true
          })
        }

        setTransactions(transactionsData || [])
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const convertToBase = (amount, fromCurrency) => {
    if (fromCurrency === baseCurrency) return amount
    const rate = EXCHANGE_RATES[fromCurrency]?.[baseCurrency] || 1
    return amount * rate
  }

  const formatCurrency = (amount, currency = baseCurrency) => {
    return new Intl.NumberFormat('ar-LY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Calculate report statistics
  const calculateStats = () => {
    const totalAssets = assets.reduce((sum, asset) => {
      return sum + convertToBase(asset.balance, asset.currency)
    }, 0)

    const totalLiabilities = liabilities.reduce((sum, liability) => {
      return sum + convertToBase(liability.balance, liability.currency)
    }, 0)

    const periodTransactions = transactions.reduce((acc, tx) => {
      const isCredit = tx.transaction_type === 'credit' || 
        (tx.transaction_type === 'transfer' && tx.related_account_id)
      const amount = isCredit ? tx.amount : -tx.amount
      const baseAmount = convertToBase(amount, tx.currency)
      
      acc.totalCredits += isCredit ? baseAmount : 0
      acc.totalDebits += !isCredit ? Math.abs(baseAmount) : 0
      acc.netFlow += baseAmount
      acc.count++
      
      return acc
    }, { totalCredits: 0, totalDebits: 0, netFlow: 0, count: 0 })

    return {
      totalAssets,
      totalLiabilities,
      netPosition: totalAssets - totalLiabilities,
      periodTransactions
    }
  }

  const stats = calculateStats()

  const handleExport = () => {
    // Create CSV content
    const csvRows = []
    csvRows.push(['التاريخ', 'الوصف', 'النوع', 'المبلغ', 'العملة'].join(','))
    
    transactions.forEach(tx => {
      const isCredit = tx.transaction_type === 'credit' || 
        (tx.transaction_type === 'transfer' && tx.related_account_id)
      const amount = isCredit ? tx.amount : -tx.amount
      csvRows.push([
        tx.transaction_date,
        tx.description,
        tx.transaction_type,
        amount,
        tx.currency
      ].join(','))
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <HiChartBar className={styles.titleIcon} />
            التقارير المالية
          </h1>
          <p className={styles.pageSubtitle}>
            تحليل وتقارير شاملة عن الوضع المالي
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={styles.addButton}
            onClick={handleExport}
            title="تصدير التقرير"
          >
            <HiDownload />
            تصدير
          </button>
          <button 
            className={styles.addButton}
            onClick={fetchData}
            title="تحديث"
          >
            <HiRefresh />
            تحديث
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className={styles.section} style={{ marginBottom: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>اختر الفترة</h2>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '1.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '1rem',
              minWidth: '200px'
            }}
          >
            <option value="day">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="year">هذه السنة</option>
            <option value="custom">فترة مخصصة</option>
          </select>

          {reportPeriod === 'custom' && (
            <>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                placeholder="من تاريخ"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #E5E5E7EB',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                placeholder="إلى تاريخ"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </>
          )}

          {(() => {
            const { dateFrom, dateTo } = getDateRange()
            if (dateFrom && dateTo) {
              return (
                <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                  من {formatDate(dateFrom)} إلى {formatDate(dateTo)}
                </span>
              )
            }
            return null
          })()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingUp className={styles.summaryIcon} style={{ color: '#16A34A' }} />
            <span className={styles.summaryLabel}>إجمالي الأصول</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#16A34A' }}>
            {formatCurrency(stats.totalAssets)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingDown className={styles.summaryIcon} style={{ color: '#DC2626' }} />
            <span className={styles.summaryLabel}>إجمالي المديونية</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#DC2626' }}>
            {formatCurrency(stats.totalLiabilities)}
          </div>
        </div>

        <div className={`${styles.summaryCard} ${stats.netPosition >= 0 ? styles.summaryCardPositive : styles.summaryCardNegative}`}>
          <div className={styles.summaryCardHeader}>
            <HiCurrencyDollar className={styles.summaryIcon} style={{ color: stats.netPosition >= 0 ? '#16A34A' : '#DC2626' }} />
            <span className={styles.summaryLabel}>صافي المركز المالي</span>
          </div>
          <div className={styles.summaryValue} style={{ color: stats.netPosition >= 0 ? '#16A34A' : '#DC2626' }}>
            {formatCurrency(stats.netPosition)}
          </div>
        </div>
      </div>

      {/* Period Statistics */}
      <div className={styles.summaryCards} style={{ marginTop: '1.5rem' }}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingUp className={styles.summaryIcon} style={{ color: '#16A34A' }} />
            <span className={styles.summaryLabel}>إجمالي الإيداعات ({reportPeriod === 'day' ? 'اليوم' : reportPeriod === 'week' ? 'هذا الأسبوع' : reportPeriod === 'month' ? 'هذا الشهر' : reportPeriod === 'year' ? 'هذه السنة' : 'الفترة المحددة'})</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#16A34A' }}>
            {formatCurrency(stats.periodTransactions.totalCredits)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.5rem' }}>
            {stats.periodTransactions.count} حركة
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingDown className={styles.summaryIcon} style={{ color: '#DC2626' }} />
            <span className={styles.summaryLabel}>إجمالي السحوبات ({reportPeriod === 'day' ? 'اليوم' : reportPeriod === 'week' ? 'هذا الأسبوع' : reportPeriod === 'month' ? 'هذا الشهر' : reportPeriod === 'year' ? 'هذه السنة' : 'الفترة المحددة'})</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#DC2626' }}>
            {formatCurrency(stats.periodTransactions.totalDebits)}
          </div>
        </div>

        <div className={`${styles.summaryCard} ${stats.periodTransactions.netFlow >= 0 ? styles.summaryCardPositive : styles.summaryCardNegative}`}>
          <div className={styles.summaryCardHeader}>
            <HiCurrencyDollar className={styles.summaryIcon} style={{ color: stats.periodTransactions.netFlow >= 0 ? '#16A34A' : '#DC2626' }} />
            <span className={styles.summaryLabel}>صافي التدفق ({reportPeriod === 'day' ? 'اليوم' : reportPeriod === 'week' ? 'هذا الأسبوع' : reportPeriod === 'month' ? 'هذا الشهر' : reportPeriod === 'year' ? 'هذه السنة' : 'الفترة المحددة'})</span>
          </div>
          <div className={styles.summaryValue} style={{ color: stats.periodTransactions.netFlow >= 0 ? '#16A34A' : '#DC2626' }}>
            {formatCurrency(stats.periodTransactions.netFlow)}
          </div>
        </div>
      </div>

      {/* Account Breakdown */}
      <div className={styles.section} style={{ marginTop: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>تفصيل الحسابات</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Assets */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiTrendingUp /> الأصول
            </h3>
            {assets.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {assets.map(asset => (
                  <li key={asset.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{asset.name}</span>
                    <span style={{ fontWeight: '600', color: '#16A34A' }}>
                      {formatCurrency(convertToBase(asset.balance, asset.currency))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#6B7280' }}>لا توجد أصول</p>
            )}
          </div>

          {/* Liabilities */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HiTrendingDown /> المديونية
            </h3>
            {liabilities.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {liabilities.map(liability => (
                  <li key={liability.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{liability.name}</span>
                    <span style={{ fontWeight: '600', color: '#DC2626' }}>
                      {formatCurrency(convertToBase(liability.balance, liability.currency))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#6B7280' }}>لا توجد مديونية</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

