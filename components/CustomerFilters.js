'use client'

import { useState } from 'react'
import styles from './CustomerFilters.module.css'
import { HiSearch, HiX } from 'react-icons/hi'

export default function CustomerFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    name: '',
    phone: '',
    email: '',
    preferredContact: '',
    isActive: '',
    minOrders: '',
    minSpent: ''
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
      name: '',
      phone: '',
      email: '',
      preferredContact: '',
      isActive: '',
      minOrders: '',
      minSpent: ''
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
          <label className={styles.label}>اسم العميل</label>
          <input
            type="text"
            className={styles.input}
            placeholder="أدخل اسم العميل"
            value={filters.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>رقم الهاتف</label>
          <input
            type="text"
            className={styles.input}
            placeholder="أدخل رقم الهاتف"
            value={filters.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>البريد الإلكتروني</label>
          <input
            type="email"
            className={styles.input}
            placeholder="أدخل البريد الإلكتروني"
            value={filters.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>طريقة التواصل المفضلة</label>
          <select
            className={styles.select}
            value={filters.preferredContact}
            onChange={(e) => handleChange('preferredContact', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="phone">هاتف</option>
            <option value="whatsapp">واتساب</option>
            <option value="facebook">فيسبوك</option>
            <option value="email">بريد إلكتروني</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>الحالة</label>
          <select
            className={styles.select}
            value={filters.isActive}
            onChange={(e) => handleChange('isActive', e.target.value)}
          >
            <option value="">الكل</option>
            <option value="true">نشط</option>
            <option value="false">غير نشط</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>الحد الأدنى لعدد الطلبات</label>
          <input
            type="number"
            className={styles.input}
            placeholder="0"
            min="0"
            value={filters.minOrders}
            onChange={(e) => handleChange('minOrders', e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>الحد الأدنى للمشتريات (د.ل)</label>
          <input
            type="number"
            className={styles.input}
            placeholder="0.00"
            min="0"
            step="0.01"
            value={filters.minSpent}
            onChange={(e) => handleChange('minSpent', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}



