/**
 * Shein bulk purchase: registry + batches (Supabase via admin client).
 */
const { supabaseAdmin, financialTransaction, financialAccount } = require('./supabase')

const BATCH_STATUSES = ['draft', 'confirmed', 'settled']
const OUTCOMES = ['pending', 'purchased', 'partial_oos', 'failed', 'skipped']
const REGISTRY_ROLES = ['shein_payment', 'shein_voucher']
const MONEY_EPSILON = 0.01

function toNumber(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCurrency(v) {
  return String(v || 'USD').toUpperCase()
}

async function assertRegistryRole(financialAccountId, role) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  const { data, error } = await supabaseAdmin
    .from('shein_financial_registry')
    .select('id')
    .eq('financial_account_id', financialAccountId)
    .eq('role', role)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    throw new Error(
      role === 'shein_payment'
        ? 'حساب الدفع غير مسجل في قائمة حسابات Shein'
        : 'حساب القسيمة غير مسجل في قائمة حسابات Shein'
    )
  }
}

async function listRegistry(role) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  let q = supabaseAdmin
    .from('shein_financial_registry')
    .select('id, financial_account_id, role, created_at')
    .order('created_at', { ascending: false })
  if (role && REGISTRY_ROLES.includes(role)) {
    q = q.eq('role', role)
  }
  const { data: rows, error } = await q
  if (error) throw error
  const list = rows || []
  const ids = [...new Set(list.map((r) => r.financial_account_id).filter(Boolean))]
  let accMap = {}
  if (ids.length > 0) {
    const { data: accounts, error: aErr } = await supabaseAdmin
      .from('financial_accounts')
      .select('id, name, currency, balance, asset_category, account_type, is_active')
      .in('id', ids)
    if (aErr) throw aErr
    accMap = Object.fromEntries((accounts || []).map((a) => [a.id, a]))
  }
  return list.map((r) => ({
    ...r,
    financial_accounts: accMap[r.financial_account_id] || null,
  }))
}

async function addRegistry({ financial_account_id, role }) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  if (!financial_account_id || !REGISTRY_ROLES.includes(role)) {
    throw new Error('financial_account_id و role صالحان مطلوبان')
  }
  const { data, error } = await supabaseAdmin
    .from('shein_financial_registry')
    .insert([{ financial_account_id, role }])
    .select()
    .single()
  if (error) throw error
  return data
}

async function removeRegistry(id) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  const { error } = await supabaseAdmin.from('shein_financial_registry').delete().eq('id', id)
  if (error) throw error
  return { ok: true }
}

async function createDraftBatch(orderIds) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  const ids = [...new Set((orderIds || []).filter(Boolean))]
  if (ids.length === 0) throw new Error('يجب اختيار طلب واحد على الأقل')

  const { data: batch, error: bErr } = await supabaseAdmin
    .from('shein_purchase_batches')
    .insert([{ status: 'draft' }])
    .select()
    .single()
  if (bErr) throw bErr

  const rows = ids.map((order_id) => ({
    batch_id: batch.id,
    order_id,
    outcome: 'pending',
  }))
  const { error: oErr } = await supabaseAdmin.from('shein_purchase_batch_orders').insert(rows)
  if (oErr) throw oErr

  return getBatch(batch.id)
}

