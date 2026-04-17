'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CustomerSiteHeader from '../CustomerSiteHeader'
import { getSession, clearSession, authHeaders } from '../auth'
import { getBasket } from '../basket-storage'
import styles from './dashboard.module.css'

const STATUS_MAP = {
  pending:    { label: 'قيد الانتظار',  color: '#f59e0b', dot: '#f59e0b' },
  processing: { label: 'قيد المعالجة', color: '#60a5fa', dot: '#60a5fa' },
  purchased:  { label: 'تم الشراء',     color: '#a78bfa', dot: '#a78bfa' },
  shipping:   { label: 'قيد الشحن',    color: '#34d399', dot: '#34d399' },
  delivered:  { label: 'تم التوصيل',   color: '#08af66', dot: '#08af66' },
  cancelled:  { label: 'ملغي',          color: '#f87171', dot: '#f87171' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: '#e8e8ea', dot: '#e8e8ea' }
  return (
    <span className={styles.statusBadge} style={{ '--dot': s.dot, '--col': s.color }}>
      <span className={styles.statusDot} aria-hidden />
      {s.label}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatLyd(n) {
  return (n == null || isNaN(n) ? '0.00' : Number(n).toFixed(2))
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [session, setSessionState] = useState(null)
  const [tab, setTab] = useState('overview') // 'overview' | 'orders' | 'wallet'

  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [wallet, setWallet] = useState(null)
  const [walletTxs, setWalletTxs] = useState([])

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [basketCount, setBasketCount] = useState(0)
  const ordersFetchInFlight = useRef(false)
  const walletFetchInFlight = useRef(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.replace('/customer/login'); return }
    setSessionState(s)
    setBasketCount(getBasket().items.reduce((n, i) => n + (i.quantity || 0), 0))
  }, [router])

  const fetchProfile = useCallback(async (s) => {
    setLoadingProfile(true)
    setProfileError('')
    try {
      const res = await fetch('/api/customer/me', { headers: authHeaders() })
      if (res.status === 401) { clearSession(); router.replace('/customer/login'); return }
      const data = await res.json()
      if (res.ok) setProfile(data.customer)
      else setProfileError(data.error || 'تعذر تحميل البيانات')
    } catch {
      setProfileError('حدث خطأ في الاتصال')
    } finally {
      setLoadingProfile(false)
    }
  }, [router])

  useEffect(() => {
    if (session) fetchProfile(session)
  }, [session, fetchProfile])

  const fetchOrders = useCallback(async () => {
    if (ordersFetchInFlight.current) return
    ordersFetchInFlight.current = true
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/customer/orders', { headers: authHeaders() })
      if (res.status === 401) { clearSession(); router.replace('/customer/login'); return }
      const data = await res.json()
      if (res.ok) setOrders(data.orders || [])
    } catch {} finally {
      ordersFetchInFlight.current = false
      setLoadingOrders(false)
    }
  }, [router])

  const fetchWallet = useCallback(async () => {
    if (walletFetchInFlight.current) return
    walletFetchInFlight.current = true
    setLoadingWallet(true)
    try {
      const res = await fetch('/api/customer/wallet', { headers: authHeaders() })
      if (res.status === 401) { clearSession(); router.replace('/customer/login'); return }
      const data = await res.json()
      if (res.ok) { setWallet(data.wallet); setWalletTxs(data.transactions || []) }
    } catch {} finally {
      walletFetchInFlight.current = false
      setLoadingWallet(false)
    }
  }, [router])

  useEffect(() => {
    if (!session) return
    if (tab === 'orders' || tab === 'overview') {
      if (orders.length === 0) fetchOrders()
    }
    if (tab === 'wallet' || tab === 'overview') {
      if (!wallet) fetchWallet()
    }
  }, [session, tab, orders.length, wallet, fetchOrders, fetchWallet])

  const handleLogout = () => {
    clearSession()
    router.replace('/')
  }

  if (!session) return null

  const displayName = profile?.name || session.name || 'عميل'

  return (
    <div className={styles.page}>
      <CustomerSiteHeader basketCount={basketCount} />

      <div className={styles.shell}>
        {/* ── Sidebar ── */}
        <aside className={styles.sidebar}>
          <div className={styles.avatarBlock}>
            <div className={styles.avatar}>
              {displayName.charAt(0)}
            </div>
            <div className={styles.avatarInfo}>
              <span className={styles.avatarName}>{displayName}</span>
              <span className={styles.avatarPhone}>{session.phone || profile?.phone || ''}</span>
            </div>
          </div>

          <nav className={styles.sideNav} aria-label="القائمة الجانبية">
            {[
              { id: 'overview', label: 'نظرة عامة', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              )},
              { id: 'orders', label: 'طلباتي', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              )},
              { id: 'wallet', label: 'المحفظة', icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/></svg>
              )},
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                className={`${styles.sideNavItem} ${tab === id ? styles.sideNavItemActive : ''}`}
                onClick={() => setTab(id)}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>

          <div className={styles.sideFooter}>
            <Link href="/customer/basket" className={styles.sideAction}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              سلة المشتريات
            </Link>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className={styles.content}>
          {loadingProfile && (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
              <p>جاري التحميل...</p>
            </div>
          )}

          {profileError && (
            <div className={styles.errorBanner}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {profileError}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && !loadingProfile && (
            <div className={styles.tabContent}>
              <h2 className={styles.tabTitle}>
                أهلاً، {displayName} 👋
              </h2>

              <div className={styles.statCards}>
                {/* Wallet balance */}
                <div className={styles.statCard} onClick={() => setTab('wallet')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('wallet')}>
                  <div className={styles.statCardIcon} style={{ background: 'rgba(8,175,102,0.15)', color: '#08af66' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/></svg>
                  </div>
                  <div className={styles.statCardBody}>
                    <span className={styles.statCardLabel}>رصيد المحفظة</span>
                    <span className={styles.statCardValue}>
                      {loadingWallet ? '...' : `${formatLyd(wallet?.balance ?? 0)} ${wallet?.currency || 'د.ل'}`}
                    </span>
                  </div>
                  <svg className={styles.statCardArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
                </div>

                {/* Orders count */}
                <div className={styles.statCard} onClick={() => setTab('orders')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setTab('orders')}>
                  <div className={styles.statCardIcon} style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  </div>
                  <div className={styles.statCardBody}>
                    <span className={styles.statCardLabel}>عدد الطلبات</span>
                    <span className={styles.statCardValue}>
                      {loadingOrders ? '...' : orders.length}
                    </span>
                  </div>
                  <svg className={styles.statCardArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><polyline points="9 18 15 12 9 6"/></svg>
                </div>

                {/* Active orders */}
                <div className={styles.statCard}>
                  <div className={styles.statCardIcon} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/></svg>
                  </div>
                  <div className={styles.statCardBody}>
                    <span className={styles.statCardLabel}>طلبات قيد التنفيذ</span>
                    <span className={styles.statCardValue}>
                      {loadingOrders ? '...' : orders.filter((o) => !['delivered','cancelled'].includes(o.status)).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent orders */}
              {orders.length > 0 && (
                <div className={styles.recentSection}>
                  <div className={styles.recentHead}>
                    <h3 className={styles.recentTitle}>آخر الطلبات</h3>
                    <button type="button" className={styles.seeAllBtn} onClick={() => setTab('orders')}>
                      عرض الكل
                    </button>
                  </div>
                  <div className={styles.ordersList}>
                    {orders.slice(0, 3).map((o) => (
                      <OrderRow key={o.id} order={o} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === 'orders' && (
            <div className={styles.tabContent}>
              <h2 className={styles.tabTitle}>طلباتي</h2>
              {loadingOrders ? (
                <div className={styles.loadingState}>
                  <div className={styles.loadingSpinner} />
                  <p>جاري تحميل الطلبات...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden style={{ color: 'rgba(232,232,234,0.2)' }}>
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  <p>لا يوجد طلبات حتى الآن.</p>
                  <Link href="/" className={styles.emptyAction}>ابدأ طلبك الأول</Link>
                </div>
              ) : (
                <div className={styles.ordersList}>
                  {orders.map((o) => <OrderRow key={o.id} order={o} expanded />)}
                </div>
              )}
            </div>
          )}

          {/* ── WALLET ── */}
          {tab === 'wallet' && (
            <div className={styles.tabContent}>
              <h2 className={styles.tabTitle}>المحفظة</h2>
              {loadingWallet ? (
                <div className={styles.loadingState}>
                  <div className={styles.loadingSpinner} />
                  <p>جاري تحميل المحفظة...</p>
                </div>
              ) : (
                <>
                  <div className={styles.walletCard}>
                    <div className={styles.walletCardGlow} aria-hidden />
                    <div className={styles.walletLabel}>الرصيد المتاح</div>
                    <div className={styles.walletBalance}>
                      {formatLyd(wallet?.balance ?? 0)}
                      <span className={styles.walletCurrency}>{wallet?.currency || 'د.ل'}</span>
                    </div>
                    <div className={styles.walletNote}>
                      يمكنك استخدام الرصيد في طلباتك القادمة.
                    </div>
                  </div>

                  <div className={styles.txSection}>
                    <h3 className={styles.txTitle}>سجل المعاملات</h3>
                    {walletTxs.length === 0 ? (
                      <div className={styles.emptyState} style={{ padding: '2rem 1rem' }}>
                        <p style={{ margin: 0 }}>لا توجد معاملات بعد.</p>
                      </div>
                    ) : (
                      <div className={styles.txList}>
                        {walletTxs.map((tx) => (
                          <div key={tx.id} className={styles.txRow}>
                            <div className={styles.txIcon} style={{ color: tx.amount > 0 ? '#08af66' : '#f87171', background: tx.amount > 0 ? 'rgba(8,175,102,0.1)' : 'rgba(248,113,113,0.1)' }}>
                              {tx.amount > 0 ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                              )}
                            </div>
                            <div className={styles.txInfo}>
                              <span className={styles.txType}>{TX_TYPE_LABELS[tx.tx_type] || tx.tx_type}</span>
                              {tx.reference_id && <span className={styles.txRef}>{tx.reference_id}</span>}
                              <span className={styles.txDate}>{formatDate(tx.created_at)}</span>
                            </div>
                            <div className={styles.txAmount} style={{ color: tx.amount > 0 ? '#08af66' : '#f87171' }}>
                              {tx.amount > 0 ? '+' : ''}{formatLyd(tx.amount)} د.ل
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const TX_TYPE_LABELS = {
  deposit:    'إيداع',
  order_pay:  'دفع طلب',
  refund:     'استرداد',
  adjustment: 'تعديل',
  bonus:      'مكافأة',
}

function OrderRow({ order, expanded = false }) {
  const [open, setOpen] = useState(false)
  const ref = order.internal_ref || order.id
  const itemCount = order.order_items?.length ?? 0

  return (
    <div className={styles.orderRow}>
      <div className={styles.orderRowHead} onClick={() => setOpen((v) => !v)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}>
        <div className={styles.orderRowLeft}>
          <span className={styles.orderRef} dir="ltr">{ref}</span>
          <StatusBadge status={order.status} />
        </div>
        <div className={styles.orderRowRight}>
          <span className={styles.orderAmount}>{formatLyd(order.total_amount)} د.ل</span>
          <span className={styles.orderDate}>{formatDate(order.order_date || order.created_at)}</span>
          <svg
            className={`${styles.orderChevron} ${open ? styles.orderChevronOpen : ''}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {open && (
        <div className={styles.orderRowBody}>
          {order.order_items && order.order_items.length > 0 ? (
            <ul className={styles.orderItemsList}>
              {order.order_items.map((item, i) => (
                <li key={i} className={styles.orderItem}>
                  <span className={styles.orderItemName}>{item.name || 'منتج'}</span>
                  <span className={styles.orderItemMeta}>
                    {item.quantity} × {formatLyd(item.selling_price ?? item.unit_price ?? 0)} د.ل
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.orderNoItems}>لا توجد تفاصيل أصناف.</p>
          )}
          {order.notes && (
            <p className={styles.orderNotes}>{order.notes}</p>
          )}
          <div className={styles.orderActions}>
            <Link
              href={`/customer/track?ref=${encodeURIComponent(ref)}`}
              className={styles.orderTrackBtn}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              تتبع الطلب
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
