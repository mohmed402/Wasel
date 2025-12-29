'use client'

import Link from 'next/link'
import styles from './OrdersTable.module.css'
import { HiEye, HiPencil, HiExclamation } from 'react-icons/hi'

export default function OrdersTable({ orders, showIssueIndicator = true }) {
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'معلق', class: styles.badgePending },
      processing: { label: 'تم الطلب', class: styles.badgeOrdered },
      shipping: { label: 'قيد الشحن', class: styles.badgeShipping },
      delivered: { label: 'تم التسليم', class: styles.badgeDelivered },
      cancelled: { label: 'ملغي', class: styles.badgeProblem }
    }

    const config = statusConfig[status] || { label: status, class: styles.badgeDefault }
    return <span className={`${styles.badge} ${config.class}`}>{config.label}</span>
  }

  const getDepositBadge = (status) => {
    const statusConfig = {
      paid: { label: 'مدفوع', class: styles.badgeSuccess },
      partial: { label: 'جزئي', class: styles.badgeWarning },
      unpaid: { label: 'غير مدفوع', class: styles.badgeWarning }
    }
    const config = statusConfig[status] || { label: 'غير مدفوع', class: styles.badgeWarning }
    return <span className={`${styles.badge} ${config.class}`}>{config.label}</span>
  }

  if (!orders || orders.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>لا توجد طلبات لعرضها</p>
      </div>
    )
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>اسم العميل</th>
            <th>رقم الهاتف</th>
            <th>تاريخ الطلب</th>
            <th>المبلغ الإجمالي</th>
            <th>حالة الدفعة</th>
            <th>الرصيد المتبقي</th>
            <th>الحالة</th>
            <th>مرحلة الشحن</th>
            {showIssueIndicator && <th>المشاكل</th>}
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className={styles.orderId}>{order.id}</td>
              <td>{order.customerName}</td>
              <td>{order.phone}</td>
              <td>{order.orderDate}</td>
              <td className={styles.amount}>{order.totalAmount} د.ل</td>
              <td>{getDepositBadge(order.depositStatus)}</td>
              <td className={styles.amount}>{order.remainingBalance} د.ل</td>
              <td>{getStatusBadge(order.status)}</td>
              <td>{order.shippingStage}</td>
              {showIssueIndicator && (
                <td>
                  {order.hasIssues ? (
                    <span className={styles.issueBadge}>
                      <HiExclamation />
                      نعم
                    </span>
                  ) : (
                    <span className={styles.noIssue}>لا</span>
                  )}
                </td>
              )}
              <td>
                <div className={styles.actions}>
                  <Link href={`/orders/${order.orderId || order.id}`} className={styles.actionButton}>
                    <HiEye />
                    عرض
                  </Link>
                  <Link href={`/orders/${order.orderId || order.id}`} className={styles.actionButton}>
                    <HiPencil />
                    تعديل
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}