async function confirmBatch(batchId, { payment_account_id, voucher_account_id, total_usd, total_lyd, fx_json }) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  if (!payment_account_id) throw new Error('payment_account_id مطلوب')
  await assertRegistryRole(payment_account_id, 'shein_payment')
  if (voucher_account_id) {
    await assertRegistryRole(voucher_account_id, 'shein_voucher')
  }

  const { data: batch, error: gErr } = await supabaseAdmin
    .from('shein_purchase_batches')
    .select('id, status')
    .eq('id', batchId)
    .single()
  if (gErr) throw gErr
  if (!batch || batch.status !== 'draft') {
    throw new Error('الدفعة غير موجودة أو ليست في حالة مسودة')
  }

  const { data, error } = await supabaseAdmin
    .from('shein_purchase_batches')
    .update({
      status: 'confirmed',
      payment_account_id,
      voucher_account_id: voucher_account_id || null,
      total_usd: total_usd != null ? Number(total_usd) : null,
      total_lyd: total_lyd != null ? Number(total_lyd) : null,
      fx_json: fx_json && typeof fx_json === 'object' ? fx_json : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .eq('status', 'draft')
    .select()
    .single()
  if (error) throw error
  return getBatch(batchId)
}

async function getBatch(batchId) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  const { data: batch, error: bErr } = await supabaseAdmin
    .from('shein_purchase_batches')
    .select('*')
    .eq('id', batchId)
    .single()
  if (bErr) throw bErr
  if (!batch) return null

  const { data: lines, error: lErr } = await supabaseAdmin
    .from('shein_purchase_batch_orders')
    .select('id, order_id, outcome, notes, oos_item_ids')
    .eq('batch_id', batchId)
  if (lErr) throw lErr

  const orderIds = (lines || []).map((l) => l.order_id)
  let orderMap = {}
  if (orderIds.length > 0) {
    const { data: ords, error: oErr } = await supabaseAdmin
      .from('orders')
      .select(
        `
        id,
        internal_ref,
        basket_link,
        order_source,
        status,
        customer:customer_id ( name, phone )
      `
      )
      .in('id', orderIds)
    if (oErr) throw oErr
    orderMap = Object.fromEntries((ords || []).map((o) => [o.id, o]))
  }
  let itemsByOrder = {}
  if (orderIds.length > 0) {
    const { data: items, error: iErr } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, name, quantity, unit_price, currency, availability')
      .in('order_id', orderIds)
    if (iErr) throw iErr
    itemsByOrder = {}
    for (const it of items || []) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
      itemsByOrder[it.order_id].push(it)
    }
  }

  const enriched = (lines || []).map((line) => ({
    ...line,
    order: orderMap[line.order_id] || null,
    items: itemsByOrder[line.order_id] || [],
  }))

  const { data: paymentRows, error: pErr } = await supabaseAdmin
    .from('shein_purchase_batch_payments')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })
  if (pErr && pErr.code !== 'PGRST116') throw pErr

  const payments = paymentRows || []
  const paymentIds = payments.map((p) => p.id)

  let paymentOrders = []
  if (paymentIds.length > 0) {
    const { data: poRows, error: poErr } = await supabaseAdmin
      .from('shein_purchase_payment_orders')
      .select('id, payment_id, order_id, created_at')
      .in('payment_id', paymentIds)
    if (poErr) throw poErr
    paymentOrders = poRows || []
  }

  const txIds = payments.map((p) => p.transaction_id).filter(Boolean)
  let txMap = {}
  if (txIds.length > 0) {
    const { data: txRows, error: txErr } = await supabaseAdmin
      .from('financial_transactions')
      .select('id, account_id, transaction_type, amount, currency, exchange_rate, amount_in_base_currency, description, reference_type, reference_id, transaction_date, created_at')
      .in('id', txIds)
    if (txErr) throw txErr
    txMap = Object.fromEntries((txRows || []).map((tx) => [tx.id, tx]))
  }

  const orderLinksByPayment = {}
  for (const pr of paymentOrders) {
    if (!orderLinksByPayment[pr.payment_id]) orderLinksByPayment[pr.payment_id] = []
    orderLinksByPayment[pr.payment_id].push(pr)
  }

  const enrichedPayments = payments.map((p) => ({
    ...p,
    transaction: p.transaction_id ? txMap[p.transaction_id] || null : null,
    orders: (orderLinksByPayment[p.id] || []).map((r) => ({
      order_id: r.order_id,
      order: orderMap[r.order_id] || null,
    })),
  }))

  return { ...batch, batch_orders: enriched, payments: enrichedPayments }
}

/**
 * @param {string} batchId
 * @param {Array<{ order_id: string, outcome: string, notes?: string, oos_item_ids?: string[] }>} updates
 * @param {{ applyPurchaseFields?: boolean, split?: { voucher_amount?: number, payment_amount?: number } }} opts
 */
