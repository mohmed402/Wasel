'use client'

import { useState } from 'react'
import PaymentFilters from '../../../components/PaymentFilters'
import PaymentsTable from '../../../components/PaymentsTable'
import styles from '../payments.module.css'
import { HiCurrencyDollar, HiExclamationCircle, HiCheckCircle, HiClock } from 'react-icons/hi'

export default function RefundsPage() {
  const [filters, setFilters] = useState({})
  const [refunds, setRefunds] = useState([
    {
      id: 'REF-001',
      orderId: 'ORD-009',
      customerName: 'أحمد يوسف',
      paymentType: 'refund',
      amount: 50,
      refundReason: 'عنصر مفقود',
      relatedIssue: 'ISSUE-001',
      relatedItem: 'قميص أزرق - حجم M',
      refundMethod: 'transfer',
      status: 'completed',
      dateProcessed: '2024-01-22',
      processedBy: 'محمد علي',
      hasProof: true
    },
    {
      id: 'REF-002',
      orderId: 'ORD-010',
      customerName: 'ليلى محمود',
      paymentType: 'refund',
      amount: 80,
      refundReason: 'عنصر تالف',
      relatedIssue: 'ISSUE-002',
      relatedItem: 'بنطلون جينز - حجم 32',
      refundMethod: 'bank',
      status: 'processed',
      dateProcessed: '2024-01-23',
      processedBy: 'فاطمة أحمد',
      hasProof: false
    },
    {
      id: 'REF-003',
      orderId: 'ORD-011',
      customerName: 'يوسف سالم',
      paymentType: 'refund',
      amount: 200,
      refundReason: 'إلغاء الطلب',
      relatedIssue: null,
      relatedItem: null,
      refundMethod: 'transfer',
      status: 'pending',
      dateProcessed: null,
      processedBy: null,
      hasProof: false
    },
    {
      id: 'REF-004',
      orderId: 'ORD-012',
      customerName: 'هدى كريم',
      paymentType: 'refund',
      amount: 30,
      refundReason: 'تعديل السعر',
      relatedIssue: null,
      relatedItem: null,
      refundMethod: 'cash',
      status: 'pending',
      dateProcessed: null,
      processedBy: null,
      hasProof: false
    }
  ])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const getRefundStatusBadge = (status) => {
    const configs = {
      pending: { label: 'معلق', class: styles.badgePending, icon: HiClock },
      processed: { label: 'قيد المعالجة', class: styles.badgeProcessed, icon: HiClock },
      completed: { label: 'مكتمل', class: styles.badgeCompleted, icon: HiCheckCircle }
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
            المستردات
          </h1>
          <p className={styles.pageSubtitle}>
            تتبع الأموال المستردة للعملاء
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton}>
            إنشاء استرداد جديد
          </button>
        </div>
      </div>

      {/* <div className={styles.infoBox}>
        <HiExclamationCircle className={styles.infoIcon} />
        <div>
          <strong>🔐 قاعدة مهمة:</strong>
          <p>المستردات يجب ألا تكون صامتة - كل شيء يجب أن يكون قابلاً للتتبع. لا يمكن حذف المستردات، التصحيحات = إدخالات تعديل.</p>
        </div>
      </div> */}

      <PaymentFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي المستردات:</span>
          <span className={styles.statValue}>{refunds.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>معلقة:</span>
          <span className={styles.statValue}>
            {refunds.filter(r => r.status === 'pending').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>قيد المعالجة:</span>
          <span className={styles.statValue}>
            {refunds.filter(r => r.status === 'processed').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>مكتملة:</span>
          <span className={styles.statValue}>
            {refunds.filter(r => r.status === 'completed').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي المبلغ:</span>
          <span className={styles.statValue}>
            {refunds.reduce((sum, r) => sum + r.amount, 0)} د.ل
          </span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>رقم الاسترداد</th>
              <th>رقم الطلب</th>
              <th>اسم العميل</th>
              <th>سبب الاسترداد</th>
              <th>العنصر / المشكلة</th>
              <th>المبلغ</th>
              <th>طريقة الاسترداد</th>
              <th>الحالة</th>
              <th>تاريخ المعالجة</th>
              <th>إثبات</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((refund) => (
              <tr key={refund.id}>
                <td className={styles.paymentId}>{refund.id}</td>
                <td>
                  <a href={`/orders/${refund.orderId}`} className={styles.orderLink}>
                    {refund.orderId}
                  </a>
                </td>
                <td>{refund.customerName}</td>
                <td>
                  <span className={styles.reasonBadge}>{refund.refundReason}</span>
                </td>
                <td>
                  {refund.relatedIssue ? (
                    <div>
                      <div className={styles.relatedItem}>{refund.relatedItem}</div>
                      <div className={styles.relatedIssue}>
                        <a href={`/issues/${refund.relatedIssue}`} className={styles.issueLink}>
                          {refund.relatedIssue}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span className={styles.noRelated}>-</span>
                  )}
                </td>
                <td className={styles.amount}>{refund.amount} د.ل</td>
                <td>
                  {refund.refundMethod === 'cash' ? 'نقدي' : 
                   refund.refundMethod === 'transfer' ? 'تحويل' : 
                   refund.refundMethod === 'bank' ? 'بنكي' : '-'}
                </td>
                <td>{getRefundStatusBadge(refund.status)}</td>
                <td>{refund.dateProcessed || 'لم يتم بعد'}</td>
                <td>
                  {refund.hasProof ? (
                    <span className={styles.proofBadge}>
                      <HiCheckCircle />
                      متوفر
                    </span>
                  ) : (
                    <span className={styles.noProof}>غير متوفر</span>
                  )}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionButton}>
                      {refund.status === 'pending' ? 'معالجة' : 'عرض'}
                    </button>
                    {refund.status === 'processed' && (
                      <button className={styles.actionButton}>
                        إكمال
                      </button>
                    )}
                    {!refund.hasProof && (
                      <button className={styles.actionButton}>
                        رفع إثبات
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


