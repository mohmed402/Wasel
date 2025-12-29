'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CustomerFilters from '../../../components/CustomerFilters'
import CustomersTable from '../../../components/CustomersTable'
import styles from '../customers.module.css'
import { HiUsers, HiDownload, HiRefresh, HiPlus } from 'react-icons/hi'

export default function AllCustomersPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({})
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // Sample data - replace with real API call
  useEffect(() => {
    // TODO: Replace with actual API call to fetch customers
    // const fetchCustomers = async () => {
    //   try {
    //     const { customer } = require('../../../server/supabase')
    //     const data = await customer.getAll({ activeOnly: false })
    //     setCustomers(data)
    //   } catch (error) {
    //     console.error('Error fetching customers:', error)
    //   } finally {
    //     setLoading(false)
    //   }
    // }
    // fetchCustomers()

    // Sample data for now
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
          id: 2,
          name: 'فاطمة علي',
          phone: '0923456789',
          email: 'fatima.ali@example.com',
          address: 'بنغازي، حي السلماني',
          preferred_contact: 'phone',
          total_orders: 3,
          total_spent: 680.00,
          last_order_date: '2024-01-15',
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
          id: 4,
          name: 'سارة أحمد',
          phone: '0945678901',
          email: 'sara.ahmed@example.com',
          address: null,
          preferred_contact: 'email',
          total_orders: 2,
          total_spent: 450.00,
          last_order_date: '2024-01-10',
          is_active: true
        },
        {
          id: 5,
          name: 'محمد يوسف',
          phone: '0956789012',
          email: 'mohammed.youssef@example.com',
          address: 'طرابلس، حي الأندلس',
          preferred_contact: 'whatsapp',
          total_orders: 0,
          total_spent: 0.00,
          last_order_date: null,
          is_active: false
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
    console.log('Exporting customers...')
  }

  const handleAddCustomer = () => {
    // TODO: Navigate to add customer page or open modal
    console.log('Add new customer')
  }

  const handleRefresh = () => {
    setLoading(true)
    // TODO: Refetch customers from API
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }

  // Calculate stats
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.is_active !== false).length
  const customersWithOrders = customers.filter(c => (c.total_orders || 0) > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0)

  return (
    <div className={styles.customersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiUsers className={styles.titleIcon} />
            العملاء
          </h1>
          <p className={styles.pageSubtitle}>إدارة جميع العملاء في النظام</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleAddCustomer} className={styles.addButton}>
            <HiPlus />
            إضافة عميل جديد
          </button>
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
          className={`${styles.tab} ${styles.tabActive}`}
        >
          جميع العملاء
        </Link>
        <Link
          href="/customers/frequent"
          className={styles.tab}
        >
          العملاء المتكررين
        </Link>
      </div>

      <CustomerFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي العملاء:</span>
          <span className={styles.statValue}>{totalCustomers}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>العملاء النشطون:</span>
          <span className={styles.statValue}>{activeCustomers}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>عملاء لديهم طلبات:</span>
          <span className={styles.statValue}>{customersWithOrders}</span>
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



