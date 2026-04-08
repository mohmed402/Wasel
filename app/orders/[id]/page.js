'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import styles from './order-detail.module.css'
import {
  HiUser,
  HiPhone,
  HiCalendar,
  HiCurrencyDollar,
  HiTruck,
  HiExclamation,
  HiDocumentText,
  HiCheckCircle,
  HiXCircle,
  HiPencil,
  HiArrowRight,
  HiCog,
  HiX,
  HiPlus,
  HiTrendingUp,
  HiTrendingDown,
  HiLink,
  HiClipboard
} from 'react-icons/hi'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showCloseOrderModal, setShowCloseOrderModal] = useState(false)
  const [showPurchaseAccountModal, setShowPurchaseAccountModal] = useState(false)
  const [purchasingItem, setPurchasingItem] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [purchaseFormData, setPurchaseFormData] = useState({
    accountId: '',
    price: '',
    currency: 'LYD',
    exchangeRate: 1.0
  })
  const [closeOrderData, setCloseOrderData] = useState({
    expenses: [],
    receivedAmount: 0,
    selectedAccounts: [],
    exchangeRate: 1.0
  })
  const [sheinSummaryCopied, setSheinSummaryCopied] = useState(false)

  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/orders/${orderId}`)
      
      if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الطلب')
      }
      
      const data = await response.json()
      
      // Transform API data to match component format
      const transformedOrder = {
        id: data.internal_ref || data.id,
        orderId: data.id,
        customerName: data.customer?.name || 'غير معروف',
        phone: data.customer?.phone || '-',
        email: data.customer?.email || '-',
        address: data.customer?.address || '-',
        orderDate: data.order_date || '-',
        status: data.status || 'pending',
        totalAmount: parseFloat(data.total_amount) || 0,
        depositAmount: parseFloat(data.payment?.deposit_amount) || 0,
        depositStatus: data.payment?.payment_status || 'unpaid',
        remainingBalance: parseFloat(data.payment?.remaining_balance) || 0,
        shippingStage: data.shipping?.shipping_stage || 'not_started',
        deliveryDate: data.expected_delivery_date || null,
        basketLink: data.basket_link && String(data.basket_link).trim() ? String(data.basket_link).trim() : null,
        items: (data.items || []).map(item => ({
          id: item.id,
          name: item.name || 'عنصر غير معروف',
          quantity: item.quantity || 1,
          price: parseFloat(item.selling_price) || parseFloat(item.unit_price) || 0,
          status: item.status || 'pending',
          // Use existing purchase data if available, otherwise use unit_price, currency, exchange_rate
          purchasePrice: item.purchase_price ? parseFloat(item.purchase_price) : (item.unit_price ? parseFloat(item.unit_price) : null),
          purchaseCurrency: item.purchase_currency || item.currency || null,
          purchaseExchangeRate: item.purchase_exchange_rate ? parseFloat(item.purchase_exchange_rate) : (item.exchange_rate ? parseFloat(item.exchange_rate) : null),
          purchaseAccountId: item.purchase_account_id || null,
          // Keep original data for reference
          unitPrice: item.unit_price ? parseFloat(item.unit_price) : null,
          currency: item.currency || null,
          exchangeRate: item.exchange_rate ? parseFloat(item.exchange_rate) : null,
          productId: item.product_id != null ? String(item.product_id) : '',
          variant: item.variant || '',
          sku: item.sku || '',
          productLink: item.product_link && String(item.product_link).trim() ? String(item.product_link).trim() : '',
          images: Array.isArray(item.images) ? item.images : [],
          source: item.source || ''
        })),
        payments: data.payment ? [
          {
            id: data.payment.id,
            type: 'deposit',
            amount: parseFloat(data.payment.deposit_amount) || 0,
            date: data.payment.deposit_paid_date || null,
            status: data.payment.deposit_paid ? 'paid' : 'pending'
          },
          ...(parseFloat(data.payment.remaining_balance) > 0 ? [{
            id: `balance-${data.payment.id}`,
            type: 'balance',
            amount: parseFloat(data.payment.remaining_balance) || 0,
            date: null,
            status: 'pending'
          }] : [])
        ] : [],
        shippingHistory: [
          { stage: 'تم الطلب', date: data.order_date, status: 'completed' },
          { 
            stage: 'الشحن الدولي', 
            date: data.shipping?.international_shipped_date || null, 
            status: (data.shipping?.shipping_stage === 'international_shipping' || ['arrived_libya', 'local_delivery', 'delivered'].includes(data.shipping?.shipping_stage)) 
              ? 'completed' 
              : data.shipping?.shipping_stage === 'international_shipping' ? 'in_progress' : 'pending' 
          },
          { 
            stage: 'وصلت إلى ليبيا', 
            date: data.shipping?.arrived_libya_date || null, 
            status: (['arrived_libya', 'local_delivery', 'delivered'].includes(data.shipping?.shipping_stage)) 
              ? 'completed' 
              : data.shipping?.shipping_stage === 'arrived_libya' ? 'in_progress' : 'pending' 
          },
          { 
            stage: 'التوصيل المحلي', 
            date: data.shipping?.local_delivery_started_date || data.shipping?.delivered_date || null, 
            status: (['local_delivery', 'delivered'].includes(data.shipping?.shipping_stage)) 
              ? 'completed' 
              : data.shipping?.shipping_stage === 'local_delivery' ? 'in_progress' : 'pending' 
          }
        ],
        issues: (data.items || []).filter(item => item.status === 'missing' || item.status === 'damaged').map(item => ({
          id: item.id,
          type: item.status === 'missing' ? 'missing' : 'damaged',
          item: item.name,
          description: item.status === 'missing' ? 'العنصر غير موجود في الشحنة' : 'العنصر تالف',
          status: 'open',
          date: data.order_date
        })),
        notes: data.notes ? (typeof data.notes === 'string' ? [{ id: 1, text: data.notes, author: 'النظام', date: data.order_date }] : []) : []
      }
      
      setOrder(transformedOrder)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError(err.message || 'حدث خطأ أثناء تحميل بيانات الطلب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrder()
      fetchAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/financial/accounts?accountType=asset&activeOnly=true')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (err) {
      console.error('Error fetching accounts:', err)
    }
  }

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'معلق', class: styles.badgePending },
      processing: { label: 'قيد المعالجة', class: styles.badgeOrdered },
      shipping: { label: 'قيد الشحن', class: styles.badgeShipping },
      delivered: { label: 'تم التسليم', class: styles.badgeDelivered },
      cancelled: { label: 'ملغي', class: styles.badgeProblem }
    }
    const config = configs[status] || { label: status, class: styles.badgeDefault }
    return <span className={`${styles.badge} ${config.class}`}>{config.label}</span>
  }

  const updateOrderStatus = async (newStatus) => {
    try {
      setUpdatingStatus(true)
      const updateData = { status: newStatus }
      
      // If status is delivered, also update shipping stage
      if (newStatus === 'delivered') {
        const today = new Date().toISOString().split('T')[0]
        updateData.shipping = {
          shipping_stage: 'delivered',
          delivered_date: today
        }
      }
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update order status')
      }

      // Refresh order data
      await fetchOrder()
      alert('تم تحديث حالة الطلب بنجاح')
    } catch (err) {
      console.error('Error updating order status:', err)
      alert(`حدث خطأ أثناء تحديث حالة الطلب: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const updateShippingStage = async (newStage, additionalData = {}) => {
    try {
      setUpdatingStatus(true)
      const updateData = {
        shipping: {
          shipping_stage: newStage,
          ...additionalData
        }
      }

      // If shipping stage is delivered, also update order status
      if (newStage === 'delivered') {
        updateData.status = 'delivered'
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update shipping stage')
      }

      // Refresh order data
      await fetchOrder()
      alert('تم تحديث مرحلة الشحن بنجاح')
    } catch (err) {
      console.error('Error updating shipping stage:', err)
      alert(`حدث خطأ أثناء تحديث مرحلة الشحن: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const updateItemStatus = async (itemId, newStatus, purchaseAccountId = null, purchasePrice = null, purchaseCurrency = null, exchangeRate = 1.0) => {
    try {
      setUpdatingStatus(true)
      const updateData = { status: newStatus }
      
      // If status is purchased, include account and purchase info
      if (newStatus === 'purchased' && purchaseAccountId) {
        updateData.purchase_account_id = purchaseAccountId
        updateData.purchase_price = purchasePrice
        updateData.purchase_currency = purchaseCurrency
        updateData.purchase_exchange_rate = exchangeRate
      }

      const response = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update item status')
      }

      // Refresh order data
      await fetchOrder()
      setShowPurchaseAccountModal(false)
      setPurchasingItem(null)
    } catch (err) {
      console.error('Error updating item status:', err)
      alert(`حدث خطأ أثناء تحديث حالة العنصر: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const copySheinSummary = async () => {
    if (!order?.items?.length) return
    const lines = []
    lines.push(`المرجع: ${order.id}`)
    if (order.basketLink) lines.push(`رابط Shein: ${order.basketLink}`)
    lines.push('')
    order.items.forEach((it, i) => {
      lines.push(`${i + 1}. ${it.name}`)
      lines.push(`   الكمية: ${it.quantity}`)
      if (it.variant) lines.push(`   المتغير: ${it.variant}`)
      if (it.productId) lines.push(`   معرف المنتج: ${it.productId}`)
      if (it.sku) lines.push(`   SKU: ${it.sku}`)
      if (it.productLink) lines.push(`   الرابط: ${it.productLink}`)
      lines.push('')
    })
    const text = lines.join('\n').trim()
    try {
      await navigator.clipboard.writeText(text)
      setSheinSummaryCopied(true)
      setTimeout(() => setSheinSummaryCopied(false), 2500)
    } catch {
      alert(text)
    }
  }

  const handleItemStatusChange = async (itemId, newStatus, item) => {
    // If changing to purchased, show account selection modal
    if (newStatus === 'purchased') {
      setPurchasingItem({ id: itemId, ...item })
      // Pre-fill form with existing data
      setPurchaseFormData({
        accountId: item.purchaseAccountId || '',
        price: (item.unitPrice || item.purchasePrice || '').toString(),
        currency: item.currency || item.purchaseCurrency || 'LYD',
        exchangeRate: (item.exchangeRate || item.purchaseExchangeRate || 1.0).toString()
      })
      setShowPurchaseAccountModal(true)
    } else {
      await updateItemStatus(itemId, newStatus)
    }
  }

  const handleCloseOrder = async () => {
    try {
      setUpdatingStatus(true)
      
      // Calculate total expenses
      const totalExpenses = closeOrderData.expenses.reduce((sum, exp) => {
        return sum + (parseFloat(exp.amount) || 0)
      }, 0)

      // Calculate total purchase costs from items
      const totalPurchaseCosts = order.items.reduce((sum, item) => {
        if (item.purchasePrice && item.purchaseCurrency) {
          // Convert to LYD if needed
          const rate = item.purchaseExchangeRate || 1.0
          return sum + (parseFloat(item.purchasePrice) * parseFloat(item.quantity) * rate)
        }
        return sum
      }, 0)

      const totalPaid = totalExpenses + totalPurchaseCosts
      const receivedAmount = parseFloat(closeOrderData.receivedAmount) || 0
      const profit = receivedAmount - totalPaid

      // Create financial transactions for each selected account
      const transactions = await Promise.all(
        closeOrderData.selectedAccounts.map(async (accountData) => {
          const amount = parseFloat(accountData.amount) || 0
          if (amount <= 0) return null

          // Get account currency if not specified
          const account = accounts.find(acc => acc.id === accountData.accountId)
          const accountCurrency = accountData.currency || account?.currency || 'LYD'
          const exchangeRate = accountData.exchangeRate || 1.0

          const response = await fetch('/api/financial/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account_id: accountData.accountId,
              transaction_type: 'credit',
              amount: amount,
              currency: accountCurrency,
              exchange_rate: exchangeRate,
              description: `إغلاق الطلب #${order.id}${accountData.description ? ' - ' + accountData.description : ''}`,
              reference_type: 'order',
              reference_id: order.orderId,
              transaction_date: new Date().toISOString().split('T')[0]
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to create transaction')
          }

          return await response.json()
        })
      )

      // Update order status to closed and payment status to paid
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'closed',
          closed_at: new Date().toISOString(),
          closing_data: {
            total_expenses: totalExpenses,
            total_purchase_costs: totalPurchaseCosts,
            total_paid: totalPaid,
            received_amount: receivedAmount,
            profit: profit,
            exchange_rate_profit: closeOrderData.exchangeRateProfit || 0,
            accounts: closeOrderData.selectedAccounts
          },
          payment: {
            payment_status: 'paid',
            remaining_balance: 0,
            deposit_paid: true,
            deposit_amount: receivedAmount,
            deposit_paid_date: new Date().toISOString().split('T')[0]
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to close order')
      }

      await fetchOrder()
      setShowCloseOrderModal(false)
      setCloseOrderData({
        expenses: [],
        receivedAmount: 0,
        selectedAccounts: [],
        exchangeRate: 1.0
      })
      alert('تم إغلاق الطلب بنجاح')
    } catch (err) {
      console.error('Error closing order:', err)
      alert(`حدث خطأ أثناء إغلاق الطلب: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.orderDetail}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
          جاري تحميل بيانات الطلب...
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={styles.orderDetail}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>حدث خطأ</p>
          <p>{error || 'لم يتم العثور على الطلب'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.orderDetail}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>تفاصيل الطلب #{order.id}</h1>
          <p className={styles.subtitle}>تاريخ الطلب: {order.orderDate}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.editButton}>
            <HiPencil />
            تعديل الطلب
          </button>
          {order.status === 'delivered' && (
            <button 
              className={styles.closeOrderButton}
              onClick={() => {
                // Calculate initial expenses and purchase costs
                const totalPurchaseCosts = order.items.reduce((sum, item) => {
                  if (item.purchasePrice && item.purchaseCurrency) {
                    const rate = item.purchaseExchangeRate || 1.0
                    return sum + (parseFloat(item.purchasePrice) * parseFloat(item.quantity) * rate)
                  }
                  return sum
                }, 0)
                setCloseOrderData({
                  ...closeOrderData,
                  receivedAmount: order.totalAmount
                })
                setShowCloseOrderModal(true)
              }}
            >
              إنهاء الطلب
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <select
              value={order.status}
              onChange={(e) => updateOrderStatus(e.target.value)}
              disabled={updatingStatus}
              className={styles.statusSelect}
            >
              <option value="pending">معلق</option>
              <option value="processing">قيد المعالجة</option>
              <option value="shipping">قيد الشحن</option>
              <option value="delivered">تم التسليم</option>
              <option value="cancelled">ملغي</option>
            </select>
            {getStatusBadge(order.status)}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Customer Info */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiUser />
            معلومات العميل
          </h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>الاسم:</span>
              <span className={styles.infoValue}>{order.customerName}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <HiPhone />
                الهاتف:
              </span>
              <span className={styles.infoValue}>{order.phone}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>البريد الإلكتروني:</span>
              <span className={styles.infoValue}>{order.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>العنوان:</span>
              <span className={styles.infoValue}>{order.address}</span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiCurrencyDollar />
            ملخص الطلب
          </h2>
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>المبلغ الإجمالي:</span>
              <span className={styles.summaryValue}>{order.totalAmount} د.ل</span>
            </div>
            <div className={styles.summaryRow}>
              <span>الدفعة:</span>
              <span className={styles.summaryValue}>
                {order.depositAmount} د.ل
                {order.depositStatus === 'paid' ? (
                  <HiCheckCircle className={styles.checkIcon} />
                ) : (
                  <HiXCircle className={styles.xIcon} />
                )}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>الرصيد المتبقي:</span>
              <span className={styles.summaryValue}>{order.remainingBalance} د.ل</span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className={styles.card}>
          <h2
            className={styles.cardTitle}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>عناصر الطلب</span>
            {order.items && order.items.length > 0 ? (
              <button
                type="button"
                className={styles.copySummaryBtn}
                onClick={copySheinSummary}
              >
                <HiClipboard aria-hidden />
                {sheinSummaryCopied ? 'تم النسخ' : 'نسخ ملخص السلة'}
              </button>
            ) : null}
          </h2>
          {order.basketLink ? (
            <div className={styles.basketLinkBox}>
              <span className={styles.basketLinkLabel}>
                <HiLink aria-hidden style={{ verticalAlign: 'middle', marginInlineEnd: '0.35rem' }} />
                رابط مشاركة Shein الأصلي:
              </span>
              <a
                href={order.basketLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.basketLinkAnchor}
              >
                {order.basketLink}
              </a>
            </div>
          ) : null}
          <div className={styles.itemsList}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemDetails}>
                    الكمية: {item.quantity} × {item.price} د.ل
                  </span>
                  {(item.variant || item.productId || item.sku || item.source) ? (
                    <span className={styles.itemMeta}>
                      {item.source ? <span>المصدر: {item.source}</span> : null}
                      {item.variant ? <span>المتغير: {item.variant}</span> : null}
                      {item.productId ? <span>معرف المنتج: {item.productId}</span> : null}
                      {item.sku ? <span>SKU: {item.sku}</span> : null}
                    </span>
                  ) : null}
                  {item.productLink ? (
                    <a
                      href={item.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.itemProductLink}
                    >
                      فتح رابط المنتج
                    </a>
                  ) : null}
                </div>
                <div className={styles.itemStatus} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <select
                    value={item.status || 'pending'}
                    onChange={(e) => handleItemStatusChange(item.id, e.target.value, item)}
                    disabled={updatingStatus}
                    className={styles.statusSelect}
                    style={{ minWidth: '150px', fontSize: '0.9rem' }}
                  >
                    <option value="pending">قيد الانتظار</option>
                    <option value="purchased">تم الشراء</option>
                    <option value="received">تم الاستلام</option>
                    <option value="missing">مفقود</option>
                    <option value="damaged">تالف</option>
                  </select>
                  {item.status === 'purchased' ? (
                    <span className={styles.statusReceived}>🛒</span>
                  ) : item.status === 'received' ? (
                    <span className={styles.statusReceived}>✓</span>
                  ) : item.status === 'missing' ? (
                    <span className={styles.statusMissing}>✗</span>
                    ) : item.status === 'damaged' ? (
                      <span className={styles.statusDamaged}>⚠</span>
                  ) : (
                      <span className={styles.statusPending}>⏳</span>
                  )}
                </div>
              </div>
              ))
            ) : (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '1rem' }}>لا توجد عناصر في هذا الطلب</p>
            )}
          </div>
        </div>

        {/* Shipping Stages */}
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #E5E7EB' }}>
            <h2 className={styles.cardTitle} style={{ margin: 0 }}>
              <HiTruck />
              مراحل الشحن
            </h2>
            <select
              value={order.shippingStage || 'not_started'}
              onChange={(e) => {
                const newStage = e.target.value
                const today = new Date().toISOString().split('T')[0]
                let additionalData = {}
                
                // Set dates based on stage
                if (newStage === 'international_shipping') {
                  additionalData.international_shipped_date = today
                } else if (newStage === 'arrived_libya') {
                  additionalData.arrived_libya_date = today
                } else if (newStage === 'local_delivery') {
                  additionalData.local_delivery_started_date = today
                } else if (newStage === 'delivered') {
                  additionalData.delivered_date = today
                }
                
                updateShippingStage(newStage, additionalData)
              }}
              disabled={updatingStatus}
              className={styles.statusSelect}
              style={{ minWidth: '200px' }}
            >
              <option value="not_started">لم يبدأ</option>
              <option value="international_shipping">الشحن الدولي</option>
              <option value="arrived_libya">وصلت إلى ليبيا</option>
              <option value="local_delivery">التوصيل المحلي</option>
              <option value="delivered">تم التسليم</option>
            </select>
          </div>
          <div className={styles.timeline}>
            {order.shippingHistory && order.shippingHistory.length > 0 ? (
              order.shippingHistory.map((stage, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={`${styles.timelineDot} ${stage.status === 'completed' ? styles.completed : stage.status === 'in_progress' ? styles.inProgress : styles.pending}`}>
                    {stage.status === 'completed' && <HiCheckCircle />}
                    {stage.status === 'in_progress' && <HiArrowRight />}
                    {stage.status === 'pending' && <HiXCircle />}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineStage}>{stage.stage}</div>
                    <div className={styles.timelineDate}>
                      {stage.date || 'لم يتم بعد'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '1rem' }}>لا توجد معلومات شحن متاحة</p>
            )}
          </div>
        </div>

        {/* Issues */}
        {order.issues && order.issues.length > 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <HiExclamation />
              المشاكل
            </h2>
            <div className={styles.issuesList}>
              {order.issues.map((issue) => (
                <div key={issue.id} className={styles.issue}>
                  <div className={styles.issueHeader}>
                    <span className={styles.issueType}>{issue.type === 'missing' ? 'عنصر مفقود' : issue.type === 'damaged' ? 'عنصر تالف' : issue.type}</span>
                    <span className={styles.issueStatus}>{issue.status === 'open' ? 'مفتوح' : 'مغلق'}</span>
                  </div>
                  <div className={styles.issueItem}>العنصر: {issue.item}</div>
                  <div className={styles.issueDescription}>{issue.description}</div>
                  <div className={styles.issueDate}>تاريخ: {issue.date}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiDocumentText />
            الملاحظات
          </h2>
          <div className={styles.notesList}>
            {order.notes && order.notes.length > 0 ? (
              order.notes.map((note) => (
                <div key={note.id} className={styles.note}>
                  <div className={styles.noteText}>{note.text}</div>
                  <div className={styles.noteMeta}>
                    <span>{note.author}</span>
                    <span>{note.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#6B7280', textAlign: 'center', padding: '1rem' }}>لا توجد ملاحظات</p>
            )}
          </div>
          <button className={styles.addNoteButton}>إضافة ملاحظة</button>
        </div>
      </div>

      {/* Close Order Modal */}
      {showCloseOrderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCloseOrderModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>إنهاء الطلب</h2>
              <button className={styles.closeButton} onClick={() => setShowCloseOrderModal(false)}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalContent}>
              {/* Total Purchase Costs */}
              <div className={styles.summarySection}>
                <h3>التكاليف الإجمالية</h3>
                <div className={styles.summaryRow}>
                  <span>تكاليف الشراء:</span>
                  <span className={styles.summaryValue}>
                    {order.items.reduce((sum, item) => {
                      if (item.purchasePrice && item.purchaseCurrency) {
                        const rate = item.purchaseExchangeRate || 1.0
                        return sum + (parseFloat(item.purchasePrice) * parseFloat(item.quantity) * rate)
                      }
                      return sum
                    }, 0).toFixed(2)} د.ل
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span>المصروفات:</span>
                  <span className={styles.summaryValue}>
                    {closeOrderData.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0).toFixed(2)} د.ل
                  </span>
                </div>
                <div className={styles.summaryRow} style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <span>المجموع المدفوع:</span>
                  <span className={styles.summaryValue}>
                    {(order.items.reduce((sum, item) => {
                      if (item.purchasePrice && item.purchaseCurrency) {
                        const rate = item.purchaseExchangeRate || 1.0
                        return sum + (parseFloat(item.purchasePrice) * parseFloat(item.quantity) * rate)
                      }
                      return sum
                    }, 0) + closeOrderData.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)).toFixed(2)} د.ل
                  </span>
                </div>
              </div>

              {/* Expenses */}
              <div className={styles.formSection}>
                <h3>المصروفات</h3>
                {closeOrderData.expenses.map((exp, idx) => (
                  <div key={idx} className={styles.expenseRow}>
                    <input
                      type="text"
                      value={exp.name}
                      onChange={(e) => {
                        const newExpenses = [...closeOrderData.expenses]
                        newExpenses[idx].name = e.target.value
                        setCloseOrderData({ ...closeOrderData, expenses: newExpenses })
                      }}
                      placeholder="اسم المصروف"
                      className={styles.modalInput}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={exp.amount}
                      onChange={(e) => {
                        const newExpenses = [...closeOrderData.expenses]
                        newExpenses[idx].amount = e.target.value
                        setCloseOrderData({ ...closeOrderData, expenses: newExpenses })
                      }}
                      placeholder="المبلغ"
                      className={styles.modalInput}
                    />
                    <button
                      onClick={() => {
                        const newExpenses = closeOrderData.expenses.filter((_, i) => i !== idx)
                        setCloseOrderData({ ...closeOrderData, expenses: newExpenses })
                      }}
                      className={styles.removeButton}
                    >
                      <HiX />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setCloseOrderData({
                      ...closeOrderData,
                      expenses: [...closeOrderData.expenses, { name: '', amount: '' }]
                    })
                  }}
                  className={styles.addButton}
                >
                  <HiPlus /> إضافة مصروف
                </button>
              </div>

              {/* Received Amount */}
              <div className={styles.formSection}>
                <h3>المبلغ المستلم من العميل</h3>
                <input
                  type="number"
                  step="0.01"
                  value={closeOrderData.receivedAmount}
                  onChange={(e) => setCloseOrderData({ ...closeOrderData, receivedAmount: e.target.value })}
                  placeholder={order.totalAmount.toString()}
                  className={styles.modalInput}
                />
              </div>

              {/* Account Selection */}
              <div className={styles.formSection}>
                <h3>إضافة المال إلى الحسابات</h3>
                {closeOrderData.selectedAccounts.map((acc, idx) => (
                  <div key={idx} className={styles.accountRow}>
                    <select
                      value={acc.accountId}
                      onChange={(e) => {
                        const selectedAccount = accounts.find(a => a.id === e.target.value)
                        const newAccounts = [...closeOrderData.selectedAccounts]
                        newAccounts[idx] = {
                          ...newAccounts[idx],
                          accountId: e.target.value,
                          currency: selectedAccount?.currency || 'LYD',
                          accountName: selectedAccount?.name || '',
                          exchangeRate: selectedAccount?.currency === 'LYD' ? 1.0 : (closeOrderData.exchangeRate || 1.0)
                        }
                        setCloseOrderData({ ...closeOrderData, selectedAccounts: newAccounts })
                      }}
                      className={styles.modalSelect}
                    >
                      <option value="">اختر الحساب</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency}) - الرصيد: {account.balance?.toFixed(2) || '0.00'} {account.currency}
                        </option>
                      ))}
                    </select>
                    {acc.accountId && (() => {
                      const selectedAccount = accounts.find(a => a.id === acc.accountId)
                      const needsExchangeRate = selectedAccount && selectedAccount.currency !== 'LYD'
                      return needsExchangeRate ? (
                        <input
                          type="number"
                          step="0.0001"
                          value={acc.exchangeRate || 1.0}
                          onChange={(e) => {
                            const newAccounts = [...closeOrderData.selectedAccounts]
                            newAccounts[idx].exchangeRate = parseFloat(e.target.value) || 1.0
                            setCloseOrderData({ ...closeOrderData, selectedAccounts: newAccounts })
                          }}
                          placeholder="سعر الصرف"
                          className={styles.modalInput}
                        />
                      ) : null
                    })()}
                    <input
                      type="number"
                      step="0.01"
                      value={acc.amount}
                      onChange={(e) => {
                        const newAccounts = [...closeOrderData.selectedAccounts]
                        newAccounts[idx].amount = e.target.value
                        setCloseOrderData({ ...closeOrderData, selectedAccounts: newAccounts })
                      }}
                      placeholder="المبلغ"
                      className={styles.modalInput}
                    />
                    <input
                      type="text"
                      value={acc.description}
                      onChange={(e) => {
                        const newAccounts = [...closeOrderData.selectedAccounts]
                        newAccounts[idx].description = e.target.value
                        setCloseOrderData({ ...closeOrderData, selectedAccounts: newAccounts })
                      }}
                      placeholder="الوصف (اختياري)"
                      className={styles.modalInput}
                    />
                    <button
                      onClick={() => {
                        const newAccounts = closeOrderData.selectedAccounts.filter((_, i) => i !== idx)
                        setCloseOrderData({ ...closeOrderData, selectedAccounts: newAccounts })
                      }}
                      className={styles.removeButton}
                    >
                      <HiX />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setCloseOrderData({
                      ...closeOrderData,
                      selectedAccounts: [...closeOrderData.selectedAccounts, { accountId: '', amount: '', currency: 'LYD', description: '', exchangeRate: 1.0 }]
                    })
                  }}
                  className={styles.addButton}
                >
                  <HiPlus /> إضافة حساب
                </button>
              </div>

              {/* Profit/Loss Summary */}
              <div className={styles.summarySection}>
                <h3>ملخص الربح/الخسارة</h3>
                {(() => {
                  // Calculate total purchase costs (in LYD)
                  const totalPurchaseCosts = order.items.reduce((sum, item) => {
                    if (item.purchasePrice && item.purchaseCurrency) {
                      const rate = item.purchaseExchangeRate || 1.0
                      const itemCost = parseFloat(item.purchasePrice) * parseFloat(item.quantity)
                      return sum + (itemCost * rate)
                    }
                    return sum
                  }, 0)
                  
                  // Calculate total expenses
                  const totalExpenses = closeOrderData.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
                  
                  // Total paid
                  const totalPaid = totalPurchaseCosts + totalExpenses
                  
                  // Received amount
                  const received = parseFloat(closeOrderData.receivedAmount) || 0
                  
                  // Calculate exchange rate profit/loss
                  // This compares the exchange rate used at purchase vs current rate
                  // For simplicity, we'll show the difference if items were purchased in different currencies
                  let exchangeRateProfit = 0
                  order.items.forEach(item => {
                    if (item.purchasePrice && item.purchaseCurrency && item.purchaseCurrency !== 'LYD') {
                      // If purchased in foreign currency, calculate potential profit/loss from exchange rate changes
                      // This is a simplified calculation - in reality you'd compare with current exchange rates
                      const itemCost = parseFloat(item.purchasePrice) * parseFloat(item.quantity)
                      const costInLYD = itemCost * (item.purchaseExchangeRate || 1.0)
                      // For now, we'll just show the exchange rate used
                      // In a real scenario, you'd fetch current rates and compare
                    }
                  })
                  
                  // Total profit/loss
                  const profit = received - totalPaid
                  const isProfit = profit >= 0

                  return (
                    <>
                      <div className={styles.summaryRow}>
                        <span>إجمالي تكاليف الشراء:</span>
                        <span className={styles.summaryValue}>{totalPurchaseCosts.toFixed(2)} د.ل</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>إجمالي المصروفات:</span>
                        <span className={styles.summaryValue}>{totalExpenses.toFixed(2)} د.ل</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>المبلغ المستلم:</span>
                        <span className={styles.summaryValue}>{received.toFixed(2)} د.ل</span>
                      </div>
                      {exchangeRateProfit !== 0 && (
                        <div className={styles.summaryRow}>
                          <span>ربح/خسارة سعر الصرف:</span>
                          <span className={styles.summaryValue} style={{ 
                            color: exchangeRateProfit >= 0 ? '#16A34A' : '#DC2626' 
                          }}>
                            {exchangeRateProfit >= 0 ? <HiTrendingUp /> : <HiTrendingDown />}
                            {Math.abs(exchangeRateProfit).toFixed(2)} د.ل
                          </span>
                        </div>
                      )}
                      <div className={styles.summaryRow} style={{ 
                        fontWeight: 'bold', 
                        fontSize: '1.2rem',
                        color: isProfit ? '#16A34A' : '#DC2626',
                        borderTop: '2px solid #E5E7EB',
                        paddingTop: '1rem',
                        marginTop: '0.5rem'
                      }}>
                        <span>{isProfit ? 'الربح الإجمالي:' : 'الخسارة الإجمالية:'}</span>
                        <span className={styles.summaryValue}>
                          {isProfit ? <HiTrendingUp /> : <HiTrendingDown />}
                          {Math.abs(profit).toFixed(2)} د.ل
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalCancelButton} onClick={() => setShowCloseOrderModal(false)}>
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={handleCloseOrder}
                  disabled={closeOrderData.selectedAccounts.length === 0 || closeOrderData.selectedAccounts.some(acc => !acc.accountId || !acc.amount)}
                >
                  إنهاء الطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Account Selection Modal */}
      {showPurchaseAccountModal && purchasingItem && (
        <div className={styles.modalOverlay} onClick={() => {
          setShowPurchaseAccountModal(false)
          setPurchasingItem(null)
          setPurchaseFormData({ accountId: '', price: '', currency: 'LYD', exchangeRate: 1.0 })
        }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>اختيار حساب الشراء</h2>
              <button className={styles.closeButton} onClick={() => {
                setShowPurchaseAccountModal(false)
                setPurchasingItem(null)
                setPurchaseFormData({ accountId: '', price: '', currency: 'LYD', exchangeRate: 1.0 })
              }}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalContent}>
              <p style={{ marginBottom: '1rem', fontWeight: '600' }}>العنصر: {purchasingItem.name}</p>
              
              {/* Display original data for reference */}
              {purchasingItem.unitPrice && (
                <div className={styles.summarySection} style={{ marginBottom: '1.5rem', background: '#F3F4F6', padding: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#6B7280' }}>البيانات الأصلية:</h3>
                  <div className={styles.summaryRow} style={{ padding: '0.25rem 0', fontSize: '0.85rem' }}>
                    <span style={{ color: '#6B7280' }}>السعر الأصلي:</span>
                    <span style={{ color: '#6B7280' }}>{purchasingItem.unitPrice.toFixed(2)} {purchasingItem.currency || 'LYD'}</span>
                  </div>
                  {purchasingItem.exchangeRate && purchasingItem.currency !== 'LYD' && (
                    <div className={styles.summaryRow} style={{ padding: '0.25rem 0', fontSize: '0.85rem' }}>
                      <span style={{ color: '#6B7280' }}>سعر الصرف الأصلي:</span>
                      <span style={{ color: '#6B7280' }}>{purchasingItem.exchangeRate.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className={styles.formSection}>
                <label className={styles.required}>الحساب المستخدم للشراء *</label>
                <select
                  value={purchaseFormData.accountId}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, accountId: e.target.value })}
                  className={styles.modalSelect}
                >
                  <option value="">اختر الحساب</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
                <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  اختر الحساب الذي تم استخدامه لشراء هذا العنصر
                </small>
              </div>

              <div className={styles.formSection}>
                <label>سعر الشراء *</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseFormData.price}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, price: e.target.value })}
                  placeholder={purchasingItem.unitPrice ? purchasingItem.unitPrice.toString() : '0.00'}
                  className={styles.modalInput}
                />
                <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  يمكنك تعديل سعر الشراء إذا كان مختلفاً عن السعر الأصلي
                </small>
              </div>

              <div className={styles.formSection}>
                <label>العملة</label>
                <select
                  value={purchaseFormData.currency}
                  onChange={(e) => setPurchaseFormData({ ...purchaseFormData, currency: e.target.value, exchangeRate: e.target.value === 'LYD' ? '1.0' : purchaseFormData.exchangeRate })}
                  className={styles.modalSelect}
                >
                  <option value="LYD">دينار ليبي (د.ل)</option>
                  <option value="EUR">يورو (€)</option>
                  <option value="USD">دولار أمريكي ($)</option>
                  <option value="GBP">جنيه إسترليني (£)</option>
                  <option value="TRY">ليرة تركية (₺)</option>
                </select>
              </div>

              {purchaseFormData.currency !== 'LYD' && (
                <div className={styles.formSection}>
                  <label>سعر الصرف</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={purchaseFormData.exchangeRate}
                    onChange={(e) => setPurchaseFormData({ ...purchaseFormData, exchangeRate: e.target.value })}
                    placeholder="1.0"
                    className={styles.modalInput}
                  />
                  <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                    سعر الصرف من {purchaseFormData.currency} إلى الدينار الليبي
                    {purchaseFormData.price && purchaseFormData.exchangeRate && (
                      <span style={{ display: 'block', marginTop: '0.25rem', fontWeight: '600', color: '#1F2937' }}>
                        المجموع: {(parseFloat(purchaseFormData.price) * parseFloat(purchaseFormData.exchangeRate || 1.0) * purchasingItem.quantity).toFixed(2)} د.ل
                      </span>
                    )}
                  </small>
                </div>
              )}

              {purchaseFormData.price && purchaseFormData.currency === 'LYD' && (
                <div className={styles.summarySection} style={{ marginTop: '1rem' }}>
                  <div className={styles.summaryRow} style={{ fontWeight: '600' }}>
                    <span>المجموع:</span>
                    <span className={styles.summaryValue}>
                      {(parseFloat(purchaseFormData.price) * purchasingItem.quantity).toFixed(2)} د.ل
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button 
                  className={styles.modalCancelButton} 
                  onClick={() => {
                    setShowPurchaseAccountModal(false)
                    setPurchasingItem(null)
                    setPurchaseFormData({ accountId: '', price: '', currency: 'LYD', exchangeRate: 1.0 })
                  }}
                >
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={() => {
                    if (!purchaseFormData.accountId) {
                      alert('الرجاء اختيار الحساب المستخدم للشراء')
                      return
                    }

                    if (!purchaseFormData.price) {
                      alert('الرجاء إدخال سعر الشراء')
                      return
                    }

                    const price = parseFloat(purchaseFormData.price)
                    const currency = purchaseFormData.currency
                    const exchangeRate = parseFloat(purchaseFormData.exchangeRate || 1.0)

                    if (isNaN(price) || price <= 0) {
                      alert('الرجاء إدخال سعر شراء صحيح')
                      return
                    }

                    updateItemStatus(purchasingItem.id, 'purchased', purchaseFormData.accountId, price, currency, exchangeRate)
                    setPurchaseFormData({ accountId: '', price: '', currency: 'LYD', exchangeRate: 1.0 })
                  }}
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




