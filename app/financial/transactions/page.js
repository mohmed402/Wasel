'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '../financial.module.css'
import { 
  HiCurrencyDollar, 
  HiArrowRight,
  HiTrendingUp,
  HiTrendingDown,
  HiRefresh,
  HiFilter
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

export default function AllTransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    accountId: '',
    transactionType: '',
    dateFrom: '',
    dateTo: ''
  })

  useEffect(() => {
    fetchData()
  }, [filters])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch settings to get base currency
      const settingsResponse = await fetch('/api/financial/settings')
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        setBaseCurrency(settings.base_currency || 'LYD')
      }

      // Fetch all accounts
      const assetsResponse = await fetch('/api/financial/accounts?accountType=asset&activeOnly=true')
      const liabilitiesResponse = await fetch('/api/financial/accounts?accountType=liability&activeOnly=true')
      
      const assets = assetsResponse.ok ? await assetsResponse.json() : []
      const liabilities = liabilitiesResponse.ok ? await liabilitiesResponse.json() : []
      setAccounts([...assets, ...liabilities])

      // Build query params
      const params = new URLSearchParams()
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.transactionType) params.append('transactionType', filters.transactionType)
      params.append('limit', '1000')

      // Fetch transactions
      const transactionsResponse = await fetch(`/api/financial/transactions?${params.toString()}`)
      if (transactionsResponse.ok) {
        let transactionsData = await transactionsResponse.json()
        
        // Filter by date if provided
        if (filters.dateFrom || filters.dateTo) {
          transactionsData = transactionsData.filter(tx => {
            const txDate = new Date(tx.transaction_date)
            txDate.setHours(0, 0, 0, 0) // Reset time to start of day
            
            if (filters.dateFrom) {
              const fromDate = new Date(filters.dateFrom)
              fromDate.setHours(0, 0, 0, 0)
              if (txDate < fromDate) return false
            }
            
            if (filters.dateTo) {
              const toDate = new Date(filters.dateTo)
              toDate.setHours(23, 59, 59, 999) // End of day
              if (txDate > toDate) return false
            }
            
            return true
          })
        }

        setTransactions(transactionsData || [])
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId)
    return account?.name || 'غير معروف'
  }

  const getTransactionTypeLabel = (type) => {
    const labels = {
      credit: 'إيداع',
      debit: 'سحب',
      transfer: 'تحويل'
    }
    return labels[type] || type
  }

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.transaction_date) - new Date(a.transaction_date)
  })

  // Calculate totals
  const totals = sortedTransactions.reduce((acc, tx) => {
    const isCredit = tx.transaction_type === 'credit' || 
      (tx.transaction_type === 'transfer' && tx.related_account_id)
    const amount = isCredit ? tx.amount : -tx.amount
    const baseAmount = convertToBase(amount, tx.currency)
    
    acc.totalCredits += isCredit ? baseAmount : 0
    acc.totalDebits += !isCredit ? Math.abs(baseAmount) : 0
    acc.netAmount += baseAmount
    
    return acc
  }, { totalCredits: 0, totalDebits: 0, netAmount: 0 })

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
            <HiCurrencyDollar className={styles.titleIcon} />
            جميع الحركات المالية
          </h1>
          <p className={styles.pageSubtitle}>
            عرض وتصفية جميع المعاملات المالية
          </p>
        </div>
        <button 
          className={styles.addButton}
          onClick={fetchData}
          title="تحديث"
        >
          <HiRefresh />
          تحديث
        </button>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingUp className={styles.summaryIcon} style={{ color: '#16A34A' }} />
            <span className={styles.summaryLabel}>إجمالي الإيداعات</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#16A34A' }}>
            {formatCurrency(totals.totalCredits)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingDown className={styles.summaryIcon} style={{ color: '#DC2626' }} />
            <span className={styles.summaryLabel}>إجمالي السحوبات</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#DC2626' }}>
            {formatCurrency(totals.totalDebits)}
          </div>
        </div>

        <div className={`${styles.summaryCard} ${totals.netAmount >= 0 ? styles.summaryCardPositive : styles.summaryCardNegative}`}>
          <div className={styles.summaryCardHeader}>
            <HiCurrencyDollar className={styles.summaryIcon} style={{ color: totals.netAmount >= 0 ? '#16A34A' : '#DC2626' }} />
            <span className={styles.summaryLabel}>صافي الحركة</span>
          </div>
          <div className={styles.summaryValue} style={{ color: totals.netAmount >= 0 ? '#16A34A' : '#DC2626' }}>
            {formatCurrency(totals.netAmount)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.section} style={{ marginBottom: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <HiFilter className={styles.sectionIcon} />
            التصفية
          </h2>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '1.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>الحساب</label>
            <select
              value={filters.accountId}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">جميع الحسابات</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>نوع الحركة</label>
            <select
              value={filters.transactionType}
              onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="">جميع الأنواع</option>
              <option value="credit">إيداع</option>
              <option value="debit">سحب</option>
              <option value="transfer">تحويل</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>من تاريخ</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>إلى تاريخ</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            الحركات ({sortedTransactions.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '3rem', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p>جاري التحميل...</p>
          </div>
        ) : sortedTransactions.length > 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>التاريخ</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>الوصف</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>الحساب</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>النوع</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((tx) => {
                    const isCredit = tx.transaction_type === 'credit' || 
                      (tx.transaction_type === 'transfer' && tx.related_account_id)
                    const displayAmount = isCredit ? tx.amount : -tx.amount
                    const amountClass = displayAmount > 0 ? styles.credit : styles.debit

                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: '500' }}>{tx.description}</div>
                          {tx.transaction_type === 'transfer' && tx.related_account_id && (
                            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                              إلى: {getAccountName(tx.related_account_id)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <Link 
                            href={`/financial/${tx.account_id}`}
                            style={{ color: 'var(--primary)', textDecoration: 'none' }}
                          >
                            {getAccountName(tx.account_id)}
                          </Link>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <span style={{ 
                            fontSize: '0.875rem', 
                            padding: '0.25rem 0.5rem', 
                            background: tx.transaction_type === 'transfer' ? '#EFF6FF' : 
                                       tx.transaction_type === 'credit' ? '#ECFDF5' : '#FEF2F2',
                            color: tx.transaction_type === 'transfer' ? '#2563EB' : 
                                   tx.transaction_type === 'credit' ? '#16A34A' : '#DC2626',
                            borderRadius: '4px'
                          }}>
                            {getTransactionTypeLabel(tx.transaction_type)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div className={`${styles.transactionAmount} ${amountClass}`} style={{ fontWeight: '600' }}>
                            {displayAmount > 0 ? '+' : ''}{formatCurrency(Math.abs(displayAmount), tx.currency)}
                          </div>
                          {tx.currency !== baseCurrency && (
                            <div className={styles.transactionConverted} style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                              ≈ {displayAmount > 0 ? '+' : ''}{formatCurrency(convertToBase(Math.abs(displayAmount), tx.currency))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '3rem', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p className={styles.noTransactions} style={{ fontSize: '1.125rem', color: '#6B7280' }}>
              لا توجد حركات
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

