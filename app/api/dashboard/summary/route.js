/**
 * GET /api/dashboard/summary
 * JSON contract v1 — consumed by app/dashboard/page.js
 * Aggregates Supabase (service role) for admin dashboard; no auth in v1.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin, financialSettings } from '../../../../server/supabase'
import { compileFromFinancialSettings } from '../../../../server/financialExchangeRates'

export const dynamic = 'force-dynamic'

const FX_STALE_HOURS = 48
const SHIPPING_STUCK_DAYS = 14
const RECENT_REVERSAL_DAYS = 7

/** @returns {Date} Wall-clock date in Africa/Tripoli as a local Date (for calendar math). */
function tripoliWallNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Tripoli' }))
}

function ymdFromTripoli(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysTripoli(d, delta) {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + delta)
  return x
}

function balanceToLyd(balance, currency, toLYD) {
  const cur = String(currency || 'LYD').toUpperCase()
  const b = parseFloat(balance) || 0
  const rate = toLYD[cur] ?? toLYD.LYD ?? 1
  return b * rate
}

function weekdayArLong(d) {
  return new Intl.DateTimeFormat('ar-LY', { weekday: 'long', timeZone: 'Africa/Tripoli' }).format(d)
}

async function paginateSelect(build) {
  const pageSize = 1000
  let offset = 0
  const all = []
  for (;;) {
    const { data, error } = await build(offset, pageSize)
    if (error) throw error
    if (!data?.length) break
    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
    if (offset > 50000) break
  }
  return all
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'الخدمة غير متاحة' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = parseInt(searchParams.get('days') || '7', 10)
    const numDays = daysParam === 30 ? 30 : 7

    const settings = await financialSettings.get()
    const { toLYD, updatedAt: fxUpdatedAt } = compileFromFinancialSettings(settings)

    const endWall = tripoliWallNow()
    const rangeEndYmd = ymdFromTripoli(endWall)
    const rangeStartWall = addDaysTripoli(endWall, -(numDays - 1))
    const rangeStartYmd = ymdFromTripoli(rangeStartWall)

    /** Chronological list of YYYY-MM-DD in range (Tripoli calendar). */
    const dateKeys = []
    {
      let w = new Date(rangeStartWall.getTime())
      const endT = endWall.getTime()
      while (w.getTime() <= endT) {
        dateKeys.push(ymdFromTripoli(w))
        w = addDaysTripoli(w, 1)
      }
    }

    const trendByDay = Object.fromEntries(
      dateKeys.map((k) => [
        k,
        { dayKey: k, deposits: 0, withdrawals: 0, net: 0, orders: 0, hoursSum: 0, hoursCount: 0 },
      ])
    )

    const todayYmd = ymdFromTripoli(tripoliWallNow())

    const [
      accountsRes,
      txs,
      ordersPipelineRes,
      ordersTrendRes,
      paymentsRes,
      shippingRes,
      reversalsRes,
      recentReversalAggRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('financial_accounts')
        .select('id, account_type, balance, currency, due_date, is_active')
        .eq('is_active', true),
      paginateSelect((offset, limit) =>
        supabaseAdmin
          .from('financial_transactions')
          .select('transaction_date, transaction_type, amount_in_base_currency, reference_type')
          .gte('transaction_date', rangeStartYmd)
          .lte('transaction_date', rangeEndYmd)
          .order('transaction_date', { ascending: true })
          .range(offset, offset + limit - 1)
      ),
      supabaseAdmin
        .from('orders')
        .select('id, status, has_issues, expected_delivery_date, created_at')
        .limit(8000),
      supabaseAdmin
        .from('orders')
        .select('id, order_date, created_at')
        .gte('order_date', rangeStartYmd)
        .lte('order_date', rangeEndYmd),
      supabaseAdmin.from('order_payments').select('order_id, payment_status'),
      supabaseAdmin
        .from('order_shipping')
        .select('order_id, shipping_stage, international_shipped_date, delivered_date')
        .limit(8000),
      supabaseAdmin
        .from('financial_transactions')
        .select('id, amount_in_base_currency, description, created_at, reference_type')
        .eq('reference_type', 'reversal')
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('financial_transactions')
        .select('amount_in_base_currency')
        .eq('reference_type', 'reversal')
        .gte('created_at', new Date(Date.now() - RECENT_REVERSAL_DAYS * 86400000).toISOString())
        .limit(5000),
    ])

    for (const e of [
      accountsRes.error,
      ordersPipelineRes.error,
      ordersTrendRes.error,
      paymentsRes.error,
      shippingRes.error,
      reversalsRes.error,
      recentReversalAggRes.error,
    ]) {
      if (e) throw e
    }

    const accounts = accountsRes.data || []
    const ordersAll = ordersPipelineRes.data || []
    const ordersInRange = ordersTrendRes.data || []
    const payments = paymentsRes.data || []
    const shippingRows = shippingRes.data || []
    const latestReversalRows = reversalsRes.data || []
    const recentReversalAmounts = recentReversalAggRes.data || []

    let cashOnHand = 0
    let totalLiabilitiesLyd = 0
    let liabilitiesDueSoonLyd = 0
    let negativeAssetCount = 0

    const todayPlus7 = ymdFromTripoli(addDaysTripoli(tripoliWallNow(), 7))

    for (const a of accounts) {
      const lyd = balanceToLyd(a.balance, a.currency, toLYD)
      if (a.account_type === 'asset') {
        cashOnHand += lyd
        if (parseFloat(a.balance) < 0) negativeAssetCount += 1
      } else if (a.account_type === 'liability') {
        totalLiabilitiesLyd += lyd
        if (a.due_date) {
          const due = String(a.due_date).slice(0, 10)
          if (due >= todayYmd && due <= todayPlus7) liabilitiesDueSoonLyd += lyd
        }
      }
    }

    const netPosition = cashOnHand - totalLiabilitiesLyd

    let todayInflow = 0
    let todayOutflow = 0
    for (const tx of txs) {
      if (tx.transaction_type === 'transfer') continue
      const amt = parseFloat(tx.amount_in_base_currency) || 0
      if (tx.transaction_date === todayYmd) {
        if (tx.transaction_type === 'credit') todayInflow += amt
        else if (tx.transaction_type === 'debit') todayOutflow += amt
      }
      if (tx.transaction_date >= rangeStartYmd && tx.transaction_date <= rangeEndYmd) {
        const bucket = trendByDay[tx.transaction_date]
        if (bucket && tx.transaction_type !== 'transfer') {
          if (tx.transaction_type === 'credit') {
            bucket.deposits += amt
            bucket.net += amt
          } else if (tx.transaction_type === 'debit') {
            bucket.withdrawals += amt
            bucket.net -= amt
          }
        }
      }
    }

    for (const o of ordersInRange) {
      const od = o.order_date ? String(o.order_date).slice(0, 10) : null
      if (od && trendByDay[od]) trendByDay[od].orders += 1
    }

    const paymentByOrder = new Map()
    for (const p of payments) {
      paymentByOrder.set(p.order_id, p.payment_status || 'unpaid')
    }

    const shippingByOrder = new Map()
    for (const s of shippingRows) {
      shippingByOrder.set(s.order_id, s)
    }

    const orderCreatedMap = new Map(ordersAll.map((o) => [o.id, o.created_at]))

    let pendingOrders = 0
    let issuesCount = 0
    let overdueDeliveries = 0
    let shippingStuck = 0
    let unpaidBalances = 0

    const stuckCutoff = Date.now() - SHIPPING_STUCK_DAYS * 86400000

    for (const o of ordersAll) {
      if (o.status === 'pending') pendingOrders += 1
      if (o.has_issues) issuesCount += 1
      const exp = o.expected_delivery_date ? String(o.expected_delivery_date).slice(0, 10) : null
      if (
        exp &&
        exp < todayYmd &&
        o.status !== 'delivered' &&
        o.status !== 'cancelled'
      ) {
        overdueDeliveries += 1
      }
      const ps = paymentByOrder.get(o.id) || 'unpaid'
      if (ps === 'unpaid' || ps === 'partial') unpaidBalances += 1

      const sh = shippingByOrder.get(o.id)
      if (
        sh &&
        sh.shipping_stage === 'international_shipping' &&
        sh.international_shipped_date
      ) {
        const t = new Date(sh.international_shipped_date).getTime()
        if (t < stuckCutoff) shippingStuck += 1
      }
    }

    for (const sh of shippingRows) {
      const createdAt = orderCreatedMap.get(sh.order_id)
      if (!sh.delivered_date || !createdAt) continue
      const delDay = String(sh.delivered_date).slice(0, 10)
      const b = trendByDay[delDay]
      if (!b) continue
      const created = new Date(createdAt).getTime()
      const delivered = new Date(sh.delivered_date).getTime()
      const hours = (delivered - created) / 3600000
      if (Number.isFinite(hours) && hours >= 0) {
        b.hoursSum += hours
        b.hoursCount += 1
      }
    }

    let staleFxRates = 0
    if (fxUpdatedAt) {
      const ageH = (Date.now() - new Date(fxUpdatedAt).getTime()) / 3600000
      if (ageH > FX_STALE_HOURS) staleFxRates += 1
    } else {
      staleFxRates += 1
    }

    const recentReversalCount = recentReversalAmounts.length
    const recentReversalValueLyd = recentReversalAmounts.reduce(
      (sum, r) => sum + (parseFloat(r.amount_in_base_currency) || 0),
      0
    )

    const latestReversals = latestReversalRows.map((r) => ({
      id: String(r.id),
      displayId: String(r.id).slice(0, 8).toUpperCase(),
      amount: Math.round(parseFloat(r.amount_in_base_currency) || 0),
      user: (r.description && String(r.description).slice(0, 80)) || '—',
      timeIso: r.created_at,
      status: 'مكتمل',
    }))

    const failedTransactions = 0
    const blockedEditAttempts = 0
    const reconMismatches = 0

    const actionQueue = []
    if (overdueDeliveries > 0) {
      actionQueue.push({
        priority: 'high',
        label: `${overdueDeliveries} تسليمات متجاوزة للموعد`,
        amount: null,
        due: 'الآن',
      })
    }
    if (unpaidBalances > 0) {
      actionQueue.push({
        priority: 'high',
        label: `${unpaidBalances} طلبات بدفعات غير مكتملة`,
        amount: null,
        due: 'اليوم',
      })
    }
    if (liabilitiesDueSoonLyd > 0) {
      actionQueue.push({
        priority: 'medium',
        label: 'التزامات مستحقة خلال 7 أيام',
        amount: Math.round(liabilitiesDueSoonLyd),
        due: '7 أيام',
      })
    }
    if (staleFxRates > 0) {
      actionQueue.push({
        priority: 'medium',
        label: 'مراجعة أسعار الصرف (لم يُحدَّث الإعداد منذ أكثر من 48 ساعة)',
        amount: null,
        due: 'قريباً',
      })
    }
    if (shippingStuck > 0) {
      actionQueue.push({
        priority: 'low',
        label: `${shippingStuck} شحنة دولية متوقفة (${SHIPPING_STUCK_DAYS}+ يوماً في الشحن الدولي)`,
        amount: null,
        due: 'راجع',
      })
    }

    const trendData = dateKeys.map((k, i) => {
      const row = trendByDay[k]
      const wall = addDaysTripoli(rangeStartWall, i)
      const dayLabel =
        numDays <= 7
          ? weekdayArLong(wall)
          : new Intl.DateTimeFormat('ar-LY', {
              timeZone: 'Africa/Tripoli',
              day: 'numeric',
              month: 'short',
            }).format(wall)
      const hours =
        row.hoursCount > 0 ? Math.round((row.hoursSum / row.hoursCount) * 10) / 10 : 0
      return {
        day: dayLabel,
        deposits: Math.round(row.deposits),
        withdrawals: Math.round(row.withdrawals),
        net: Math.round(row.net),
        orders: row.orders,
        hours,
      }
    })

    const body = {
      dashboardSummaryVersion: 1,
      range: { start: rangeStartYmd, end: rangeEndYmd, days: numDays },
      cashOnHand: Math.round(cashOnHand),
      liabilitiesDueSoon: Math.round(liabilitiesDueSoonLyd),
      netPosition: Math.round(netPosition),
      todayInflow: Math.round(todayInflow),
      todayOutflow: Math.round(todayOutflow),
      /** لا يوجد في المخطط حالة «معلقة» للعكس؛ العدد يعكس عمليات العكس المسجّلة خلال 7 أيام. */
      pendingReversals: recentReversalCount,
      pendingReversalsValue: Math.round(recentReversalValueLyd),
      failedTransactions,
      blockedEditAttempts,
      staleFxRates,
      negativeTrendAccounts: negativeAssetCount,
      pendingOrders,
      shippingStuck,
      unpaidBalances,
      issuesCount,
      overdueDeliveries,
      latestReversals,
      highRiskActions: [],
      reconMismatches,
      actionQueue,
      trendData,
    }

    return NextResponse.json(body, { status: 200 })
  } catch (error) {
    console.error('dashboard/summary:', error)
    return NextResponse.json(
      { error: 'فشل تحميل ملخص اللوحة', details: error.message },
      { status: 500 }
    )
  }
}
