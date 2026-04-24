'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import styles from './dashboard.module.css'

function formatRelativeAr(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diffMin = Math.floor((Date.now() - t) / 60000)
  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return h === 1 ? 'منذ ساعة' : `منذ ${h} ساعات`
  const d = Math.floor(h / 24)
  return d === 1 ? 'منذ يوم' : `منذ ${d} أيام`
}

/* ─── Chart colours (matching dark palette) ────────────────────────────── */
const C = {
  accent:   '#08AF66',
  accentDim:'rgba(8,175,102,0.18)',
  red:      '#f87171',
  redDim:   'rgba(248,113,113,0.18)',
  amber:    '#fbbf24',
  purple:   '#a78bfa',
  purpleDim:'rgba(167,139,250,0.18)',
  grid:     '#23262d',
  axis:     '#a5a7ad',
}

function KpiCard({ label, value, sub, trend, accent, icon }) {
  const up = trend > 0
  return (
    <div className={styles.kpiCard} style={{ '--accent': accent }}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon}>{icon}</span>
        {trend != null && (
          <span className={`${styles.kpiTrend} ${up ? styles.kpiTrendUp : styles.kpiTrendDown}`}>
            {up ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  )
}

function AlertRow({ icon, label, count, severity }) {
  return (
    <div className={`${styles.alertRow} ${styles['alert_' + severity]}`}>
      <span className={styles.alertIcon}>{icon}</span>
      <span className={styles.alertLabel}>{label}</span>
      <span className={styles.alertCount}>{count}</span>
    </div>
  )
}

function PipelineBar({ label, value, max, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className={styles.pipelineRow}>
      <div className={styles.pipelineMeta}>
        <span className={styles.pipelineLabel}>{label}</span>
        <span className={styles.pipelineValue}>{value}</span>
      </div>
      <div className={styles.pipelineTrack}>
        <div className={styles.pipelineFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function ActionItem({ item }) {
  const cls = { high: styles.aqHigh, medium: styles.aqMedium, low: styles.aqLow }[item.priority]
  return (
    <div className={`${styles.aqItem} ${cls}`}>
      <div className={styles.aqDot} />
      <div className={styles.aqBody}>
        <span className={styles.aqLabel}>{item.label}</span>
        {item.amount != null && (
          <span className={styles.aqAmount}>{item.amount.toLocaleString('ar-LY')} د.ل</span>
        )}
      </div>
      <span className={styles.aqDue}>{item.due}</span>
    </div>
  )
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span style={{ color: p.color }}>●</span>
          <span>{p.name}</span>
          <strong>{Number(p.value).toLocaleString('ar-LY')}</strong>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [trendRange, setTrendRange] = useState('7')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSummary = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/summary?days=${trendRange}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || j.details || 'تعذر تحميل البيانات')
      setData(j)
    } catch (e) {
      setError(e.message || 'حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }, [trendRange])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const now = new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading && !data) {
    return (
      <div className={styles.page} dir="rtl">
        <div className={styles.loadingBanner}>جاري تحميل لوحة التحكم…</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={styles.page} dir="rtl">
        <div className={styles.errorBanner}>
          {error}
          <div>
            <button type="button" className={styles.retryBtn} onClick={() => loadSummary()}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    )
  }

  const d = data
  const trendData = d?.trendData || []
  const settleData = trendData.map(({ day, hours }) => ({ day, hours }))
  const urgentCount = (d?.actionQueue || []).filter(a => a.priority === 'high').length
  const riskBadgeCount = (d?.staleFxRates || 0) + (d?.negativeTrendAccounts || 0)

  return (
    <div className={styles.page} dir="rtl">

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>لوحة التحكم</h1>
          <p className={styles.pageDate}>{now}</p>
        </div>
        {urgentCount > 0 && (
          <div className={styles.headerBadges}>
            <div className={styles.urgentBadge}>
              <span className={styles.urgentDot} />
              {urgentCount} إجراءات عاجلة
            </div>
          </div>
        )}
      </div>

      {error && data && (
        <div className={styles.errorBanner} style={{ marginBottom: '1rem' }}>
          {error}
          <button type="button" className={styles.retryBtn} onClick={() => loadSummary()} style={{ marginRight: '0.75rem' }}>
            تحديث
          </button>
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/></svg>
          الصحة المالية
        </h2>
        <div className={styles.kpiGrid}>
          <KpiCard label="النقد المتاح" value={`${(d?.cashOnHand ?? 0).toLocaleString('ar-LY')} د.ل`} accent="#08AF66" icon="💰" />
          <KpiCard label="الالتزامات القريبة" value={`${(d?.liabilitiesDueSoon ?? 0).toLocaleString('ar-LY')} د.ل`} accent="#DC2626" icon="⚠️" />
          <KpiCard label="الصافي" value={`${(d?.netPosition ?? 0).toLocaleString('ar-LY')} د.ل`} accent="#08AF66" icon="📈" />
          <KpiCard label="تدفق اليوم (داخل)" value={`+${(d?.todayInflow ?? 0).toLocaleString('ar-LY')} د.ل`} accent="#2563EB" icon="↘️"
            sub={`صادر: ${(d?.todayOutflow ?? 0).toLocaleString('ar-LY')} د.ل`} />
          <KpiCard
            label="عمليات عكس (آخر 7 أيام)"
            value={d?.pendingReversals ?? 0}
            accent="#F59E0B"
            icon="🔄"
            sub={`${(d?.pendingReversalsValue ?? 0).toLocaleString('ar-LY')} د.ل إجمالي المبالغ`}
          />
        </div>
      </section>

      <div className={styles.twoCol}>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              تنبيهات المخاطر
            </h2>
            {riskBadgeCount > 0 && (
              <span className={styles.cardBadgeRed}>{riskBadgeCount}</span>
            )}
          </div>
          <div className={styles.alertList}>
            <AlertRow icon="💱" label="أسعار صرف متقادمة (تعدّى على آخر تحديث للإعداد ٤٨ ساعة)" count={d?.staleFxRates ?? 0} severity="medium" />
            <AlertRow icon="📉" label="حسابات أصول برصيد سالب" count={d?.negativeTrendAccounts ?? 0} severity="low" />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z"/></svg>
              خط أنابيب الطلبات
            </h2>
          </div>
          <div className={styles.pipelineList}>
            <PipelineBar label="طلبات معلقة" value={d?.pendingOrders ?? 0} max={50} color="#F59E0B" />
            <PipelineBar label="شحنات متوقفة" value={d?.shippingStuck ?? 0} max={20} color="#DC2626" />
            <PipelineBar label="أرصدة غير مدفوعة" value={d?.unpaidBalances ?? 0} max={30} color="#a78bfa" />
            <PipelineBar label="طلبات بمشاكل" value={d?.issuesCount ?? 0} max={20} color="#f97316" />
            <PipelineBar label="تسليمات متأخرة" value={d?.overdueDeliveries ?? 0} max={10} color="#f43f5e" />
          </div>
          <div className={styles.pipelineSummary}>
            إجمالي النشطة:&nbsp;<strong>{(d?.pendingOrders ?? 0) + (d?.shippingStuck ?? 0) + (d?.issuesCount ?? 0)}</strong>
          </div>
        </section>
      </div>

      <div className={styles.twoCol}>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
              المراجعة والضوابط
            </h2>
          </div>

          <p className={styles.auditSubhead}>آخر عمليات العكس</p>
          <div className={styles.auditTable}>
            {(d?.latestReversals || []).length === 0 ? (
              <p className={styles.emptyHint}>لا توجد عمليات عكس مسجّلة.</p>
            ) : (
              (d.latestReversals || []).map(r => (
                <div key={r.id} className={styles.auditRow}>
                  <div>
                    <span className={styles.auditId}>{r.displayId || String(r.id).slice(0, 8).toUpperCase()}</span>
                    <span className={styles.auditUser}>{r.user} · {formatRelativeAr(r.timeIso)}</span>
                  </div>
                  <div className={styles.auditRight}>
                    <span className={styles.auditAmount}>{r.amount.toLocaleString('ar-LY')} د.ل</span>
                    <span className={`${styles.auditStatus} ${r.status === 'مكتمل' ? styles.statusDone : styles.statusPending}`}>{r.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <p className={styles.auditSubhead} style={{ marginTop: '1rem' }}>إجراءات عالية الخطورة</p>
          <div className={styles.auditTable}>
            {(d?.highRiskActions || []).length === 0 ? (
              <p className={styles.emptyHint}>لا يوجد في قاعدة البيانات سجل تدقيق لهذا القسم حالياً.</p>
            ) : (
              d.highRiskActions.map((a, i) => (
                <div key={i} className={styles.auditRow}>
                  <div>
                    <span className={styles.auditId}>{a.action}</span>
                    <span className={styles.auditUser}>{a.user} · {a.time}</span>
                  </div>
                  <span className={a.blocked ? styles.blockedBadge : styles.allowedBadge}>
                    {a.blocked ? 'محجوب' : 'مسموح'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
              الإجراءات العاجلة
            </h2>
          </div>
          <div className={styles.aqList}>
            {(d?.actionQueue || []).length === 0 ? (
              <p className={styles.emptyHint}>لا توجد إجراءات مقترحة حسب البيانات الحالية.</p>
            ) : (
              d.actionQueue.map((item, i) => <ActionItem key={i} item={item} />)
            )}
          </div>
        </section>
      </div>

      <section className={styles.section}>
        <div className={styles.trendsHeader}>
          <h2 className={styles.sectionTitle}>
            <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd"/></svg>
            الاتجاهات
          </h2>
          <div className={styles.rangeToggle}>
            {['7', '30'].map(r => (
              <button key={r} type="button" className={`${styles.rangeBtn} ${trendRange === r ? styles.rangeBtnActive : ''}`}
                onClick={() => setTrendRange(r)}>
                {r} أيام
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chartsGrid}>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>الإيداعات مقابل السحوبات (د.ل)</h3>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trendData} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWith" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.red} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="deposits"    name="إيداعات" stroke={C.accent} strokeWidth={2} fill="url(#gDep)"  />
                <Area type="monotone" dataKey="withdrawals" name="سحوبات"  stroke={C.red}    strokeWidth={2} fill="url(#gWith)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>صافي التدفق اليومي (د.ل)</h3>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={trendData} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="net" name="الصافي" radius={[4, 4, 0, 0]} fill={C.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>الطلبات اليومية</h3>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trendData} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="orders" name="الطلبات" stroke={C.purple} strokeWidth={2} fill="url(#gOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>متوسط وقت التسوية (ساعات)</h3>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={settleData} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.axis }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="hours" name="ساعات" stroke={C.amber} strokeWidth={2.5}
                  dot={{ fill: C.amber, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: C.amber }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      </section>

    </div>
  )
}
