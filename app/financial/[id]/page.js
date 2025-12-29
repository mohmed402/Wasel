'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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

// Exchange rates (mock - will be fetched from API or database)
const EXCHANGE_RATES = {
  EUR: { EUR: 1, USD: 1.08, GBP: 0.85, LYD: 5.2, TRY: 33.5 },
  USD: { EUR: 0.93, USD: 1, GBP: 0.79, LYD: 4.8, TRY: 31.0 },
  GBP: { EUR: 1.18, USD: 1.27, GBP: 1, LYD: 6.1, TRY: 39.4 },
  LYD: { EUR: 0.19, USD: 0.21, GBP: 0.16, LYD: 1, TRY: 6.4 },
  TRY: { EUR: 0.030, USD: 0.032, GBP: 0.025, LYD: 0.16, TRY: 1 }
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
  const router = useRouter()
  const accountId = params.id

  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch settings to get base currency
        const settingsResponse = await fetch('/api/financial/settings')
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          setBaseCurrency(settings.base_currency || 'LYD')
        }

        // Fetch account details
        const accountResponse = await fetch(`/api/financial/accounts/${accountId}`)
        if (!accountResponse.ok) {
          throw new Error('Failed to fetch account')
        }
        const accountData = await accountResponse.json()
        setAccount(accountData)

        // Fetch all transactions for this account
        const transactionsResponse = await fetch(
          `/api/financial/transactions?accountId=${accountId}&limit=1000`
        )
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json()
          setTransactions(transactionsData || [])
        }
      } catch (error) {
        console.error('Error fetching account data:', error)
        alert('حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    if (accountId) {
      fetchData()
    }
  }, [accountId])

  const convertToBase = (amount, fromCurrency) => {
    if (fromCurrency === baseCurrency) return amount
    const rate = EXCHANGE_RATES[fromCurrency]?.[baseCurrency] || 1
    return amount * rate
  }

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
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className={styles.financialPage}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>الحساب غير موجود</p>
          <Link href="/financial" style={{ marginTop: '1rem', display: 'inline-block', color: 'var(--primary)' }}>
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
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <ul className={styles.transactionsList} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
                    className={styles.transactionItem}
                    style={{ 
                      padding: '1rem', 
                      borderBottom: '1px solid #E5E7EB',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
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
                      <span className={styles.transactionDate} style={{ fontSize: '0.875rem', color: '#6B7280' }}>
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
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '3rem', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <p className={styles.noTransactions} style={{ fontSize: '1.125rem', color: '#6B7280' }}>
              لا توجد حركات لهذا الحساب
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

