'use client'

import Link from 'next/link'
import styles from './PaymentsTable.module.css'
import { HiEye, HiPencil, HiCurrencyDollar } from 'react-icons/hi'

export default function PaymentsTable({ payments, showOrderLink = true }) {
  const getPaymentTypeBadge = (type) => {
    const configs = {
      deposit: { label: 'دفعة', class: styles.badgeDeposit },
      balance: { label: 'رصيد', class: styles.badgeBalance },
      refund: { label: 'استرداد', class: styles.badgeRefund }
    }
    const config = configs[type] || { label: type, class: styles.badgeDefault }
    return <span className={`${styles.badge} ${config.class}`}>{config.label}</span>
  }

  const getPaymentMethodBadge = (method) => {
    const methods = {
      cash: 'نقدي',
      transfer: 'تحويل',
      bank: 'بنكي'
    }
    return methods[method] || method
  }

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'معلق', class: styles.badgePending },
      received: { label: 'مستلم', class: styles.badgeReceived },
      completed: { label: 'مكتمل', class: styles.badgeCompleted },
      refunded: { label: 'مسترد', class: styles.badgeRefunded },
      overdue: { label: 'متأخر', class: styles.badgeOverdue }
    }
    const config = configs[status] || { label: status, class: styles.badgeDefault }
    return <span className={`${styles.badge} ${config.class}`}>{config.label}</span>
  }

  if (!payments || payments.length === 0) {
    return (
      <div className={styles.emptyState}>
        <HiCurrencyDollar className={styles.emptyIcon} />
        <p>لا توجد مدفوعات لعرضها</p>
      </div>
    )
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>رقم الدفعة</th>
            {showOrderLink && <th>رقم الطلب</th>}
            <th>اسم العميل</th>
            <th>نوع الدفعة</th>
            <th>المبلغ</th>
            <th>طريقة الدفع</th>
            <th>تاريخ الاستلام</th>
            <th>استلم من قبل</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className={styles.paymentId}>{payment.id}</td>
              {showOrderLink && (
                <td>
                  <Link href={`/orders/${payment.orderId}`} className={styles.orderLink}>
                    {payment.orderId}
                  </Link>
                </td>
              )}
              <td>{payment.customerName}</td>
              <td>{getPaymentTypeBadge(payment.paymentType)}</td>
              <td className={styles.amount}>{payment.amount} د.ل</td>
              <td>{getPaymentMethodBadge(payment.paymentMethod)}</td>
              <td>{payment.dateReceived || 'لم يتم بعد'}</td>
              <td>{payment.receivedBy || '-'}</td>
              <td>{getStatusBadge(payment.status)}</td>
              <td>
                <div className={styles.actions}>
                  <Link href={`/payments/${payment.id}`} className={styles.actionButton}>
                    <HiEye />
                    عرض
                  </Link>
                  <button className={styles.actionButton}>
                    <HiPencil />
                    تعديل
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}




