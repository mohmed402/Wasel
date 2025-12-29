'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import {
  HiShoppingBag,
  HiCube,
  HiCurrencyDollar,
  HiTruck,
  HiExclamation
} from 'react-icons/hi'

export default function Home() {
  // Sample data - replace with real API calls
  const [stats, setStats] = useState({
    totalActiveOrders: 0,
    ordersWithMissingItems: 0,
    ordersWithUnpaidBalance: 0,
    ordersStuckInShipping: 0,
    totalDepositsToday: 0
  })

  useEffect(() => {
    // Fetch dashboard stats from API
    // For now using sample data
    setStats({
      totalActiveOrders: 45,
      ordersWithMissingItems: 8,
      ordersWithUnpaidBalance: 12,
      ordersStuckInShipping: 5,
      totalDepositsToday: 2500
    })
  }, [])

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>لوحة التحكم</h1>
        <p className={styles.subtitle}>مرحباً بك في نظام إدارة وسيل</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <HiShoppingBag />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>إجمالي الطلبات النشطة</h3>
            <p className={styles.statValue}>{stats.totalActiveOrders}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.warningIcon}`}>
            <HiCube />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>الطلبات بعناصر مفقودة</h3>
            <p className={`${styles.statValue} ${styles.warningValue}`}>
              {stats.ordersWithMissingItems}
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.errorIcon}`}>
            <HiCurrencyDollar />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>الطلبات برصيد غير مدفوع</h3>
            <p className={`${styles.statValue} ${styles.errorValue}`}>
              {stats.ordersWithUnpaidBalance}
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.warningIcon}`}>
            <HiTruck />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>الطلبات عالقة في الشحن</h3>
            <p className={`${styles.statValue} ${styles.warningValue}`}>
              {stats.ordersStuckInShipping}
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.successIcon}`}>
            <HiCurrencyDollar />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statLabel}>إجمالي الودائع المستلمة اليوم</h3>
            <p className={`${styles.statValue} ${styles.successValue}`}>
              {stats.totalDepositsToday} د.ل
            </p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>نظرة سريعة</h2>
          <p className={styles.sectionText}>
            استخدم القائمة الجانبية للتنقل بين أقسام النظام المختلفة.
          </p>
        </div>
      </div>
    </div>
  )
}

