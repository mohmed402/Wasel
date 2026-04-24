'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { convertToBaseAmount } from '../../lib/financialDisplay'
import styles from '../financial.module.css'
import { 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiTrendingDown,
  HiArrowLeft,
  HiArrowRight,
  HiClock
} from 'react-icons/hi'

// Supported currencies
const CURRENCIES = {
  EUR: { code: 'EUR', name: 'يورو', symbol: '€' },
  USD: { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  GBP: { code: 'GBP', name: 'جنيه إسترليني', symbol: '£' },
  LYD: { code: 'LYD', name: 'دينار ليبي', symbol: 'د.ل' },
  TRY: { code: 'TRY', name: 'ليرة تركية', symbol: '₺' }
}

// Account types (same as in main page)
const ASSET_TYPES = [
  { id: 'cash', name: 'الصندوق', color: '#16A34A' },
  { id: 'bank', name: 'حساب بنكي', color: '#2563EB' },
  { id: 'wallet', name: 'محفظة إلكترونية', color: '#7C3AED' },
  { id: 'gateway', name: 'بوابة دفع', color: '#F59E0B' },
  { id: 'receivable', name: 'ذمم مدينة', color: '#DC2626' }
]

const LIABILITY_TYPES = [
  { id: 'suppliers', name: 'مستحقات الموردين', color: '#DC2626' },
  { id: 'salaries', name: 'رواتب مستحقة', color: '#F59E0B' },
  { id: 'tax', name: 'ضرائب مستحقة', color: '#7C3AED' },
  { id: 'refunds', name: 'مبالغ مستردة للعملاء', color: '#16A34A' },
  { id: 'delivery', name: 'مستحقات منصات التوصيل', color: '#2563EB' }
]

export default function AccountTransactionsPage() {
  const params = useParams()
  const accountId = params.id

  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [accountNotFound, setAccountNotFound] = useState(false)
  const [toLYD, setToLYD] = useState({
    LYD: 1, USD: 6, EUR: 6.5, GBP: 8, TRY: 0.2,
  })

  const fetchData = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    setLoadError(null)
    setAccountNotFound(false)
    try {
      const settingsResponse = await fetch('/api/financial/settings')
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        setBaseCurrency(settings.base_currency || 'LYD')
      }

      const fxRes = await fetch('/api/financial/exchange-rates')
      if (fxRes.ok) {
        const fx = await fxRes.json()
        if (fx.toLYD && typeof fx.toLYD === 'object') setToLYD(fx.toLYD)
      }

      const accountResponse = await fetch(`/api/financial/accounts/${accountId}`)
      if (accountResponse.status === 404) {
        setAccount(null)
        setAccountNotFound(true)
        setTransactions([])
        return
      }
      if (!accountResponse.ok) {
        setAccount(null)
        setLoadError('تعذر تحميل الحساب')
        setTransactions([])
        return
      }
      const accountData = await accountResponse.json()
      setAccount(accountData)
      setAccountNotFound(false)

      const transactionsResponse = await fetch(
        `/api/financial/transactions?accountId=${accountId}&limit=1000`
      )
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData || [])
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error('Error fetching account data:', error)
      setLoadError(error?.message || 'حدث خطأ أثناء تحميل البيانات')
      setAccount(null)
      setAccountNotFound(false)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const convertToBase = (amount, fromCurrency) =>
    convertToBaseAmount(amount, fromCurrency, baseCurrency, toLYD)

  const formatCurrency = (amount, currency = baseCurrency) => {
    const currencyInfo = CURRENCIES[currency] || CURRENCIES.EUR
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

  const getAccountTypeData = (account) => {
    if (!account) return null
    const category = account.account_type === 'asset' 
      ? account.asset_category 
      : account.liability_category
    
    if (account.account_type === 'asset') {
      return ASSET_TYPES.find(t => t.id === category) || ASSET_TYPES[0]
    } else {
      return LIABILITY_TYPES.find(t => t.id === category) || LIABILITY_TYPES[0]
    }
  }

  if (loading) {
    return (
      <div className={styles.financialPage}>
        <div className={styles.statePanel}>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={styles.financialPage}>
        <div className={styles.statePanel}>
          <p style={{ marginBottom: '1rem' }}>{loadError}</p>
          <button type="button" className={styles.addButton} onClick={fetchData}>
            إعادة المحاولة
          </button>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/financial" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              العودة إلى الأصول والمديونية
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (accountNotFound || !account) {
    return (
      <div className={styles.financialPage}>
        <div className={styles.statePanel}>
          <p>الحساب غير موجود</p>
          <Link
            href="/financial"
            style={{ marginTop: '1rem', display: 'inline-block', color: 'var(--primary)', fontWeight: 500 }}
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    )
  }

  const accountTypeData = getAccountTypeData(account)
  const accountColor = account.color || accountTypeData?.color || '#2563EB'

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.transaction_date) - new Date(a.transaction_date)
  })

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
            تفاصيل الحساب: {account.name}
          </h1>
          <p className={styles.pageSubtitle}>
            جميع الحركات المالية لهذا الحساب
          </p>
        </div>
      </div>

      {/* Account Summary Card */}
      <div className={styles.accountCard} style={{ marginBottom: '2rem' }}>
        <div className={styles.accountHeader}>
          <div className={styles.accountIcon} style={{ backgroundColor: `${accountColor}20`, color: accountColor }}>
            {account.account_type === 'asset' ? (
              <HiTrendingUp style={{ fontSize: '2rem' }} />
            ) : (
              <HiTrendingDown style={{ fontSize: '2rem' }} />
            )}
          </div>
          <div className={styles.accountInfo}>
            <h3 className={styles.accountName}>{account.name}</h3>
            <div className={styles.accountBalance} style={{ color: accountColor }}>
              <div className={styles.balancePrimary}>
                {formatCurrency(account.balance, account.currency)}
              </div>
              {account.currency !== baseCurrency && (
                <div className={styles.balanceConverted}>
                  ≈ {formatCurrency(convertToBase(account.balance, account.currency))}
                </div>
              )}
            </div>
            <div className={styles.accountCurrency}>
              {CURRENCIES[account.currency]?.name || account.currency}
            </div>
            {account.account_type === 'liability' && account.due_date && (
              <div className={styles.dueDateInfo}>
                <HiClock className={styles.dueDateIcon} />
                <span className={styles.dueDateLabel}>تاريخ الاستحقاق:</span>
                <span className={styles.dueDate}>
                  {formatDate(account.due_date)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            جميع الحركات ({sortedTransactions.length})
          </h2>
        </div>

        {sortedTransactions.length > 0 ? (
          <div className={styles.tablePanel}>
            <ul className={`${styles.transactionsList} ${styles.listPlain}`}>
              {sortedTransactions.map((tx) => {
                // Determine if this is a credit or debit for this account
                const isCredit = tx.transaction_type === 'credit' || 
                  (tx.transaction_type === 'transfer' && tx.related_account_id === account.id)
                const isDebit = tx.transaction_type === 'debit' || 
                  (tx.transaction_type === 'transfer' && tx.account_id === account.id)
                
                const displayAmount = isCredit ? tx.amount : -tx.amount
                const amountClass = displayAmount > 0 ? styles.credit : styles.debit

                return (
                  <li 
                    key={tx.id} 
                    className={styles.transactionRowFlat}
                  >
                    <div className={styles.transactionDetails} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span className={styles.transactionDescription} style={{ fontWeight: '500', fontSize: '1rem' }}>
                          {tx.description}
                        </span>
                        {tx.transaction_type === 'transfer' && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            background: '#EFF6FF', 
                            color: '#2563EB',
                            borderRadius: '4px'
                          }}>
                            تحويل
                          </span>
                        )}
                      </div>
                      <span className={styles.transactionDate}>
                        {formatDate(tx.transaction_date)}
                      </span>
                    </div>
                    <span className={`${styles.transactionAmount} ${amountClass}`} style={{ textAlign: 'left', minWidth: '150px' }}>
                      <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                        {displayAmount > 0 ? '+' : ''}{formatCurrency(Math.abs(displayAmount), tx.currency)}
                      </div>
                      {tx.currency !== baseCurrency && (
                        <div className={styles.transactionConverted} style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          ≈ {displayAmount > 0 ? '+' : ''}{formatCurrency(convertToBase(Math.abs(displayAmount), tx.currency))}
                        </div>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className={styles.statePanel}>
            <p className={styles.noTransactions} style={{ fontSize: '1.125rem' }}>
              لا توجد حركات لهذا الحساب
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

