'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { HiRefresh, HiExternalLink, HiTrash, HiPlus, HiClipboardCopy } from 'react-icons/hi'
import ordersStyles from '../orders.module.css'
import sp from './shein-purchase.module.css'
import { convertToBaseAmount } from '../../lib/financialDisplay'

const BASE = 'LYD'
const OUTCOMES = [
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'purchased', label: 'تم الشراء' },
  { id: 'partial_oos', label: 'نقص مخزون جزئي' },
  { id: 'failed', label: 'فشل' },
  { id: 'skipped', label: 'تخطي' },
]

function computeOrderTotals(order, toLYD) {
  let usd = 0
  const other = {}
  let lyd = 0
  for (const it of order.items || []) {
    const cur = String(it.currency || 'USD').toUpperCase()
    const qty = parseInt(it.quantity, 10) || 1
    const line = (parseFloat(it.unit_price) || 0) * qty
    if (cur === 'USD') usd += line
    else other[cur] = (other[cur] || 0) + line
    lyd += convertToBaseAmount(line, cur, BASE, toLYD)
  }
  return { usd, other, lyd }
}

function computeSelectionTotals(orders, selectedIds, toLYD) {
  const set = new Set(selectedIds)
  let usd = 0
  const other = {}
  let lyd = 0
  for (const o of orders) {
    if (!set.has(o.id)) continue
    const t = computeOrderTotals(o, toLYD)
    usd += t.usd
    lyd += t.lyd
    for (const [c, v] of Object.entries(t.other)) {
      other[c] = (other[c] || 0) + v
    }
  }
  return { usd, other, lyd }
}

function computeBatchOutcomeTotals(batch, outcomeState, toLYD) {
  if (!batch?.batch_orders?.length) return { lyd: 0, byCurrency: {} }
  let lyd = 0
  const byCurrency = {}
  for (const line of batch.batch_orders) {
    const st = outcomeState[line.order_id]
    if (!st) continue
    if (st.outcome !== 'purchased' && st.outcome !== 'partial_oos') continue
    const oos = st.outcome === 'partial_oos' ? new Set(st.oos || []) : new Set()
    for (const it of line.items || []) {
      if (oos.has(it.id)) continue
      const cur = String(it.currency || 'USD').toUpperCase()
      const qty = parseInt(it.quantity, 10) || 1
      const amount = (parseFloat(it.unit_price) || 0) * qty
      byCurrency[cur] = (byCurrency[cur] || 0) + amount
      lyd += convertToBaseAmount(amount, cur, BASE, toLYD)
    }
  }
  return { lyd, byCurrency }
}

