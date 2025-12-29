'use client'

import { useState } from 'react'
import OrderFilters from '../../../components/OrderFilters'
import OrdersTable from '../../../components/OrdersTable'
import styles from '../orders.module.css'
import { HiExclamation, HiExclamationCircle } from 'react-icons/hi'

export default function ProblemOrdersPage() {
  const [filters, setFilters] = useState({})
  const [orders, setOrders] = useState([
    // Sample data - replace with real data
    {
      id: 'ORD-005',
      customerName: 'علي حسن',
      phone: '0956789012',
      orderDate: '2024-01-10',
      totalAmount: 280,
      depositStatus: 'paid',
      remainingBalance: 100,
      status: 'problem',
      shippingStage: 'قيد الشحن',
      hasIssues: true,
      problemType: 'عنصر مفقود',
      problemDays: 5,
      responsible: 'SHEIN'
    },
    {
      id: 'ORD-006',
      customerName: 'نورا سعيد',
      phone: '0967890123',
      orderDate: '2024-01-08',
      totalAmount: 350,
      depositStatus: 'paid',
      remainingBalance: 0,
      status: 'problem',
      shippingStage: 'تم التسليم',
      hasIssues: true,
      problemType: 'عنصر تالف',
      problemDays: 8,
      responsible: 'شركة الشحن المحلية'
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
            <HiExclamation className={styles.titleIcon} />
            الطلبات المشكلة
          </h1>
          <p className={styles.pageSubtitle}>
            الطلبات التي تحتوي على مشاكل تحتاج إلى حل
          </p>
        </div>
      </div>

      <div className={styles.urgentAlert}>
        <HiExclamationCircle className={styles.urgentIcon} />
        <div>
          <strong>انتباه:</strong> هذه الطلبات تحتاج إلى متابعة فورية
        </div>
      </div>

      <OrderFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>الطلبات المشكلة:</span>
          <span className={`${styles.statValue} ${styles.urgentValue}`}>
            {orders.length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>أكثر من 7 أيام:</span>
          <span className={`${styles.statValue} ${styles.urgentValue}`}>
            {orders.filter(o => o.problemDays > 7).length}
          </span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.problemTable}>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>اسم العميل</th>
              <th>نوع المشكلة</th>
              <th>المسؤول</th>
              <th>أيام منذ الاكتشاف</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={styles.problemRow}>
                <td className={styles.orderId}>{order.id}</td>
                <td>{order.customerName}</td>
                <td>
                  <span className={styles.problemType}>{order.problemType}</span>
                </td>
                <td>{order.responsible}</td>
                <td>
                  <span className={order.problemDays > 7 ? styles.urgentDays : styles.days}>
                    {order.problemDays} يوم
                  </span>
                </td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeProblem}`}>
                    {order.status === 'problem' ? 'مشكلة' : order.status}
                  </span>
                </td>
                <td>
                  <a href={`/orders/${order.id}`} className={styles.viewButton}>
                    عرض التفاصيل
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

