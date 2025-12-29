'use client'

import { useState } from 'react'
import styles from './PaymentFilters.module.css'
import { HiSearch, HiX } from 'react-icons/hi'

export default function PaymentFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    orderId: '',
    customerName: '',
    dateFrom: '',
    dateTo: '',
    paymentMethod: '',
    paymentStatus: '',
    staffMember: ''
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
      paymentMethod: '',
      paymentStatus: '',
      staffMember: ''
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
          <label className={styles.label}>طريقة الدفع</label>
          <select
            className={styles.select}
            value={filters.paymentMethod}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="cash">نقدي</option>
            <option value="transfer">تحويل</option>
            <option value="bank">بنكي</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>حالة الدفع</label>
          <select
            className={styles.select}
            value={filters.paymentStatus}
            onChange={(e) => handleChange('paymentStatus', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="pending">معلق</option>
            <option value="received">مستلم</option>
            <option value="completed">مكتمل</option>
            <option value="refunded">مسترد</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>استلم من قبل</label>
          <select
            className={styles.select}
            value={filters.staffMember}
            onChange={(e) => handleChange('staffMember', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="staff1">محمد علي</option>
            <option value="staff2">فاطمة أحمد</option>
            <option value="staff3">خالد حسن</option>
          </select>
        </div>
      </div>
    </div>
  )
}




