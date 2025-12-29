'use client'

import { useState, useEffect } from 'react'
import styles from './Sidebar.module.css'
import {
  HiHome,
  HiShoppingBag,
  HiCube,
  HiCurrencyDollar,
  HiTruck,
  HiUsers,
  HiExclamation,
  HiChartBar,
  HiCog,
  HiChevronDown,
  HiLibrary,
  HiMenu,
  HiX
} from 'react-icons/hi'

export default function Sidebar() {
  const [expandedSections, setExpandedSections] = useState({})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen, isMobile])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: HiHome,
      path: '/',
      children: null
    },
    {
      id: 'orders',
      label: 'الطلبات',
      icon: HiShoppingBag,
      children: [
        { label: 'جميع الطلبات', path: '/orders/all' },
        // { label: 'الطلبات المعلقة', path: '/orders/pending' },
        // { label: 'الطلبات المشكلة', path: '/orders/problem' },
        // { label: 'الطلبات المسلمة', path: '/orders/delivered' }
      ]
    },
    // {
    //   id: 'order-items',
    //   label: 'عناصر الطلب',
    //   icon: HiCube,
    //   children: [
    //     { label: 'العناصر المفقودة', path: '/order-items/missing' },
    //     { label: 'العناصر التالفة', path: '/order-items/damaged' }
    //   ]
    // },
    {
      id: 'payments',
      label: 'المدفوعات',
      icon: HiCurrencyDollar,
      children: [
        { label: 'الودائع', path: '/payments/deposits' },
        // { label: 'الأرصدة المعلقة', path: '/payments/pending' },
        // { label: 'المستردات', path: '/payments/refunds' },
        { label: 'المصروفات', path: '/payments/expenses' }
      ]
    },
    {
      id: 'financial',
      label: 'الأصول والمديونية',
      icon: HiLibrary,
      children: [
        { label: 'نظرة عامة', path: '/financial' },
        { label: 'جميع الحركات', path: '/financial/transactions' },
        { label: 'التقارير المالية', path: '/financial/reports' },
        { label: 'الإعدادات', path: '/financial/settings' }
      ]
    },
    // {
    //   id: 'shipping',
    //   label: 'الشحن',
    //   icon: HiTruck,
    //   children: [
    //     { label: 'الشحن الدولي', path: '/shipping/international' },
    //     { label: 'وصلت إلى ليبيا', path: '/shipping/arrived' },
    //     { label: 'التوصيل المحلي', path: '/shipping/local' }
    //   ]
    // },
    // {
    //   id: 'customers',
    //   label: 'العملاء',
    //   icon: HiUsers,
    //   children: [
    //     { label: 'جميع العملاء', path: '/customers/all' },
    //     { label: 'العملاء المتكررين', path: '/customers/frequent' }
    //   ]
    // },
    // {
    //   id: 'issues',
    //   label: 'المشاكل والمطالبات',
    //   icon: HiExclamation,
    //   children: [
    //     { label: 'المشاكل المفتوحة', path: '/issues/open' },
    //     { label: 'المشاكل المحلولة', path: '/issues/resolved' }
    //   ]
    // },
    // {
    //   id: 'reports',
    //   label: 'التقارير',
    //   icon: HiChartBar,
    //   children: [
    //     { label: 'ملخص يومي', path: '/reports/daily' },
    //     { label: 'الإيرادات الشهرية', path: '/reports/monthly' },
    //     { label: 'تقرير مشاكل الشحن', path: '/reports/shipping' }
    //   ]
    // },
    // {
    //   id: 'settings',
    //   label: 'الإعدادات',
    //   icon: HiCog,
    //   children: [
    //     { label: 'معلومات الشركة', path: '/settings/company' },
    //     { label: 'حسابات الموظفين', path: '/settings/staff' },
    //     { label: 'طرق الدفع', path: '/settings/payment-methods' }
    //   ]
    // }
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <HiX /> : <HiMenu />}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && isMobile && (
        <div 
          className={styles.overlay}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${isMobileMenuOpen && isMobile ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>واصل</h1>
          {isMobile && (
            <button 
              className={styles.closeButton}
              onClick={closeMobileMenu}
              aria-label="Close menu"
            >
              <HiX />
            </button>
          )}
        </div>
        
        <nav className={styles.nav}>
          <ul className={styles.menuList}>
            {menuItems.map((item) => {
              const IconComponent = item.icon
              return (
                <li key={item.id} className={styles.menuItem}>
                  {item.children ? (
                    <>
                      <button
                        className={styles.menuButton}
                        onClick={() => toggleSection(item.id)}
                        aria-expanded={expandedSections[item.id]}
                      >
                        <span className={styles.icon}>
                          <IconComponent />
                        </span>
                        <span className={styles.label}>{item.label}</span>
                        <span className={`${styles.arrow} ${expandedSections[item.id] ? styles.arrowOpen : ''}`}>
                          <HiChevronDown />
                        </span>
                      </button>
                      {expandedSections[item.id] && (
                        <ul className={styles.submenu}>
                          {item.children.map((child, index) => (
                            <li key={index} className={styles.submenuItem}>
                              <a 
                                href={child.path} 
                                className={styles.submenuLink}
                                onClick={closeMobileMenu}
                              >
                                {child.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <a 
                      href={item.path} 
                      className={styles.menuLink}
                      onClick={closeMobileMenu}
                    >
                      <span className={styles.icon}>
                        <IconComponent />
                      </span>
                      <span className={styles.label}>{item.label}</span>
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}

