'use client'

import { useState } from 'react'
import PaymentFilters from '../../../components/PaymentFilters'
import styles from '../payments.module.css'
import { HiCurrencyDollar, HiExclamationCircle, HiClock, HiCheckCircle } from 'react-icons/hi'

export default function PendingBalancesPage() {
  const [filters, setFilters] = useState({})
  const [balances, setBalances] = useState([
    {
      id: 'BAL-001',
      orderId: 'ORD-005',
      customerName: 'علي حسن',
      paymentType: 'balance',
      totalAmount: 350,
      totalPaid: 200,
      remainingBalance: 150,
      deliveryStatus: 'delivered',
      deliveryDate: '2024-01-20',
      daysOverdue: 5,
      status: 'overdue',
      dueDate: '2024-01-25'
    },
    {
      id: 'BAL-002',
      orderId: 'ORD-006',
      customerName: 'نورا سعيد',
      paymentType: 'balance',
      totalAmount: 280,
      totalPaid: 150,
      remainingBalance: 130,
      deliveryStatus: 'delivered',
      deliveryDate: '2024-01-18',
      daysOverdue: 0,
      status: 'due',
      dueDate: '2024-01-28'
    },
    {
      id: 'BAL-003',
      orderId: 'ORD-007',
      customerName: 'خالد إبراهيم',
      paymentType: 'balance',
      totalAmount: 400,
      totalPaid: 200,
      remainingBalance: 200,
      deliveryStatus: 'shipping',
      deliveryDate: null,
      daysOverdue: 0,
      status: 'not_due',
      dueDate: null
    },
    {
      id: 'BAL-004',
      orderId: 'ORD-008',
      customerName: 'مريم عبدالله',
      paymentType: 'balance',
      totalAmount: 300,
      totalPaid: 100,
      remainingBalance: 200,
      deliveryStatus: 'pending',
      deliveryDate: null,
      daysOverdue: 0,
      status: 'not_due',
      dueDate: null
    }
  ])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const getStatusBadge = (status) => {
    const configs = {
      not_due: { label: 'غير مستحق بعد', class: styles.badgeNotDue, icon: HiClock },
      due: { label: 'مستحق', class: styles.badgeDue, icon: HiExclamationCircle },
      overdue: { label: 'متأخر', class: styles.badgeOverdue, icon: HiExclamationCircle }
    }
    const config = configs[status] || { label: status, class: styles.badgeDefault, icon: HiClock }
    const Icon = config.icon
    return (
      <span className={`${styles.badge} ${config.class}`}>
        <Icon className={styles.badgeIcon} />
        {config.label}
      </span>
    )
  }

  return (
    <div className={styles.paymentsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiCurrencyDollar className={styles.titleIcon} />
            الأرصدة المعلقة
          </h1>
          <p className={styles.pageSubtitle}>
            تتبع الأموال المستحقة بعد التسليم أو قبل الإفراج
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton}>
            تسجيل دفعة
          </button>
        </div>
      </div>

      <div className={styles.alertBox}>
        <HiExclamationCircle className={styles.alertIcon} />
        <div>
          <strong>⚠️ هذه الصفحة هي تنبيه التدفق النقدي الخاص بك</strong>
          <p>تعرض الطلبات التي لم يتم دفعها بالكامل - سواء كانت مسلمة أو غير مسلمة.</p>
        </div>
      </div>

      <PaymentFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي الأرصدة المعلقة:</span>
          <span className={styles.statValue}>{balances.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>متأخرة:</span>
          <span className={`${styles.statValue} ${styles.urgentValue}`}>
            {balances.filter(b => b.status === 'overdue').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>مستحقة:</span>
          <span className={styles.statValue}>
            {balances.filter(b => b.status === 'due').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي المستحق:</span>
          <span className={`${styles.statValue} ${styles.urgentValue}`}>
            {balances.reduce((sum, b) => sum + b.remainingBalance, 0)} د.ل
          </span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>رقم الرصيد</th>
              <th>رقم الطلب</th>
              <th>اسم العميل</th>
              <th>المبلغ الإجمالي</th>
              <th>المبلغ المدفوع</th>
              <th>الرصيد المتبقي</th>
              <th>حالة التسليم</th>
              <th>أيام التأخير</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr key={balance.id} className={balance.status === 'overdue' ? styles.urgentRow : ''}>
                <td className={styles.paymentId}>{balance.id}</td>
                <td>
                  <a href={`/orders/${balance.orderId}`} className={styles.orderLink}>
                    {balance.orderId}
                  </a>
                </td>
                <td>{balance.customerName}</td>
                <td className={styles.amount}>{balance.totalAmount} د.ل</td>
                <td className={styles.amount}>{balance.totalPaid} د.ل</td>
                <td className={`${styles.amount} ${styles.remainingBalance}`}>
                  {balance.remainingBalance} د.ل
                </td>
                <td>
                  {balance.deliveryStatus === 'delivered' ? (
                    <span className={`${styles.badge} ${styles.badgeDelivered}`}>
                      <HiCheckCircle className={styles.badgeIcon} />
                      مسلم
                    </span>
                  ) : balance.deliveryStatus === 'shipping' ? (
                    <span className={`${styles.badge} ${styles.badgeShipping}`}>
                      قيد الشحن
                    </span>
                  ) : (
                    <span className={`${styles.badge} ${styles.badgePending}`}>
                      لم يتم التسليم
                    </span>
                  )}
                </td>
                <td>
                  {balance.deliveryStatus === 'delivered' && balance.daysOverdue > 0 ? (
                    <span className={styles.overdueDays}>{balance.daysOverdue} يوم</span>
                  ) : balance.deliveryStatus === 'delivered' ? (
                    <span className={styles.days}>0 يوم</span>
                  ) : (
                    <span className={styles.notApplicable}>-</span>
                  )}
                </td>
                <td>{getStatusBadge(balance.status)}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionButton}>
                      تسجيل دفعة
                    </button>
                    {balance.deliveryStatus === 'delivered' && (
                      <button className={styles.actionButton}>
                        تذكير
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

