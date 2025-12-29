'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CustomerFilters from '../../../components/CustomerFilters'
import CustomersTable from '../../../components/CustomersTable'
import styles from '../customers.module.css'
import { HiUsers, HiStar, HiDownload, HiRefresh, HiInformationCircle } from 'react-icons/hi'

export default function FrequentCustomersPage() {
  const [filters, setFilters] = useState({})
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // Sample data - replace with real API call
  useEffect(() => {
    // TODO: Replace with actual API call to fetch frequent customers
    // Filter customers with total_orders >= 3 or total_spent >= 1000
    // const fetchFrequentCustomers = async () => {
    //   try {
    //     const { customer } = require('../../../server/supabase')
    //     const allCustomers = await customer.getAll({ activeOnly: true })
    //     const frequent = allCustomers.filter(
    //       c => (c.total_orders || 0) >= 3 || (c.total_spent || 0) >= 1000
    //     )
    //     setCustomers(frequent)
    //   } catch (error) {
    //     console.error('Error fetching frequent customers:', error)
    //   } finally {
    //     setLoading(false)
    //   }
    // }
    // fetchFrequentCustomers()

    // Sample data for frequent customers (3+ orders or 1000+ spent)
    setTimeout(() => {
      setCustomers([
        {
          id: 1,
          name: 'أحمد محمد علي',
          phone: '0912345678',
          email: 'ahmed.mohammed@example.com',
          address: 'طرابلس، شارع الجمهورية، بناية رقم 15',
          preferred_contact: 'whatsapp',
          total_orders: 5,
          total_spent: 1250.00,
          last_order_date: '2024-01-20',
          is_active: true
        },
        {
          id: 3,
          name: 'خالد حسن',
          phone: '0934567890',
          email: null,
          address: 'مصراتة، شارع البحر',
          preferred_contact: 'facebook',
          total_orders: 8,
          total_spent: 2100.00,
          last_order_date: '2024-01-22',
          is_active: true
        },
        {
          id: 6,
          name: 'ليلى محمود',
          phone: '0967890123',
          email: 'laila.mahmoud@example.com',
          address: 'طرابلس، حي الأندلس',
          preferred_contact: 'whatsapp',
          total_orders: 4,
          total_spent: 980.00,
          last_order_date: '2024-01-18',
          is_active: true
        },
        {
          id: 7,
          name: 'يوسف سالم',
          phone: '0978901234',
          email: 'youssef.salem@example.com',
          address: 'بنغازي، شارع جمال عبد الناصر',
          preferred_contact: 'phone',
          total_orders: 6,
          total_spent: 1500.00,
          last_order_date: '2024-01-21',
          is_active: true
        }
      ])
      setLoading(false)
    }, 500)
  }, [])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    // Apply filters to customers here
    // TODO: Implement filtering logic
  }

  const handleExport = () => {
    // Export functionality
    console.log('Exporting frequent customers...')
  }

  const handleRefresh = () => {
    setLoading(true)
    // TODO: Refetch customers from API
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }

  // Calculate stats
  const totalFrequent = customers.length
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0)
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)
  const avgOrdersPerCustomer = totalFrequent > 0 ? (totalOrders / totalFrequent).toFixed(1) : 0

  return (
    <div className={styles.customersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiStar className={styles.titleIcon} />
            العملاء المتكررين
          </h1>
          <p className={styles.pageSubtitle}>
            العملاء الذين لديهم 3 طلبات أو أكثر أو مشتريات تزيد عن 1000 د.ل
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleExport} className={styles.exportButton}>
            <HiDownload />
            تصدير (Excel)
          </button>
          <button onClick={handleRefresh} className={styles.refreshButton}>
            <HiRefresh />
            تحديث
          </button>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <Link
          href="/customers/all"
          className={styles.tab}
        >
          جميع العملاء
        </Link>
        <Link
          href="/customers/frequent"
          className={`${styles.tab} ${styles.tabActive}`}
        >
          العملاء المتكررين
        </Link>
      </div>

      <div className={styles.infoBox}>
        <HiInformationCircle className={styles.infoIcon} />
        <div>
          <strong>ما هي معايير العميل المتكرر؟</strong>
          <p>
            العملاء الذين لديهم 3 طلبات أو أكثر، أو إجمالي مشتريات تزيد عن 1000 دينار ليبي.
            هؤلاء العملاء هم الأكثر قيمة ويستحقون اهتماماً خاصاً.
          </p>
        </div>
      </div>

      <CustomerFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>عدد العملاء المتكررين:</span>
          <span className={styles.statValue}>{totalFrequent}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي الطلبات:</span>
          <span className={styles.statValue}>{totalOrders}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>متوسط الطلبات لكل عميل:</span>
          <span className={styles.statValue}>{avgOrdersPerCustomer}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي الإيرادات:</span>
          <span className={styles.statValue}>{totalRevenue.toFixed(2)} د.ل</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>جاري التحميل...</p>
        </div>
      ) : (
        <CustomersTable customers={customers} />
      )}
    </div>
  )
}

