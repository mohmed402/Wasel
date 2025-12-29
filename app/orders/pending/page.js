'use client'

import { useState } from 'react'
import OrderFilters from '../../../components/OrderFilters'
import OrdersTable from '../../../components/OrdersTable'
import styles from '../orders.module.css'
import { HiClock, HiExclamationCircle } from 'react-icons/hi'

export default function PendingOrdersPage() {
  const [filters, setFilters] = useState({})
  const [orders, setOrders] = useState([
    // Sample data - replace with real data
    {
      id: 'ORD-003',
      customerName: 'محمد خالد',
      phone: '0934567890',
      orderDate: '2024-01-16',
      totalAmount: 320,
      depositStatus: 'unpaid',
      remainingBalance: 320,
      status: 'pending',
      shippingStage: 'لم يبدأ',
      hasIssues: false,
      pendingReason: 'في انتظار الموافقة على السعر'
    },
    {
      id: 'ORD-004',
      customerName: 'سارة أحمد',
      phone: '0945678901',
      orderDate: '2024-01-15',
      totalAmount: 200,
      depositStatus: 'paid',
      remainingBalance: 150,
      status: 'pending',
      shippingStage: 'لم يبدأ',
      hasIssues: false,
      pendingReason: 'في انتظار الطلب من SHEIN'
    }
  ])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  return (
    <div className={styles.ordersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiClock className={styles.titleIcon} />
            الطلبات المعلقة
          </h1>
          <p className={styles.pageSubtitle}>
            الطلبات التي تحتاج إلى إجراء أو متابعة
          </p>
        </div>
      </div>

      <OrderFilters onFilterChange={handleFilterChange} />

      <div className={styles.alertBox}>
        <HiExclamationCircle className={styles.alertIcon} />
        <div>
          <strong>ما الذي يعتبر معلقاً؟</strong>
          <ul className={styles.alertList}>
            <li>تم استلام السلة، لم يتم الموافقة على السعر</li>
            <li>تمت الموافقة على السعر، لم يتم دفع الدفعة</li>
            <li>تم دفع الدفعة، لم يتم الطلب من SHEIN</li>
            <li>تم الطلب، لم يتم الشحن بعد</li>
          </ul>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>الطلبات المعلقة:</span>
          <span className={styles.statValue}>{orders.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>في انتظار الدفعة:</span>
          <span className={styles.statValue}>
            {orders.filter(o => o.depositStatus === 'unpaid').length}
          </span>
        </div>
      </div>

      <OrdersTable orders={orders} showIssueIndicator={false} />
    </div>
  )
}

