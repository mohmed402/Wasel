'use client'

import { useState } from 'react'
import OrderFilters from '../../../components/OrderFilters'
import OrdersTable from '../../../components/OrdersTable'
import styles from '../orders.module.css'
import { HiCheckCircle, HiDocumentText } from 'react-icons/hi'

export default function DeliveredOrdersPage() {
  const [filters, setFilters] = useState({})
  const [orders, setOrders] = useState([
    // Sample data - replace with real data
    {
      id: 'ORD-007',
      customerName: 'خالد إبراهيم',
      phone: '0978901234',
      orderDate: '2024-01-05',
      totalAmount: 400,
      depositStatus: 'paid',
      remainingBalance: 0,
      status: 'delivered',
      shippingStage: 'تم التسليم',
      hasIssues: false,
      deliveryDate: '2024-01-12',
      receiverName: 'خالد إبراهيم',
      paymentStatus: 'fully_paid',
      hasProof: true
    },
    {
      id: 'ORD-008',
      customerName: 'مريم عبدالله',
      phone: '0989012345',
      orderDate: '2024-01-03',
      totalAmount: 300,
      depositStatus: 'paid',
      remainingBalance: 100,
      status: 'delivered',
      shippingStage: 'تم التسليم',
      hasIssues: false,
      deliveryDate: '2024-01-10',
      receiverName: 'مريم عبدالله',
      paymentStatus: 'balance_pending',
      hasProof: false
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
            <HiCheckCircle className={styles.titleIcon} />
            الطلبات المسلمة
          </h1>
          <p className={styles.pageSubtitle}>
            الطلبات التي تم تسليمها للعملاء
          </p>
        </div>
      </div>

      <OrderFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>الطلبات المسلمة:</span>
          <span className={styles.statValue}>{orders.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>مدفوعة بالكامل:</span>
          <span className={styles.statValue}>
            {orders.filter(o => o.paymentStatus === 'fully_paid').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>رصيد معلق:</span>
          <span className={styles.statValue}>
            {orders.filter(o => o.paymentStatus === 'balance_pending').length}
          </span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>اسم العميل</th>
              <th>تاريخ التسليم</th>
              <th>اسم المستلم</th>
              <th>المبلغ الإجمالي</th>
              <th>حالة الدفع</th>
              <th>إثبات التسليم</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className={styles.orderId}>{order.id}</td>
                <td>{order.customerName}</td>
                <td>{order.deliveryDate}</td>
                <td>{order.receiverName}</td>
                <td className={styles.amount}>{order.totalAmount} د.ل</td>
                <td>
                  {order.paymentStatus === 'fully_paid' ? (
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                      مدفوع بالكامل
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgeWarning}`}>
                      رصيد معلق: {order.remainingBalance} د.ل
                    </span>
                  )}
                </td>
                <td>
                  {order.hasProof ? (
                    <span className={styles.proofBadge}>
                      <HiDocumentText />
                      متوفر
                    </span>
                  ) : (
                    <span className={styles.noProof}>غير متوفر</span>
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    <a href={`/orders/${order.id}`} className={styles.actionButton}>
                      عرض
                    </a>
                    {order.paymentStatus === 'balance_pending' && (
                      <button className={styles.actionButton}>
                        تسجيل الدفع
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