export default function SheinPurchasePage() {
  const [tab, setTab] = useState('buy')
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [toLYD, setToLYD] = useState({ LYD: 1, USD: 6, EUR: 6.5, GBP: 8, TRY: 0.2 })
  const [registryPayment, setRegistryPayment] = useState([])
  const [registryVoucher, setRegistryVoucher] = useState([])
  const [batch, setBatch] = useState(null)
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [voucherAccountId, setVoucherAccountId] = useState('')
  const [ackMissingBaskets, setAckMissingBaskets] = useState(false)
  const [applyPurchaseFields, setApplyPurchaseFields] = useState(false)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [voucherAmount, setVoucherAmount] = useState('')

  const [showAddRegistry, setShowAddRegistry] = useState(false)
  const [assetAccounts, setAssetAccounts] = useState([])
  const [regFormAccount, setRegFormAccount] = useState('')
  const [regFormRole, setRegFormRole] = useState('shein_payment')

  const showBanner = (type, message) => {
    setBanner({ type, message })
    if (type === 'success') {
      setTimeout(() => setBanner(null), 4000)
    }
  }

  const loadFx = useCallback(async () => {
    try {
      const res = await fetch('/api/financial/exchange-rates')
      if (res.ok) {
        const d = await res.json()
        if (d.toLYD && typeof d.toLYD === 'object') {
          setToLYD((prev) => ({ ...prev, ...d.toLYD }))
        }
      }
    } catch (e) {
      console.warn(e)
    }
  }, [])

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const params = new URLSearchParams({
        order_source: 'shein',
        limit: '200',
      })
      if (statusFilter && String(statusFilter).trim()) params.set('status', statusFilter)
      const res = await fetch(`/api/orders?${params}`)
      if (!res.ok) throw new Error('تعذر تحميل الطلبات')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      showBanner('error', e.message || 'خطأ في تحميل الطلبات')
    } finally {
      setLoadingOrders(false)
    }
  }, [statusFilter])

  const loadRegistry = useCallback(async () => {
    try {
      const [rp, rv] = await Promise.all([
        fetch('/api/shein/registry?role=shein_payment'),
        fetch('/api/shein/registry?role=shein_voucher'),
      ])
      setRegistryPayment(rp.ok ? await rp.json() : [])
      setRegistryVoucher(rv.ok ? await rv.json() : [])
    } catch (e) {
      console.warn(e)
    }
  }, [])

  useEffect(() => {
    loadFx()
  }, [loadFx])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    loadRegistry()
  }, [loadRegistry])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectionTotals = useMemo(
    () => computeSelectionTotals(orders, selectedIds, toLYD),
    [orders, selectedIds, toLYD]
  )

  const batchTotals = useMemo(() => {
    if (!batch?.batch_orders?.length) return { usd: 0, other: {}, lyd: 0 }
    let usd = 0
    const other = {}
    let lyd = 0
    for (const line of batch.batch_orders) {
      for (const it of line.items || []) {
        const cur = String(it.currency || 'USD').toUpperCase()
        const qty = parseInt(it.quantity, 10) || 1
        const amt = (parseFloat(it.unit_price) || 0) * qty
        if (cur === 'USD') usd += amt
        else other[cur] = (other[cur] || 0) + amt
        lyd += convertToBaseAmount(amt, cur, BASE, toLYD)
      }
    }
    return { usd, other, lyd }
  }, [batch?.batch_orders, toLYD])

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.includes(o.id)),
    [orders, selectedIds]
  )

  const missingBasketCount = useMemo(() => {
    if (batch?.batch_orders?.length) {
      return batch.batch_orders.filter(
        (l) => !l.order?.basket_link || !String(l.order.basket_link).trim()
      ).length
    }
    return selectedOrders.filter((o) => !o.basket_link || !String(o.basket_link).trim()).length
  }, [selectedOrders, batch?.batch_orders])

  const displayTotals = batch?.batch_orders?.length ? batchTotals : selectionTotals

  const canConfirm =
    batch?.status === 'draft' &&
    paymentAccountId &&
    (!missingBasketCount || ackMissingBaskets)

  const startDraft = async () => {
    if (selectedIds.length === 0) {
      showBanner('error', 'اختر طلباً واحداً على الأقل')
      return
    }
    setBusy(true)
    setBanner(null)
    try {
      const res = await fetch('/api/shein/purchase-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'فشل إنشاء الدفعة')
      setBatch(data)
      setAckMissingBaskets(false)
      showBanner('success', 'تم إنشاء مسودة الدفعة. أكمل اختيار الحسابات ثم التأكيد.')
    } catch (e) {
      showBanner('error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const confirmBatch = async () => {
    if (!batch?.id) return
    if (!paymentAccountId) {
      showBanner('error', 'اختر حساب الدفع')
      return
    }
    if (missingBasketCount > 0 && !ackMissingBaskets) {
      showBanner('error', 'أكد الإقرار بوجود روابط سلة ناقصة أو أصلح الروابط')
      return
    }
    setBusy(true)
    setBanner(null)
    try {
      const fxPayload = { toLYD }
      const res = await fetch(`/api/shein/purchase-batches/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_account_id: paymentAccountId,
          voucher_account_id: voucherAccountId || null,
          total_usd: batchTotals.usd,
          total_lyd: batchTotals.lyd,
          fx_json: fxPayload,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'فشل التأكيد')
      setBatch(data)
      showBanner('success', 'تم تأكيد الدفعة. سجّل نتيجة كل طلب أدناه.')
    } catch (e) {
      showBanner('error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const refreshBatch = async () => {
    if (!batch?.id) return
    try {
      const res = await fetch(`/api/shein/purchase-batches/${batch.id}`)
      if (res.ok) setBatch(await res.json())
    } catch (_) {}
  }

  const [outcomeState, setOutcomeState] = useState({})
  const outcomeTotals = useMemo(
    () => computeBatchOutcomeTotals(batch, outcomeState, toLYD),
    [batch, outcomeState, toLYD]
  )
  const splitPayment = parseFloat(paymentAmount || '0') || 0
  const splitVoucher = parseFloat(voucherAmount || '0') || 0
  const splitDiff = outcomeTotals.lyd - (splitPayment + splitVoucher)

  useEffect(() => {
    if (!batch?.batch_orders) return
    const next = {}
    for (const line of batch.batch_orders) {
      const oid = line.order_id
      const oosRaw = line.oos_item_ids
      const oosArr = Array.isArray(oosRaw) ? oosRaw : typeof oosRaw === 'string' ? [] : []
      next[oid] = {
        outcome: line.outcome || 'pending',
        notes: line.notes || '',
        oos: new Set(oosArr.filter(Boolean)),
      }
    }
    setOutcomeState(next)
  }, [batch?.id, batch?.status, batch?.updated_at, batch?.batch_orders?.length])

  useEffect(() => {
    if (!batch || batch.status !== 'confirmed') return
    if ((paymentAmount || '') !== '' || (voucherAmount || '') !== '') return
    const initial = outcomeTotals.lyd > 0 ? outcomeTotals.lyd.toFixed(2) : ''
    setPaymentAmount(initial)
    setVoucherAmount('')
  }, [batch?.id, batch?.status, outcomeTotals.lyd, paymentAmount, voucherAmount])

  const setOutcome = (orderId, field, value) => {
    setOutcomeState((prev) => {
      const cur = prev[orderId] || { outcome: 'pending', notes: '', oos: new Set() }
      if (field === 'outcome') {
        return { ...prev, [orderId]: { ...cur, outcome: value } }
      }
      if (field === 'notes') {
        return { ...prev, [orderId]: { ...cur, notes: value } }
      }
      return prev
    })
  }

  const toggleOos = (orderId, itemId) => {
    setOutcomeState((prev) => {
      const cur = prev[orderId] || { outcome: 'partial_oos', notes: '', oos: new Set() }
      const oos = new Set(cur.oos)
      if (oos.has(itemId)) oos.delete(itemId)
      else oos.add(itemId)
      return { ...prev, [orderId]: { ...cur, oos } }
    })
  }

  const saveOutcomes = async () => {
    if (!batch?.id || batch.status !== 'confirmed') return
    const updates = []
    for (const line of batch.batch_orders || []) {
      const oid = line.order_id
      const st = outcomeState[oid]
      if (!st) continue
      const oosArr = st.outcome === 'partial_oos' ? [...(st.oos || [])] : undefined
      if (st.outcome === 'partial_oos' && oosArr.length === 0) {
        showBanner('error', `اختر عناصر نفد مخزونها للطلب ${line.order?.internal_ref || oid}`)
        return
      }
      updates.push({
        order_id: oid,
        outcome: st.outcome,
        notes: st.notes || undefined,
        oos_item_ids: oosArr,
      })
    }
    setBusy(true)
    setBanner(null)
    try {
      const hasVoucher = Boolean(voucherAccountId)
      if (splitPayment < 0 || splitVoucher < 0) {
        throw new Error('مبالغ التقسيم يجب أن تكون أكبر من أو تساوي الصفر')
      }
      if (!hasVoucher && splitVoucher > 0.0001) {
        throw new Error('لا يمكن استخدام مبلغ القسيمة بدون اختيار حساب قسيمة')
      }
      if (Math.abs(splitDiff) > 0.01) {
        throw new Error(`مجموع التقسيم لا يساوي إجمالي المشتريات (${outcomeTotals.lyd.toFixed(2)} د.ل)`)
      }
      const res = await fetch(`/api/shein/purchase-batches/${batch.id}/orders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          applyPurchaseFields,
          split: { payment_amount: splitPayment, voucher_amount: splitVoucher },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'فشل الحفظ')
      setBatch(data)
      showBanner('success', 'تم حفظ النتائج')
    } catch (e) {
      showBanner('error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const resetBatch = () => {
    setBatch(null)
    setPaymentAccountId('')
    setVoucherAccountId('')
    setAckMissingBaskets(false)
    setOutcomeState({})
    setPaymentAmount('')
    setVoucherAmount('')
  }

  const openAddRegistry = async () => {
    setShowAddRegistry(true)
    setRegFormAccount('')
    setRegFormRole('shein_payment')
    try {
      const res = await fetch('/api/financial/accounts?accountType=asset&activeOnly=true')
      if (res.ok) setAssetAccounts(await res.json())
    } catch (_) {
      setAssetAccounts([])
    }
  }

  const submitRegistry = async () => {
    if (!regFormAccount) {
      showBanner('error', 'اختر حساباً من الأصول')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/shein/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financial_account_id: regFormAccount,
          role: regFormRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.details || 'فشل الإضافة')
      setShowAddRegistry(false)
      await loadRegistry()
      showBanner('success', 'تم تسجيل الحساب')
    } catch (e) {
      showBanner('error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const deleteRegistry = async (rowId) => {
    if (!confirm('إزالة هذا الحساب من قائمة Shein؟')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/shein/registry/${rowId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      await loadRegistry()
    } catch (e) {
      showBanner('error', e.message)
    } finally {
      setBusy(false)
    }
  }

  const copyText = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => showBanner('success', 'تم النسخ'))
  }

  return (
    <div className={`${ordersStyles.ordersPage} ${sp.root}`}>
      <div className={ordersStyles.pageHeader}>
        <div>
          <h1 className={ordersStyles.pageTitle}>شراء طلبات Shein</h1>
          <p className={ordersStyles.pageSubtitle}>
            اختيار عدة طلبات، عرض الإجمالي بالدولار والدينار، ربط حساب الدفع والقسيمة من المالية، ثم تسجيل
            النتائج.
          </p>
        </div>
        <div className={ordersStyles.headerActions}>
          <Link href="/orders/all" className={ordersStyles.refreshButton}>
            جميع الطلبات
          </Link>
          <button type="button" className={ordersStyles.refreshButton} onClick={() => { loadOrders(); loadFx(); loadRegistry(); }} disabled={busy}>
            <HiRefresh />
            تحديث
          </button>
        </div>
      </div>

      <div className={ordersStyles.tabsContainer}>
        <button type="button" className={`${ordersStyles.tab} ${tab === 'buy' ? ordersStyles.tabActive : ''}`} onClick={() => setTab('buy')}>
          شراء
        </button>
        <button type="button" className={`${ordersStyles.tab} ${tab === 'registry' ? ordersStyles.tabActive : ''}`} onClick={() => setTab('registry')}>
          حسابات Shein
        </button>
      </div>

      {banner && (
        <div className={`${sp.banner} ${banner.type === 'error' ? sp.bannerError : sp.bannerSuccess}`}>
          {banner.message}
        </div>
      )}

      {tab === 'registry' && (
        <div className={sp.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 className={sp.panelTitle} style={{ margin: 0 }}>
              حسابات الدفع والقسائم المستخدمة في شراء Shein
            </h2>
            <button type="button" className={sp.primaryBtn} onClick={openAddRegistry}>
              <HiPlus />
              ربط حساب مالي
            </button>
          </div>
          <p style={{ color: 'var(--admin-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            أنشئ الحسابات أولاً من{' '}
            <Link href="/financial" style={{ color: 'var(--primary)' }}>
              الأصول والمديونية
            </Link>
            ، ثم سجّلها هنا كحساب دفع Shein أو كقسيمة.
          </p>
          <div className={sp.registryGrid} style={{ marginTop: '1rem' }}>
            <div>
              <h3 className={sp.panelTitle}>حسابات الدفع</h3>
              <ul className={sp.registryList}>
                {registryPayment.map((r) => (
                  <li key={r.id}>
                    <span>{r.financial_accounts?.name || r.financial_account_id}</span>
                    <button type="button" className={sp.secondaryBtn} aria-label="حذف" onClick={() => deleteRegistry(r.id)}>
                      <HiTrash />
                    </button>
                  </li>
                ))}
                {registryPayment.length === 0 && <li style={{ border: 'none', color: 'var(--admin-muted)' }}>لا توجد حسابات</li>}
              </ul>
            </div>
            <div>
              <h3 className={sp.panelTitle}>قسائم Shein</h3>
              <ul className={sp.registryList}>
                {registryVoucher.map((r) => (
                  <li key={r.id}>
                    <span>{r.financial_accounts?.name || r.financial_account_id}</span>
                    <button type="button" className={sp.secondaryBtn} aria-label="حذف" onClick={() => deleteRegistry(r.id)}>
                      <HiTrash />
                    </button>
                  </li>
                ))}
                {registryVoucher.length === 0 && <li style={{ border: 'none', color: 'var(--admin-muted)' }}>لا توجد قسائم</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === 'buy' && (
        <>
          <div className={sp.panel}>
            <h2 className={sp.panelTitle}>1) اختيار الطلبات (Shein)</h2>
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.9rem' }}>
                حالة الطلب:{' '}
                <select className={sp.select} style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="pending">معلق</option>
                  <option value="processing">قيد المعالجة</option>
                  <option value="">كل الحالات</option>
                  <option value="shipping">قيد الشحن</option>
                </select>
              </label>
            </div>
            {loadingOrders ? (
              <p>جاري التحميل...</p>
            ) : (
              <div>
                {orders.map((o) => (
                  <label key={o.id} className={sp.orderRow}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      disabled={Boolean(batch)}
                    />
                    <div className={sp.orderMeta}>
                      <strong>{o.internal_ref || o.id}</strong> — {o.customer?.name || '—'} — {o.status}
                      {(!o.basket_link || !String(o.basket_link).trim()) && <div className={sp.warn}>لا يوجد رابط سلة</div>}
                    </div>
                  </label>
                ))}
                {orders.length === 0 && <p style={{ color: 'var(--admin-muted)' }}>لا توجد طلبات Shein بهذه الحالة.</p>}
              </div>
            )}
            {!batch && (
              <button type="button" className={sp.primaryBtn} style={{ marginTop: '1rem' }} disabled={busy || selectedIds.length === 0} onClick={startDraft}>
                بدء دفعة شراء
              </button>
            )}
            {batch && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  مسودة دفعة: <strong>{batch.id.slice(0, 8)}…</strong> — {batch.status}
                </span>
                <button type="button" className={sp.secondaryBtn} onClick={refreshBatch}>
                  تحديث الدفعة
                </button>
                {batch.status === 'draft' && (
                  <button type="button" className={sp.secondaryBtn} onClick={resetBatch}>
                    إلغاء وبدء من جديد
                  </button>
                )}
              </div>
            )}
          </div>

          {batch && (
            <>
              <div className={sp.panel}>
                <h2 className={sp.panelTitle}>2) الإجماليات (للطلبات في هذه الدفعة)</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--admin-muted)', marginTop: 0 }}>
                  يتم حساب الدينار باستخدام أسعار التقارير المالية الحالية.
                </p>
                <div className={sp.totalsGrid} style={{ marginTop: '0.75rem' }}>
                  <div className={sp.totalCard}>
                    <div className={sp.totalLabel}>مجموع بنود USD</div>
                    <div className={sp.totalValue}>{displayTotals.usd.toFixed(2)} $</div>
                  </div>
                  <div className={sp.totalCard}>
                    <div className={sp.totalLabel}>إجمالي تقديري بـ LYD</div>
                    <div className={sp.totalValue}>{displayTotals.lyd.toFixed(2)} د.ل</div>
                  </div>
                </div>
                {Object.keys(displayTotals.other).length > 0 && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                    <strong>عملات أخرى:</strong>{' '}
                    {Object.entries(displayTotals.other)
                      .map(([c, v]) => `${c}: ${v.toFixed(2)}`)
                      .join(' · ')}
                  </div>
                )}
              </div>

              <div className={sp.panel}>
                <h2 className={sp.panelTitle}>3) الحسابات</h2>
                {batch.status === 'draft' && (
                  <>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label className={sp.totalLabel}>حساب الدفع (مسجل في تبويب حسابات Shein)</label>
                      <select className={sp.select} value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>
                        <option value="">— اختر —</option>
                        {registryPayment.map((r) => (
                          <option key={r.id} value={r.financial_account_id}>
                            {r.financial_accounts?.name || r.financial_account_id} ({r.financial_accounts?.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label className={sp.totalLabel}>قسيمة Shein (اختياري)</label>
                      <select className={sp.select} value={voucherAccountId} onChange={(e) => setVoucherAccountId(e.target.value)}>
                        <option value="">— بدون —</option>
                        {registryVoucher.map((r) => (
                          <option key={r.id} value={r.financial_account_id}>
                            {r.financial_accounts?.name || r.financial_account_id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {batch.status !== 'draft' && (
                  <p style={{ fontSize: '0.9rem' }}>
                    حساب الدفع: {batch.payment_account_id?.slice(0, 8)}… — قسيمة:{' '}
                    {batch.voucher_account_id ? `${batch.voucher_account_id.slice(0, 8)}…` : '—'}
                  </p>
                )}
              </div>

              <div className={sp.panel}>
                <h2 className={sp.panelTitle}>4) روابط السلة</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'right', borderBottom: '1px solid var(--admin-border)' }}>
                      <th style={{ padding: '0.5rem' }}>الطلب</th>
                      <th style={{ padding: '0.5rem' }}>الرابط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batch.batch_orders || []).map((line) => {
                      const link = line.order?.basket_link
                      return (
                        <tr key={line.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                          <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{line.order?.internal_ref}</td>
                          <td className={sp.linkCell} style={{ padding: '0.5rem' }}>
                            {link ? (
                              <>
                                <a href={link} target="_blank" rel="noopener noreferrer">
                                  فتح <HiExternalLink style={{ verticalAlign: 'middle' }} />
                                </a>
                                <button type="button" className={sp.secondaryBtn} style={{ marginInlineStart: '0.5rem' }} onClick={() => copyText(link)}>
                                  <HiClipboardCopy />
                                </button>
                              </>
                            ) : (
                              <span className={sp.warn}>لا يوجد</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {missingBasketCount > 0 && batch.status === 'draft' && (
                  <label style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={ackMissingBaskets} onChange={(e) => setAckMissingBaskets(e.target.checked)} />
                    أدرك أن بعض روابط السلة ناقصة وأرغب في المتابعة.
                  </label>
                )}
                {batch.status === 'draft' && (
                  <button type="button" className={sp.primaryBtn} style={{ marginTop: '1rem' }} disabled={busy || !canConfirm} onClick={confirmBatch}>
                    تأكيد الدفعة
                  </button>
                )}
              </div>

              {batch.status === 'confirmed' && (
                <div className={sp.panel}>
                  <h2 className={sp.panelTitle}>5) نتائج الشراء لكل طلب</h2>
                  <div className={sp.splitGrid}>
                    <div>
                      <label className={sp.totalLabel}>إجمالي مشتريات النتائج المختارة (LYD)</label>
                      <input
                        type="number"
                        className={sp.select}
                        value={outcomeTotals.lyd.toFixed(2)}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className={sp.totalLabel}>مبلغ من حساب الدفع (LYD)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={sp.select}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={sp.totalLabel}>مبلغ من القسيمة (LYD)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={sp.select}
                        value={voucherAmount}
                        disabled={!voucherAccountId}
                        onChange={(e) => setVoucherAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: Math.abs(splitDiff) <= 0.01 ? '#166534' : '#991B1B' }}>
                    فرق التقسيم: {splitDiff.toFixed(2)} د.ل
                  </div>
                  {Array.isArray(batch.payments) && batch.payments.length > 0 && (
                    <div style={{ marginTop: '0.9rem', border: '1px solid var(--admin-border)', borderRadius: 'var(--border-radius)', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>مدفوعات مسجلة</div>
                      {batch.payments.map((p) => (
                        <div key={p.id} style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          [{p.source_role}] {Number(p.amount || 0).toFixed(2)} {p.currency} — TX:{' '}
                          {p.transaction_id ? String(p.transaction_id).slice(0, 8) : '—'} — طلبات:{' '}
                          {(p.orders || []).map((o) => o.order?.internal_ref || String(o.order_id).slice(0, 8)).join('، ') || '—'}
                        </div>
                      ))}
                    </div>
                  )}
                  <label style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={applyPurchaseFields} onChange={(e) => setApplyPurchaseFields(e.target.checked)} />
                    تحديث حقول شراء العناصر (سعر الشراء وحساب الشراء) للعناصر غير المعلومة كنفد مخزون
                  </label>
                  {(batch.batch_orders || []).map((line) => {
                    const oid = line.order_id
                    const st = outcomeState[oid] || { outcome: 'pending', notes: '', oos: new Set() }
                    return (
                      <div key={line.id} className={sp.outcomeRow}>
                        <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{line.order?.internal_ref}</div>
                        <select
                          className={sp.select}
                          value={st.outcome}
                          onChange={(e) => setOutcome(oid, 'outcome', e.target.value)}
                        >
                          {OUTCOMES.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className={sp.select}
                          style={{ marginTop: '0.5rem' }}
                          placeholder="ملاحظات"
                          value={st.notes}
                          onChange={(e) => setOutcome(oid, 'notes', e.target.value)}
                        />
                        {st.outcome === 'partial_oos' && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--admin-muted)' }}>عناصر نفد مخزونها:</div>
                            <div className={sp.oosChips}>
                              {(line.items || []).map((it) => (
                                <button
                                  key={it.id}
                                  type="button"
                                  className={`${sp.chip} ${st.oos?.has(it.id) ? sp.chipOn : ''}`}
                                  onClick={() => toggleOos(oid, it.id)}
                                >
                                  {it.name?.slice(0, 28) || it.id.slice(0, 8)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button type="button" className={sp.primaryBtn} disabled={busy || Math.abs(splitDiff) > 0.01} onClick={saveOutcomes}>
                    حفظ النتائج
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAddRegistry && (
        <div className={sp.modalOverlay} role="dialog" aria-modal="true">
          <div className={sp.modal}>
            <h3>ربط حساب مالي بـ Shein</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              <label className={sp.totalLabel}>الحساب (أصول)</label>
              <select className={sp.select} value={regFormAccount} onChange={(e) => setRegFormAccount(e.target.value)}>
                <option value="">— اختر —</option>
                {assetAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <span className={sp.totalLabel}>النوع</span>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
                <label>
                  <input type="radio" name="regrole" checked={regFormRole === 'shein_payment'} onChange={() => setRegFormRole('shein_payment')} /> حساب
                  دفع
                </label>
                <label>
                  <input type="radio" name="regrole" checked={regFormRole === 'shein_voucher'} onChange={() => setRegFormRole('shein_voucher')} /> قسيمة
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className={sp.secondaryBtn} onClick={() => setShowAddRegistry(false)}>
                إلغاء
              </button>
              <button type="button" className={sp.primaryBtn} disabled={busy} onClick={submitRegistry}>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
