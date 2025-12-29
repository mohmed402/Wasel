'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './financial.module.css'
import { 
  HiCurrencyDollar, 
  HiTrendingUp, 
  HiTrendingDown,
  HiCash,
  HiOfficeBuilding,
  HiCreditCard,
  HiCollection,
  HiUserGroup,
  HiShoppingBag,
  HiBriefcase,
  HiReceiptTax,
  HiRefresh,
  HiTruck,
  HiArrowRight,
  HiArrowLeft,
  HiClock,
  HiPlus,
  HiX,
  HiCog,
  HiArrowsExpand,
  HiDotsVertical,
  HiPencil,
  HiTrash
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

// Account types
const ASSET_TYPES = [
  { id: 'cash', name: 'الصندوق', icon: HiCash, color: '#16A34A' },
  { id: 'bank', name: 'حساب بنكي', icon: HiOfficeBuilding, color: '#2563EB' },
  { id: 'wallet', name: 'محفظة إلكترونية', icon: HiCreditCard, color: '#7C3AED' },
  { id: 'gateway', name: 'بوابة دفع', icon: HiCollection, color: '#F59E0B' },
  { id: 'receivable', name: 'ذمم مدينة', icon: HiUserGroup, color: '#DC2626' }
]

const LIABILITY_TYPES = [
  { id: 'suppliers', name: 'مستحقات الموردين', icon: HiShoppingBag, color: '#DC2626' },
  { id: 'salaries', name: 'رواتب مستحقة', icon: HiBriefcase, color: '#F59E0B' },
  { id: 'tax', name: 'ضرائب مستحقة', icon: HiReceiptTax, color: '#7C3AED' },
  { id: 'refunds', name: 'مبالغ مستردة للعملاء', icon: HiRefresh, color: '#16A34A' },
  { id: 'delivery', name: 'مستحقات منصات التوصيل', icon: HiTruck, color: '#2563EB' }
]

// Helper function to get icon for account category
const getIconForCategory = (category) => {
  const assetTypes = ASSET_TYPES.find(t => t.id === category)
  const liabilityTypes = LIABILITY_TYPES.find(t => t.id === category)
  return assetTypes?.icon || liabilityTypes?.icon || HiCash
}

// Helper function to get color for account category
const getColorForCategory = (category) => {
  const assetTypes = ASSET_TYPES.find(t => t.id === category)
  const liabilityTypes = LIABILITY_TYPES.find(t => t.id === category)
  return assetTypes?.color || liabilityTypes?.color || '#2563EB'
}

// Helper function to transform database account to UI format
const transformAccountToUI = (account, recentTransactions = []) => {
  const category = account.account_type === 'asset' 
    ? account.asset_category 
    : account.liability_category
  
  return {
    id: account.id,
    name: account.name,
    type: category,
    accountType: account.account_type, // Preserve account_type for editing
    balance: parseFloat(account.balance || 0),
    currency: account.currency,
    icon: getIconForCategory(category),
    color: account.color || getColorForCategory(category),
    dueDate: account.due_date,
    recentTransactions: recentTransactions.map(tx => ({
      id: tx.id,
      description: tx.description,
      amount: tx.transaction_type === 'credit' ? tx.amount : -tx.amount,
      currency: tx.currency,
      exchangeRate: tx.exchange_rate,
      date: tx.transaction_date,
      type: tx.transaction_type
    }))
  }
}

export default function FinancialPage() {
  const [baseCurrency, setBaseCurrency] = useState('LYD')
  const [loading, setLoading] = useState(true)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEditAccountModal, setShowEditAccountModal] = useState(false)
  const [accountType, setAccountType] = useState('asset') // 'asset' or 'liability'
  const [openMenuId, setOpenMenuId] = useState(null) // Track which account's menu is open
  const [editingAccount, setEditingAccount] = useState(null)
  const [deletingAccount, setDeletingAccount] = useState(null)
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: '',
    currency: 'LYD',
    initialBalance: 0,
    dueDate: null,
    color: '#2563EB'
  })
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    exchangeRate: 1.0,
    description: ''
  })

  // Accounts from database
  const [assets, setAssets] = useState([])
  const [liabilities, setLiabilities] = useState([])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest(`[data-menu-id]`)) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  // Fetch accounts and settings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch settings first to get base currency
        const settingsResponse = await fetch('/api/financial/settings')
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          setBaseCurrency(settings.base_currency || 'LYD')
        }

        // Fetch assets
        const assetsResponse = await fetch('/api/financial/accounts?accountType=asset&activeOnly=true')
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json()
          
          // Fetch recent transactions for each asset
          const assetsWithTransactions = await Promise.all(
            assetsData.map(async (account) => {
              const transactionsResponse = await fetch(
                `/api/financial/transactions?accountId=${account.id}&limit=5`
              )
              const transactions = transactionsResponse.ok 
                ? await transactionsResponse.json()
                : []
              return transformAccountToUI(account, transactions)
            })
          )
          
          setAssets(assetsWithTransactions)
        }

        // Fetch liabilities
        const liabilitiesResponse = await fetch('/api/financial/accounts?accountType=liability&activeOnly=true')
        if (liabilitiesResponse.ok) {
          const liabilitiesData = await liabilitiesResponse.json()
          
          // Fetch recent transactions for each liability
          const liabilitiesWithTransactions = await Promise.all(
            liabilitiesData.map(async (account) => {
              const transactionsResponse = await fetch(
                `/api/financial/transactions?accountId=${account.id}&limit=5`
              )
              const transactions = transactionsResponse.ok 
                ? await transactionsResponse.json()
                : []
              return transformAccountToUI(account, transactions)
            })
          )
          
          setLiabilities(liabilitiesWithTransactions)
        }
      } catch (error) {
        console.error('Error fetching financial data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch accounts function (reusable)
  const fetchAccounts = async () => {
    try {
      // Fetch settings first to get base currency
      const settingsResponse = await fetch('/api/financial/settings')
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        setBaseCurrency(settings.base_currency || 'LYD')
      }

      // Fetch assets
      const assetsResponse = await fetch('/api/financial/accounts?accountType=asset&activeOnly=true')
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json()
        
        // Fetch recent transactions for each asset
        const assetsWithTransactions = await Promise.all(
          assetsData.map(async (account) => {
            const transactionsResponse = await fetch(
              `/api/financial/transactions?accountId=${account.id}&limit=5`
            )
            const transactions = transactionsResponse.ok 
              ? await transactionsResponse.json()
              : []
            return transformAccountToUI(account, transactions)
          })
        )
        
        setAssets(assetsWithTransactions)
      }

      // Fetch liabilities
      const liabilitiesResponse = await fetch('/api/financial/accounts?accountType=liability&activeOnly=true')
      if (liabilitiesResponse.ok) {
        const liabilitiesData = await liabilitiesResponse.json()
        
        // Fetch recent transactions for each liability
        const liabilitiesWithTransactions = await Promise.all(
          liabilitiesData.map(async (account) => {
            const transactionsResponse = await fetch(
              `/api/financial/transactions?accountId=${account.id}&limit=5`
            )
            const transactions = transactionsResponse.ok 
              ? await transactionsResponse.json()
              : []
            return transformAccountToUI(account, transactions)
          })
        )
        
        setLiabilities(liabilitiesWithTransactions)
      }
    } catch (error) {
      console.error('Error fetching financial data:', error)
    }
  }

  // Convert amount from one currency to base currency
  const convertToBase = (amount, fromCurrency) => {
    if (fromCurrency === baseCurrency) return amount
    const rate = EXCHANGE_RATES[fromCurrency]?.[baseCurrency] || 1
    return amount * rate
  }

  // Calculate totals in base currency
  const totalAssets = assets.reduce((sum, asset) => {
    return sum + convertToBase(asset.balance, asset.currency)
  }, 0)

  const totalLiabilities = liabilities.reduce((sum, liability) => {
    return sum + convertToBase(liability.balance, liability.currency)
  }, 0)

  const netPosition = totalAssets - totalLiabilities

  const formatCurrency = (amount, currency = baseCurrency) => {
    const currencyInfo = CURRENCIES[currency] || CURRENCIES.EUR
    return new Intl.NumberFormat('ar-LY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatCurrencySymbol = (currency) => {
    return CURRENCIES[currency]?.symbol || currency
  }

  const handleAddAccount = () => {
    setAccountType('asset')
    setNewAccount({
      name: '',
      type: '',
      currency: 'LYD',
      initialBalance: 0,
      dueDate: null,
      color: '#2563EB'
    })
    setShowAddAccountModal(true)
  }

  const handleSaveAccount = async () => {
    if (!newAccount.name || !newAccount.type) {
      alert('الرجاء ملء جميع الحقول المطلوبة')
      return
    }

    try {
      const accountData = {
        name: newAccount.name,
        account_type: accountType,
        [accountType === 'asset' ? 'asset_category' : 'liability_category']: newAccount.type,
        currency: newAccount.currency,
        balance: parseFloat(newAccount.initialBalance || 0),
        due_date: newAccount.dueDate || null,
        color: newAccount.color || (accountType === 'asset' 
          ? ASSET_TYPES.find(t => t.id === newAccount.type)?.color || '#2563EB'
          : LIABILITY_TYPES.find(t => t.id === newAccount.type)?.color || '#2563EB')
      }

      const response = await fetch('/api/financial/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create account')
      }

      const createdAccount = await response.json()
      
      // Add to appropriate list
      const transformedAccount = transformAccountToUI(createdAccount, [])
      if (accountType === 'asset') {
        setAssets([...assets, transformedAccount])
      } else {
        setLiabilities([...liabilities, transformedAccount])
      }

    setShowAddAccountModal(false)
    setNewAccount({
      name: '',
      type: '',
      currency: 'LYD',
      initialBalance: 0,
      dueDate: null,
      color: '#2563EB'
    })
      
      alert('تم إضافة الحساب بنجاح')
    } catch (error) {
      console.error('Error saving account:', error)
      alert(`حدث خطأ أثناء حفظ الحساب: ${error.message}`)
    }
  }

  const handleTransferClick = (accountId) => {
    setTransferData({
      fromAccountId: accountId,
      toAccountId: '',
      amount: '',
      exchangeRate: 1.0,
      description: ''
    })
    setShowTransferModal(true)
  }

  const handleTransfer = async () => {
    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
      alert('الرجاء ملء جميع الحقول المطلوبة')
      return
    }

    const amount = parseFloat(transferData.amount)
    if (amount <= 0) {
      alert('المبلغ يجب أن يكون أكبر من الصفر')
      return
    }

    try {
      // Get account details for currency
      const fromAcc = [...assets, ...liabilities].find(a => a.id === transferData.fromAccountId)
      const toAcc = [...assets, ...liabilities].find(a => a.id === transferData.toAccountId)
      
      const transferPayload = {
        account_id: transferData.fromAccountId,
        to_account_id: transferData.toAccountId,
        amount: amount,
        currency: fromAcc?.currency || 'LYD',
        exchange_rate: transferData.exchangeRate || 1.0,
        description: transferData.description || `تحويل من ${fromAcc?.name || ''} إلى ${toAcc?.name || ''}`,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: 'transfer'
      }

      const response = await fetch('/api/financial/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferPayload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create transfer')
      }

      // Refresh the page to get updated balances
      window.location.reload()
    setTransferData({
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      exchangeRate: 1.0,
      description: ''
    })
    } catch (error) {
      console.error('Error creating transfer:', error)
      alert(`حدث خطأ أثناء التحويل: ${error.message}`)
    }
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

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleEditAccount = (account) => {
    // Determine account type by checking which array contains it
    const isAsset = assets.some(a => a.id === account.id)
    const accountTypeValue = account.accountType || (isAsset ? 'asset' : 'liability')
    
    setEditingAccount(account)
    setAccountType(accountTypeValue)
    setNewAccount({
      name: account.name,
      type: account.type, // This is the category (cash, bank, etc.)
      currency: account.currency,
      initialBalance: account.balance,
      dueDate: account.dueDate || null,
      color: account.color || '#2563EB'
    })
    setShowEditAccountModal(true)
    setOpenMenuId(null)
  }

  const handleDeleteAccount = async (accountId, accountName) => {
    if (!confirm(`هل أنت متأكد من حذف الحساب "${accountName}" وجميع المعاملات المرتبطة به؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      return
    }

    try {
      // Delete all transactions related to this account first
      // Get all transactions where this account is involved (as account_id or related_account_id)
      const transactionsResponse = await fetch(`/api/financial/transactions?accountId=${accountId}`)
      if (transactionsResponse.ok) {
        const transactions = await transactionsResponse.json()
        // Delete each transaction
        for (const tx of transactions) {
          try {
            const deleteResponse = await fetch(`/api/financial/transactions/${tx.id}`, {
              method: 'DELETE'
            })
            if (!deleteResponse.ok) {
              console.warn(`Failed to delete transaction ${tx.id}`)
            }
          } catch (txError) {
            console.warn(`Error deleting transaction ${tx.id}:`, txError)
          }
        }
      }

      // Delete the account
      const response = await fetch(`/api/financial/accounts/${accountId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete account')
      }

      // Refresh accounts
      await fetchAccounts()
      setOpenMenuId(null)
      alert('تم حذف الحساب وجميع المعاملات المرتبطة به بنجاح')
    } catch (error) {
      console.error('Error deleting account:', error)
      alert(`حدث خطأ أثناء حذف الحساب: ${error.message}`)
    }
  }

  const handleSaveEditAccount = async () => {
    if (!editingAccount || !newAccount.name || !newAccount.type) {
      alert('الرجاء ملء جميع الحقول المطلوبة')
      return
    }

    try {
      const accountData = {
        name: newAccount.name,
        [accountType === 'asset' ? 'asset_category' : 'liability_category']: newAccount.type,
        currency: newAccount.currency,
        balance: parseFloat(newAccount.initialBalance || 0),
        due_date: newAccount.dueDate || null,
        color: newAccount.color || '#2563EB'
      }

      const response = await fetch(`/api/financial/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update account')
      }

      await fetchAccounts()
      setShowEditAccountModal(false)
      setEditingAccount(null)
      setNewAccount({
        name: '',
        type: '',
        currency: 'LYD',
        initialBalance: 0,
        dueDate: null,
        color: '#2563EB'
      })
      alert('تم تحديث الحساب بنجاح')
    } catch (error) {
      console.error('Error updating account:', error)
      alert(`حدث خطأ أثناء تحديث الحساب: ${error.message}`)
    }
  }

  return (
    <div className={styles.financialPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiCurrencyDollar className={styles.titleIcon} />
            الأصول والمديونية
          </h1>
          <p className={styles.pageSubtitle}>
            تتبع الأموال والالتزامات المالية بشكل دقيق ومفصل
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.settingsButton}
            onClick={() => setShowSettingsModal(true)}
            title="إعدادات العملة الأساسية"
          >
            <HiCog />
            العملة الأساسية: {formatCurrencySymbol(baseCurrency)}
          </button>
          <button className={styles.addButton} onClick={handleAddAccount}>
            <HiPlus />
            إضافة حساب جديد
          </button>
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
            {formatCurrency(totalAssets)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <HiTrendingDown className={styles.summaryIcon} style={{ color: '#DC2626' }} />
            <span className={styles.summaryLabel}>إجمالي المديونية</span>
          </div>
          <div className={styles.summaryValue} style={{ color: '#DC2626' }}>
            {formatCurrency(totalLiabilities)}
          </div>
        </div>

        <div className={`${styles.summaryCard} ${netPosition >= 0 ? styles.summaryCardPositive : styles.summaryCardNegative}`}>
          <div className={styles.summaryCardHeader}>
            <HiCurrencyDollar className={styles.summaryIcon} style={{ color: netPosition >= 0 ? '#16A34A' : '#DC2626' }} />
            <span className={styles.summaryLabel}>صافي المركز المالي</span>
          </div>
          <div className={styles.summaryValue} style={{ color: netPosition >= 0 ? '#16A34A' : '#DC2626' }}>
            {formatCurrency(netPosition)}
          </div>
        </div>
      </div>

      {/* Assets Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <HiTrendingUp className={styles.sectionIcon} />
            الأصول
          </h2>
          <span className={styles.sectionSubtitle}>
            أماكن وجود الأموال والموجودات المالية
          </span>
        </div>

        <div className={styles.accountsGrid}>
          {assets.map((asset) => {
            const Icon = asset.icon
            return (
              <div key={asset.id} className={styles.accountCard}>
                <div className={styles.accountHeader}>
                  <div className={styles.accountIcon} style={{ backgroundColor: `${asset.color}20`, color: asset.color }}>
                    <Icon />
                  </div>
                  <div className={styles.accountInfo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <h3 className={styles.accountName}>{asset.name}</h3>
                      <div style={{ position: 'relative' }}>
                        <button
                          className={styles.menuButton}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === asset.id ? null : asset.id)
                          }}
                        >
                          <HiDotsVertical />
                        </button>
                        {openMenuId === asset.id && (
                          <div className={styles.menuDropdown}>
                            <button
                              className={styles.menuItem}
                              onClick={() => handleEditAccount(asset)}
                            >
                              <HiPencil />
                              تعديل
                            </button>
                            <button
                              className={styles.menuItem}
                              onClick={() => handleDeleteAccount(asset.id, asset.name)}
                              style={{ color: '#DC2626' }}
                            >
                              <HiTrash />
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.accountBalance} style={{ color: asset.color }}>
                      <div className={styles.balancePrimary}>
                        {formatCurrency(asset.balance, asset.currency)}
                      </div>
                      {asset.currency !== baseCurrency && (
                        <div className={styles.balanceConverted}>
                          ≈ {formatCurrency(convertToBase(asset.balance, asset.currency))}
                        </div>
                      )}
                    </div>
                    <div className={styles.accountCurrency}>
                      {CURRENCIES[asset.currency]?.name || asset.currency}
                    </div>
                  </div>
                </div>

                <div className={styles.recentTransactions}>
                  <h4 className={styles.transactionsTitle}>آخر الحركات</h4>
                  {asset.recentTransactions.length > 0 ? (
                    <ul className={styles.transactionsList}>
                      {asset.recentTransactions.slice(0, 3).map((tx) => (
                        <li key={tx.id} className={styles.transactionItem}>
                          <div className={styles.transactionDetails}>
                            <span className={styles.transactionDescription}>{tx.description}</span>
                            <span className={styles.transactionDate}>{formatDate(tx.date)}</span>
                          </div>
                          <span className={`${styles.transactionAmount} ${tx.amount > 0 ? styles.credit : styles.debit}`}>
                            <div>{tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount), tx.currency || asset.currency)}</div>
                            {(tx.currency || asset.currency) !== baseCurrency && (
                              <div className={styles.transactionConverted}>
                                ≈ {tx.amount > 0 ? '+' : ''}{formatCurrency(convertToBase(Math.abs(tx.amount), tx.currency || asset.currency))}
                              </div>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.noTransactions}>لا توجد حركات حديثة</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button 
                    className={styles.transferButton}
                    onClick={() => handleTransferClick(asset.id)}
                  >
                    <HiArrowsExpand />
                    تحويل
                  </button>
                  <Link 
                    href={`/financial/${asset.id}`}
                    className={styles.viewDetailsButton}
                    style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    عرض التفاصيل
                    <HiArrowRight />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Liabilities Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <HiTrendingDown className={styles.sectionIcon} />
            المديونية / الالتزامات
          </h2>
          <span className={styles.sectionSubtitle}>
            المبالغ المستحقة والالتزامات المالية
          </span>
        </div>

        <div className={styles.accountsGrid}>
          {liabilities.map((liability) => {
            const Icon = liability.icon
            const daysUntilDue = getDaysUntilDue(liability.dueDate)
            return (
              <div key={liability.id} className={styles.accountCard}>
                <div className={styles.accountHeader}>
                  <div className={styles.accountIcon} style={{ backgroundColor: `${liability.color}20`, color: liability.color }}>
                    <Icon />
                  </div>
                  <div className={styles.accountInfo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                      <h3 className={styles.accountName}>{liability.name}</h3>
                      <div style={{ position: 'relative' }}>
                        <button
                          className={styles.menuButton}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === liability.id ? null : liability.id)
                          }}
                        >
                          <HiDotsVertical />
                        </button>
                        {openMenuId === liability.id && (
                          <div className={styles.menuDropdown}>
                            <button
                              className={styles.menuItem}
                              onClick={() => handleEditAccount(liability)}
                            >
                              <HiPencil />
                              تعديل
                            </button>
                            <button
                              className={styles.menuItem}
                              onClick={() => handleDeleteAccount(liability.id, liability.name)}
                              style={{ color: '#DC2626' }}
                            >
                              <HiTrash />
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.accountBalance} style={{ color: liability.color }}>
                      <div className={styles.balancePrimary}>
                        {formatCurrency(liability.balance, liability.currency)}
                      </div>
                      {liability.currency !== baseCurrency && (
                        <div className={styles.balanceConverted}>
                          ≈ {formatCurrency(convertToBase(liability.balance, liability.currency))}
                        </div>
                      )}
                    </div>
                    <div className={styles.accountCurrency}>
                      {CURRENCIES[liability.currency]?.name || liability.currency}
                    </div>
                    {liability.dueDate && (
                      <div className={styles.dueDateInfo}>
                        <HiClock className={styles.dueDateIcon} />
                        <span className={styles.dueDateLabel}>تاريخ الاستحقاق:</span>
                        <span className={`${styles.dueDate} ${daysUntilDue !== null && daysUntilDue < 7 ? styles.dueDateUrgent : ''}`}>
                          {formatDate(liability.dueDate)}
                          {daysUntilDue !== null && (
                            <span className={styles.daysUntilDue}>
                              ({daysUntilDue > 0 ? `بعد ${daysUntilDue} يوم` : daysUntilDue === 0 ? 'اليوم' : `متأخر ${Math.abs(daysUntilDue)} يوم`})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.recentTransactions}>
                  <h4 className={styles.transactionsTitle}>آخر الحركات</h4>
                  {liability.recentTransactions.length > 0 ? (
                    <ul className={styles.transactionsList}>
                      {liability.recentTransactions.slice(0, 3).map((tx) => (
                        <li key={tx.id} className={styles.transactionItem}>
                          <div className={styles.transactionDetails}>
                            <span className={styles.transactionDescription}>{tx.description}</span>
                            <span className={styles.transactionDate}>{formatDate(tx.date)}</span>
                          </div>
                          <span className={`${styles.transactionAmount} ${styles.debit}`}>
                            <div>{formatCurrency(Math.abs(tx.amount), tx.currency || liability.currency)}</div>
                            {(tx.currency || liability.currency) !== baseCurrency && (
                              <div className={styles.transactionConverted}>
                                ≈ {formatCurrency(convertToBase(Math.abs(tx.amount), tx.currency || liability.currency))}
                              </div>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.noTransactions}>لا توجد حركات حديثة</p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button 
                    className={styles.transferButton}
                    onClick={() => handleTransferClick(liability.id)}
                  >
                    <HiArrowLeft />
                    <HiArrowRight />
                    تحويل
                  </button>
                  <Link 
                    href={`/financial/${liability.id}`}
                    className={styles.viewDetailsButton}
                    style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    عرض التفاصيل
                    <HiArrowRight />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddAccountModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                إضافة {accountType === 'asset' ? 'أصل' : 'التزام'} جديد
              </h2>
              <button className={styles.closeButton} onClick={() => setShowAddAccountModal(false)}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.required}>النوع</label>
                <select
                  value={accountType}
                  onChange={(e) => {
                    setAccountType(e.target.value)
                    setNewAccount({ ...newAccount, type: '', color: '#2563EB' })
                  }}
                  className={styles.modalSelect}
                >
                  <option value="asset">أصل</option>
                  <option value="liability">التزام</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>نوع الحساب</label>
                <select
                  value={newAccount.type}
                  onChange={(e) => {
                    const selectedType = e.target.value
                    const typeData = (accountType === 'asset' ? ASSET_TYPES : LIABILITY_TYPES).find(t => t.id === selectedType)
                    setNewAccount({ 
                      ...newAccount, 
                      type: selectedType,
                      color: typeData?.color || '#2563EB'
                    })
                  }}
                  className={styles.modalSelect}
                >
                  <option value="">اختر النوع</option>
                  {(accountType === 'asset' ? ASSET_TYPES : LIABILITY_TYPES).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>اسم الحساب</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className={styles.modalInput}
                  placeholder="مثال: الصندوق الرئيسي"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>العملة</label>
                <select
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                  className={styles.modalSelect}
                >
                  {Object.values(CURRENCIES).map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.code}) {curr.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>الرصيد الابتدائي</label>
                <input
                  type="number"
                  value={newAccount.initialBalance}
                  onChange={(e) => setNewAccount({ ...newAccount, initialBalance: parseFloat(e.target.value) || 0 })}
                  className={styles.modalInput}
                  placeholder="0"
                  step="0.01"
                />
              </div>

              <div className={styles.formGroup}>
                <label>اللون</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newAccount.color}
                    onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                    style={{
                      width: '60px',
                      height: '40px',
                      cursor: 'pointer',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={newAccount.color}
                    onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                    className={styles.modalInput}
                    placeholder="#2563EB"
                    style={{ flex: 1 }}
                  />
                </div>
                <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  اختر لوناً للحساب (سيتم استخدام اللون الافتراضي إذا تركت فارغاً)
                </small>
              </div>

              {accountType === 'liability' && (
                <div className={styles.formGroup}>
                  <label>تاريخ الاستحقاق (اختياري)</label>
                  <input
                    type="date"
                    value={newAccount.dueDate || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, dueDate: e.target.value || null })}
                    className={styles.modalInput}
                  />
                </div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.modalCancelButton} onClick={() => setShowAddAccountModal(false)}>
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={handleSaveAccount}
                  disabled={!newAccount.name || !newAccount.type}
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditAccountModal && editingAccount && (
        <div className={styles.modalOverlay} onClick={() => setShowEditAccountModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                تعديل {accountType === 'asset' ? 'أصل' : 'التزام'}
              </h2>
              <button className={styles.closeButton} onClick={() => setShowEditAccountModal(false)}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.required}>النوع</label>
                <select
                  value={accountType}
                  onChange={(e) => {
                    setAccountType(e.target.value)
                    setNewAccount({ ...newAccount, type: '', color: '#2563EB' })
                  }}
                  className={styles.modalSelect}
                  disabled
                >
                  <option value="asset">أصل</option>
                  <option value="liability">التزام</option>
                </select>
                <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  لا يمكن تغيير نوع الحساب بعد الإنشاء
                </small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>نوع الحساب</label>
                <select
                  value={newAccount.type}
                  onChange={(e) => {
                    const selectedType = e.target.value
                    const typeData = (accountType === 'asset' ? ASSET_TYPES : LIABILITY_TYPES).find(t => t.id === selectedType)
                    setNewAccount({ 
                      ...newAccount, 
                      type: selectedType,
                      color: typeData?.color || '#2563EB'
                    })
                  }}
                  className={styles.modalSelect}
                >
                  <option value="">اختر النوع</option>
                  {(accountType === 'asset' ? ASSET_TYPES : LIABILITY_TYPES).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>اسم الحساب</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className={styles.modalInput}
                  placeholder="مثال: الصندوق الرئيسي"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>العملة</label>
                <select
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                  className={styles.modalSelect}
                >
                  {Object.values(CURRENCIES).map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.code}) {curr.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>الرصيد الابتدائي</label>
                <input
                  type="number"
                  value={newAccount.initialBalance}
                  onChange={(e) => setNewAccount({ ...newAccount, initialBalance: parseFloat(e.target.value) || 0 })}
                  className={styles.modalInput}
                  placeholder="0"
                  step="0.01"
                />
                <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  تحذير: تغيير الرصيد يدوياً قد يؤثر على دقة السجلات المالية
                </small>
              </div>

              <div className={styles.formGroup}>
                <label>اللون</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newAccount.color}
                    onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                    style={{
                      width: '60px',
                      height: '40px',
                      cursor: 'pointer',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      padding: '2px'
                    }}
                  />
                  <input
                    type="text"
                    value={newAccount.color}
                    onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                    className={styles.modalInput}
                    placeholder="#2563EB"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {accountType === 'liability' && (
                <div className={styles.formGroup}>
                  <label>تاريخ الاستحقاق (اختياري)</label>
                  <input
                    type="date"
                    value={newAccount.dueDate || ''}
                    onChange={(e) => setNewAccount({ ...newAccount, dueDate: e.target.value || null })}
                    className={styles.modalInput}
                  />
                </div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.modalCancelButton} onClick={() => setShowEditAccountModal(false)}>
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={handleSaveEditAccount}
                  disabled={!newAccount.name || !newAccount.type}
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>إعدادات العملة الأساسية</h2>
              <button className={styles.closeButton} onClick={() => setShowSettingsModal(false)}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.required}>العملة الأساسية للتقارير</label>
                <p className={styles.helpText}>
                  جميع المبالغ سيتم تحويلها إلى هذه العملة في التقارير
                </p>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className={styles.modalSelect}
                >
                  {Object.values(CURRENCIES).map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.code}) {curr.symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalCancelButton} onClick={() => setShowSettingsModal(false)}>
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={async () => {
                    try {
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

                    setShowSettingsModal(false)
                      alert('تم حفظ الإعدادات بنجاح')
                    } catch (error) {
                      console.error('Error saving settings:', error)
                      alert(`حدث خطأ أثناء حفظ الإعدادات: ${error.message}`)
                    }
                  }}
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTransferModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>تحويل أموال</h2>
              <button className={styles.closeButton} onClick={() => setShowTransferModal(false)}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label className={styles.required}>من حساب *</label>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => {
                    const fromAcc = [...assets, ...liabilities].find(a => a.id === e.target.value)
                    setTransferData({ 
                      ...transferData, 
                      fromAccountId: e.target.value,
                      exchangeRate: 1.0
                    })
                  }}
                  className={styles.modalSelect}
                  disabled
                >
                  {transferData.fromAccountId && (() => {
                    const acc = [...assets, ...liabilities].find(a => a.id === transferData.fromAccountId)
                    return acc ? <option value={acc.id}>{acc.name} ({acc.currency})</option> : null
                  })()}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>إلى حساب *</label>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => {
                    const toAcc = [...assets, ...liabilities].find(a => a.id === e.target.value)
                    const fromAcc = [...assets, ...liabilities].find(a => a.id === transferData.fromAccountId)
                    setTransferData({ 
                      ...transferData, 
                      toAccountId: e.target.value,
                      exchangeRate: (fromAcc && toAcc && fromAcc.currency !== toAcc.currency) 
                        ? EXCHANGE_RATES[fromAcc.currency]?.[toAcc.currency] || 1.0
                        : 1.0
                    })
                  }}
                  className={styles.modalSelect}
                >
                  <option value="">اختر الحساب الوجهة</option>
                  {[...assets, ...liabilities]
                    .filter(acc => acc.id !== transferData.fromAccountId)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency}) - الرصيد: {formatCurrency(acc.balance, acc.currency)}
                      </option>
                    ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.required}>المبلغ *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  className={styles.modalInput}
                  placeholder="0.00"
                />
                {transferData.fromAccountId && (() => {
                  const fromAcc = [...assets, ...liabilities].find(a => a.id === transferData.fromAccountId)
                  return fromAcc ? (
                    <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                      الرصيد المتاح: {formatCurrency(fromAcc.balance, fromAcc.currency)}
                    </small>
                  ) : null
                })()}
              </div>

              {transferData.fromAccountId && transferData.toAccountId && (() => {
                const fromAcc = [...assets, ...liabilities].find(a => a.id === transferData.fromAccountId)
                const toAcc = [...assets, ...liabilities].find(a => a.id === transferData.toAccountId)
                const needsExchangeRate = fromAcc && toAcc && fromAcc.currency !== toAcc.currency
                
                return needsExchangeRate ? (
                  <div className={styles.formGroup}>
                    <label className={styles.required}>سعر الصرف *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={transferData.exchangeRate}
                      onChange={(e) => setTransferData({ ...transferData, exchangeRate: parseFloat(e.target.value) || 1.0 })}
                      className={styles.modalInput}
                      placeholder="1.0000"
                    />
                    <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                      1 {fromAcc.currency} = {transferData.exchangeRate} {toAcc.currency}
                      {transferData.amount && (
                        <span style={{ display: 'block', marginTop: '0.25rem', fontWeight: 'bold' }}>
                          المبلغ المحول: {formatCurrency(parseFloat(transferData.amount || 0) * transferData.exchangeRate, toAcc.currency)}
                        </span>
                      )}
                    </small>
                  </div>
                ) : null
              })()}

              <div className={styles.formGroup}>
                <label>الوصف (اختياري)</label>
                <input
                  type="text"
                  value={transferData.description}
                  onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                  className={styles.modalInput}
                  placeholder="مثال: تحويل للبنك الرئيسي"
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalCancelButton} onClick={() => setShowTransferModal(false)}>
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={handleTransfer}
                  disabled={!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount}
                >
                  تنفيذ التحويل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

