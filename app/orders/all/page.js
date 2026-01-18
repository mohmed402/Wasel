'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import OrderFilters from '../../../components/OrderFilters'
import OrdersTable from '../../../components/OrdersTable'
import styles from '../orders.module.css'
import { HiDownload, HiRefresh, HiPlus, HiTrendingUp, HiTrendingDown } from 'react-icons/hi'

export default function AllOrdersPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({})
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalProfit, setTotalProfit] = useState(0)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      
      const response = await fetch(`/api/orders?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        
        // Calculate total profit from all orders
        let profit = 0
        data.forEach(order => {
          // Calculate profit from items
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
              const sellingPrice = parseFloat(item.selling_price || item.unit_price || 0)
              const purchasePrice = parseFloat(item.purchase_price || 0)
              const quantity = parseFloat(item.quantity || 1)
              const exchangeRate = parseFloat(item.purchase_exchange_rate || 1.0)
              
              // Convert purchase price to base currency (LYD) if needed
              const purchasePriceInLYD = purchasePrice * exchangeRate
              
              // Profit = (selling price - purchase price) * quantity
              if (purchasePrice > 0) {
                profit += (sellingPrice - purchasePriceInLYD) * quantity
              }
            })
          }
          
          // Subtract expenses
          if (order.expenses && order.expenses.length > 0) {
            order.expenses.forEach(expense => {
              const amount = parseFloat(expense.amount || 0)
              const exchangeRate = parseFloat(expense.exchange_rate || 1.0)
              profit -= amount * exchangeRate
            })
          }
        })
        
        setTotalProfit(profit)
        
        // Transform data to match OrdersTable component format
        const transformedOrders = data.map(order => ({
          id: order.internal_ref || order.id,
          orderId: order.id, // Keep UUID for navigation
          customerName: order.customer?.name || 'غير معروف',
          phone: order.customer?.phone || '-',
          orderDate: order.order_date,
          totalAmount: parseFloat(order.total_amount) || 0,
          depositStatus: order.payment?.payment_status || 'unpaid',
          remainingBalance: parseFloat(order.payment?.remaining_balance) || 0,
          status: order.status,
          shippingStage: order.shipping?.shipping_stage || 'not_started',
          hasIssues: order.has_issues || false
        }))
        setOrders(transformedOrders)
      } else {
        console.error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch orders from database
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    fetchOrders()
  }

  const handleExport = () => {
    // Export functionality
    console.log('Exporting orders...')
  }

  const handleNewOrderClick = () => {
    router.push('/orders/new')
  }

  return (
    <div className={styles.ordersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>الطلبات</h1>
          <p className={styles.pageSubtitle}>إدارة جميع الطلبات في النظام</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleNewOrderClick} className={styles.newOrderButton}>
            <HiPlus />
            إضافة طلب جديد
          </button>
          <button onClick={handleExport} className={styles.exportButton}>
            <HiDownload />
            تصدير (Excel)
          </button>
          <button onClick={handleRefresh} className={styles.refreshButton} disabled={loading}>
            <HiRefresh />
            تحديث
          </button>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <Link
          href="/orders/all"
          className={`${styles.tab} ${styles.tabActive}`}
        >
          قائمة الطلبات
        </Link>
        <Link
          href="/orders/new"
          className={styles.tab}
        >
          إضافة طلب جديد / Add New Order
        </Link>
      </div>

      <OrderFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي الطلبات:</span>
          <span className={styles.statValue}>{orders.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>المعلقة:</span>
          <span className={styles.statValue}>
            {orders.filter(o => o.status === 'pending').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>قيد الشحن:</span>
          <span className={styles.statValue}>
            {orders.filter(o => o.status === 'shipping').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>المشاكل:</span>
          <span className={styles.statValue}>
            {orders.filter(o => o.hasIssues).length}
          </span>
        </div>
        <div className={`${styles.stat} ${styles.profitStat}`} style={{ 
          color: totalProfit >= 0 ? '#16A34A' : '#DC2626',
          fontWeight: '600',
          borderRight: `3px solid ${totalProfit >= 0 ? '#16A34A' : '#DC2626'}`
        }}>
          <span className={styles.statLabel}>إجمالي الربح:</span>
          <span className={styles.statValue} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {totalProfit >= 0 ? <HiTrendingUp /> : <HiTrendingDown />}
            {totalProfit.toFixed(2)} د.ل
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
          جاري تحميل الطلبات...
        </div>
      ) : (
        <OrdersTable orders={orders} showIssueIndicator={true} />
      )}
    </div>
  )
}

