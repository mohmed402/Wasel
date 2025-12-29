'use client'

import { useState } from 'react'
import styles from './OrderFilters.module.css'
import { HiSearch, HiX } from 'react-icons/hi'

export default function OrderFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    orderId: '',
    customerName: '',
    dateFrom: '',
    dateTo: '',
    orderStatus: '',
    depositStatus: '',
    shippingStage: '',
    hasIssues: ''
  })

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)
    if (onFilterChange) {
      onFilterChange(newFilters)
    }
  }

  const handleReset = () => {
    const resetFilters = {
      orderId: '',
      customerName: '',
      dateFrom: '',
      dateTo: '',
      orderStatus: '',
      depositStatus: '',
      shippingStage: '',
      hasIssues: ''
    }
    setFilters(resetFilters)
    if (onFilterChange) {
      onFilterChange(resetFilters)
    }
  }

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersHeader}>
        <h3 className={styles.filtersTitle}>
          <HiSearch className={styles.searchIcon} />
          البحث والتصفية
        </h3>
        <button onClick={handleReset} className={styles.resetButton}>
          <HiX />
          إعادة تعيين
        </button>
      </div>

      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>رقم الطلب</label>
          <input
            type="text"
            className={styles.input}
            placeholder="أدخل رقم الطلب"
            value={filters.orderId}
            onChange={(e) => handleChange('orderId', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>اسم العميل / الهاتف</label>
          <input
            type="text"
            className={styles.input}
            placeholder="اسم العميل أو رقم الهاتف"
            value={filters.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>من تاريخ</label>
          <input
            type="date"
            className={styles.input}
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>إلى تاريخ</label>
          <input
            type="date"
            className={styles.input}
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>حالة الطلب</label>
          <select
            className={styles.select}
            value={filters.orderStatus}
            onChange={(e) => handleChange('orderStatus', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="pending">معلق</option>
            <option value="processing">تم الطلب </option>
            <option value="shipping">قيد الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>حالة الدفعة</label>
          <select
            className={styles.select}
            value={filters.depositStatus}
            onChange={(e) => handleChange('depositStatus', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="paid">مدفوع</option>
            <option value="unpaid">غير مدفوع</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>مرحلة الشحن</label>
          <select
            className={styles.select}
            value={filters.shippingStage}
            onChange={(e) => handleChange('shippingStage', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="international">الشحن الدولي</option>
            <option value="arrived">وصلت إلى ليبيا</option>
            <option value="local">التوصيل المحلي</option>
            <option value="delivered">تم التسليم</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>يحتوي على مشاكل</label>
          <select
            className={styles.select}
            value={filters.hasIssues}
            onChange={(e) => handleChange('hasIssues', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="yes">نعم</option>
            <option value="no">لا</option>
          </select>
        </div>
      </div>
    </div>
  )
}