async function updateBatchOrderOutcomes(batchId, updates, opts = {}) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  const applyPurchaseFields = opts.applyPurchaseFields === true

  const { data: batch, error: bErr } = await supabaseAdmin
    .from('shein_purchase_batches')
    .select('id, status, payment_account_id, voucher_account_id, fx_json')
    .eq('id', batchId)
    .single()
  if (bErr) throw bErr
  if (!batch) throw new Error('الدفعة غير موجودة')
  if (batch.status !== 'confirmed') {
    throw new Error('يمكن تحديث النتائج فقط للدفعات المؤكدة')
  }
  if (!batch.payment_account_id) {
    throw new Error('لا يوجد حساب دفع مرتبط بهذه الدفعة')
  }

  const toLYD =
    batch.fx_json && typeof batch.fx_json === 'object' && batch.fx_json.toLYD
      ? batch.fx_json.toLYD
      : { LYD: 1, USD: 1, EUR: 1, GBP: 1, TRY: 1 }

  for (const u of updates || []) {
    const { order_id, outcome, notes, oos_item_ids } = u
    if (!order_id || !OUTCOMES.includes(outcome)) {
      throw new Error('order_id أو outcome غير صالح')
    }

    const { error: uErr } = await supabaseAdmin
      .from('shein_purchase_batch_orders')
      .update({
        outcome,
        notes: notes != null ? String(notes) : null,
        oos_item_ids:
          Array.isArray(oos_item_ids) && oos_item_ids.length > 0
            ? oos_item_ids
            : outcome === 'partial_oos'
              ? []
              : null,
      })
      .eq('batch_id', batchId)
      .eq('order_id', order_id)
    if (uErr) throw uErr

    const oosSet = new Set((oos_item_ids || []).filter(Boolean))

    if (outcome === 'partial_oos' && oosSet.size > 0) {
      const { error: oosErr } = await supabaseAdmin
        .from('order_items')
        .update({ availability: 'out_of_stock' })
        .in('id', [...oosSet])
        .eq('order_id', order_id)
      if (oosErr) throw oosErr
    }

    if (applyPurchaseFields && (outcome === 'purchased' || outcome === 'partial_oos')) {
      const { data: orderItems, error: itemsErr } = await supabaseAdmin
        .from('order_items')
        .select('id, unit_price, currency, quantity')
        .eq('order_id', order_id)
      if (itemsErr) throw itemsErr

      for (const item of orderItems || []) {
        if (outcome === 'partial_oos' && oosSet.has(item.id)) continue
        const cur = (item.currency || 'USD').toUpperCase()
        const ex = parseFloat(toLYD[cur]) || 1
        const { error: puErr } = await supabaseAdmin
          .from('order_items')
          .update({
            purchase_account_id: batch.payment_account_id,
            purchase_price: parseFloat(item.unit_price) || 0,
            purchase_currency: cur,
            purchase_exchange_rate: ex,
          })
          .eq('id', item.id)
        if (puErr) throw puErr
      }
    }
  }

  await postBatchPurchasePayments(batch, updates, opts?.split || {})

  return getBatch(batchId)
}

function calculateOutcomeTotals(batch, updates, orderItemsByOrder = null) {
  const toLYD =
    batch.fx_json && typeof batch.fx_json === 'object' && batch.fx_json.toLYD
      ? batch.fx_json.toLYD
      : { LYD: 1, USD: 1, EUR: 1, GBP: 1, TRY: 1 }

  const updatesMap = new Map((updates || []).map((u) => [u.order_id, u]))
  let totalLYD = 0
  const byCurrency = {}
  const paidOrderIds = []

  for (const line of batch.batch_orders || []) {
    const u = updatesMap.get(line.order_id)
    if (!u) continue
    const outcome = u.outcome
    if (outcome !== 'purchased' && outcome !== 'partial_oos') continue
    paidOrderIds.push(line.order_id)
    const oosSet = new Set((u.oos_item_ids || []).filter(Boolean))
    const items = (orderItemsByOrder && orderItemsByOrder[line.order_id]) || line.items || []
    for (const item of items) {
      if (outcome === 'partial_oos' && oosSet.has(item.id)) continue
      const cur = normalizeCurrency(item.currency)
      const qty = toNumber(item.quantity, 1)
      const unit = toNumber(item.unit_price, 0)
      const amount = unit * qty
      if (!byCurrency[cur]) byCurrency[cur] = 0
      byCurrency[cur] += amount
      totalLYD += amount * toNumber(toLYD[cur], 1)
    }
  }

  return {
    total_lyd: totalLYD,
    by_currency: byCurrency,
    paid_order_ids: [...new Set(paidOrderIds)],
  }
}

