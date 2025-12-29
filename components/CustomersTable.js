'use client'

import Link from 'next/link'
import styles from './CustomersTable.module.css'
import { HiEye, HiPencil, HiPhone, HiMail, HiLocationMarker, HiUser, HiChat, HiShare } from 'react-icons/hi'

export default function CustomersTable({ customers }) {
  const getContactIcon = (preferredContact) => {
    switch (preferredContact) {
      case 'phone':
        return <HiPhone className={styles.contactIcon} />
      case 'whatsapp':
        return <HiChat className={styles.contactIcon} />
      case 'facebook':
        return <HiShare className={styles.contactIcon} />
      case 'email':
        return <HiMail className={styles.contactIcon} />
      default:
        return <HiUser className={styles.contactIcon} />
    }
  }

  if (!customers || customers.length === 0) {
    return (
      <div className={styles.emptyState}>
        <HiUser className={styles.emptyIcon} />
        <p>لا يوجد عملاء لعرضهم</p>
      </div>
    )
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>رقم الهاتف</th>
            <th>البريد الإلكتروني</th>
            <th>العنوان</th>
            <th>طريقة التواصل المفضلة</th>
            <th>عدد الطلبات</th>
            <th>إجمالي المشتريات</th>
            <th>آخر طلب</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td className={styles.customerName}>
                <div className={styles.nameCell}>
                  <HiUser className={styles.nameIcon} />
                  {customer.name}
                </div>
              </td>
              <td>
                <div className={styles.phoneCell}>
                  <HiPhone className={styles.phoneIcon} />
                  {customer.phone || '-'}
                </div>
              </td>
              <td>
                {customer.email ? (
                  <div className={styles.emailCell}>
                    <HiMail className={styles.emailIcon} />
                    <a href={`mailto:${customer.email}`} className={styles.emailLink}>
                      {customer.email}
                    </a>
                  </div>
                ) : (
                  <span className={styles.noData}>-</span>
                )}
              </td>
              <td>
                {customer.address ? (
                  <div className={styles.addressCell}>
                    <HiLocationMarker className={styles.addressIcon} />
                    <span className={styles.addressText}>{customer.address}</span>
                  </div>
                ) : (
                  <span className={styles.noData}>-</span>
                )}
              </td>
              <td>
                {customer.preferred_contact ? (
                  <div className={styles.contactCell}>
                    {getContactIcon(customer.preferred_contact)}
                    <span className={styles.contactLabel}>
                      {customer.preferred_contact === 'phone' ? 'هاتف' :
                       customer.preferred_contact === 'whatsapp' ? 'واتساب' :
                       customer.preferred_contact === 'facebook' ? 'فيسبوك' :
                       customer.preferred_contact === 'email' ? 'بريد إلكتروني' :
                       customer.preferred_contact}
                    </span>
                  </div>
                ) : (
                  <span className={styles.noData}>-</span>
                )}
              </td>
              <td className={styles.ordersCount}>
                <span className={styles.countBadge}>{customer.total_orders || 0}</span>
              </td>
              <td className={styles.totalSpent}>
                {customer.total_spent ? (
                  <span className={styles.amount}>{customer.total_spent.toFixed(2)} د.ل</span>
                ) : (
                  <span className={styles.noData}>0.00 د.ل</span>
                )}
              </td>
              <td>
                {customer.last_order_date ? (
                  <span className={styles.date}>
                    {new Date(customer.last_order_date).toLocaleDateString('ar-LY')}
                  </span>
                ) : (
                  <span className={styles.noData}>-</span>
                )}
              </td>
              <td>
                {customer.is_active !== false ? (
                  <span className={`${styles.badge} ${styles.badgeActive}`}>نشط</span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeInactive}`}>غير نشط</span>
                )}
              </td>
              <td>
                <div className={styles.actions}>
                  <Link href={`/customers/${customer.id}`} className={styles.actionButton}>
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