async function postBatchPurchasePayments(batch, updates, split = {}) {
  if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
  const { data: existing, error: eErr } = await supabaseAdmin
    .from('shein_purchase_batch_payments')
    .select('id')
    .eq('batch_id', batch.id)
    .limit(1)
  if (eErr) throw eErr
  if ((existing || []).length > 0) {
    throw new Error('تم تسجيل مدفوعات لهذه الدفعة مسبقاً. قم بعكسها أولاً قبل إعادة التسجيل.')
  }

  const fetched = await getBatch(batch.id)
  const totals = calculateOutcomeTotals(fetched, updates)
  const targetTotal = toNumber(totals.total_lyd, 0)
  const voucherAmount = Math.max(0, toNumber(split.voucher_amount, 0))
  const paymentAmount = Math.max(0, toNumber(split.payment_amount, 0))
  const splitSum = voucherAmount + paymentAmount
  if (Math.abs(splitSum - targetTotal) > MONEY_EPSILON) {
    throw new Error(
      `مجموع التقسيم (${splitSum.toFixed(2)}) لا يساوي إجمالي الشراء (${targetTotal.toFixed(2)})`
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const jobs = []
  if (voucherAmount > MONEY_EPSILON) {
    if (!batch.voucher_account_id) throw new Error('لا يوجد حساب قسيمة مرتبط بالدفعة')
    jobs.push({
      role: 'shein_voucher',
      account_id: batch.voucher_account_id,
      amount_lyd: voucherAmount,
    })
  }
  if (paymentAmount > MONEY_EPSILON) {
    if (!batch.payment_account_id) throw new Error('لا يوجد حساب دفع مرتبط بالدفعة')
    jobs.push({
      role: 'shein_payment',
      account_id: batch.payment_account_id,
      amount_lyd: paymentAmount,
    })
  }

  for (const job of jobs) {
    const acc = await financialAccount.getById(job.account_id)
    if (!acc) throw new Error('الحساب المالي المحدد غير موجود')
    const accountCurrency = normalizeCurrency(acc.currency || 'LYD')
    const toLYD =
      batch.fx_json && typeof batch.fx_json === 'object' && batch.fx_json.toLYD
        ? batch.fx_json.toLYD
        : {}
    const ex = toNumber(toLYD[accountCurrency], accountCurrency === 'LYD' ? 1 : 0)
    if (ex <= 0) {
      throw new Error(`لا يوجد سعر صرف صالح لعملة الحساب ${accountCurrency}`)
    }
    const amountAccountCurrency = accountCurrency === 'LYD' ? job.amount_lyd : job.amount_lyd / ex

    const tx = await financialTransaction.create({
      account_id: job.account_id,
      transaction_type: 'debit',
      amount: amountAccountCurrency,
      currency: accountCurrency,
      exchange_rate: ex,
      amount_in_base_currency: job.amount_lyd,
      description: `شراء SHEIN دفعة ${String(batch.id).slice(0, 8)}`,
      reference_type: 'shein_purchase_batch',
      reference_id: batch.id,
      transaction_date: today,
      notes: `role=${job.role}`,
    })

    const { data: paymentRow, error: pErr } = await supabaseAdmin
      .from('shein_purchase_batch_payments')
      .insert([
        {
          batch_id: batch.id,
          account_id: job.account_id,
          source_role: job.role,
          amount: amountAccountCurrency,
          currency: accountCurrency,
          exchange_rate: ex,
          amount_in_base_currency: job.amount_lyd,
          transaction_id: tx.id,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()
    if (pErr) throw pErr

    if (totals.paid_order_ids.length > 0) {
      const mapRows = totals.paid_order_ids.map((order_id) => ({
        payment_id: paymentRow.id,
        order_id,
      }))
      const { error: mErr } = await supabaseAdmin
        .from('shein_purchase_payment_orders')
        .insert(mapRows)
      if (mErr) throw mErr
    }
  }
}

module.exports = {
  listRegistry,
  addRegistry,
  removeRegistry,
  createDraftBatch,
  confirmBatch,
  getBatch,
  updateBatchOrderOutcomes,
  calculateOutcomeTotals,
  REGISTRY_ROLES,
  OUTCOMES,
}
