'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { HiPlus, HiRefresh, HiTrash, HiPencil, HiEye, HiEyeOff, HiPhotograph, HiTag, HiCurrencyDollar } from 'react-icons/hi'
import styles from './catalog-products.module.css'

const EMPTY_FORM = {
  name: '',
  name_ar: '',
  description: '',
  price: '',
  currency: 'LYD',
  image_url: '',
  category: '',
  is_active: true,
  sort_order: 0,
}

export default function CatalogProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/catalog/products?active_only=false&limit=200')
      if (!res.ok) throw new Error('فشل تحميل المنتجات')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
      setError('')
    } catch (e) {
      setError(e.message || 'حدث خطأ')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('اسم المنتج مطلوب'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/catalog/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0, sort_order: parseInt(form.sort_order, 10) || 0 }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'فشل الحفظ') }
      setForm({ ...EMPTY_FORM, sort_order: products.length })
      setShowForm(false)
      fetchProducts()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (id, current) => {
    try {
      const res = await fetch(`/api/catalog/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current }),
      })
      if (!res.ok) throw new Error('فشل التحديث')
      fetchProducts()
    } catch (e) { setError(e.message) }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/catalog/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة')
      setForm(f => ({ ...f, image_url: data.url }))
    } catch (err) { setError(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا المنتج؟')) return
    try {
      const res = await fetch(`/api/catalog/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      fetchProducts()
    } catch (e) { setError(e.message) }
  }

  const activeCount = products.filter(p => p.is_active).length
  const hiddenCount = products.length - activeCount

  return (
    <div className={styles.page} dir="rtl">

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>
            </div>
            <h1 className={styles.title}>منتجات الكتالوج</h1>
          </div>
          <p className={styles.subtitle}>
            المنتجات المعروضة في{' '}
            <Link href="/customer/products" target="_blank" rel="noopener" className={styles.subtitleLink}>
              صفحة العملاء
            </Link>
          </p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnGhost} onClick={fetchProducts} disabled={loading}>
            <HiRefresh className={loading ? styles.spinning : ''} />
            <span>تحديث</span>
          </button>
          <button
            type="button"
            className={showForm ? styles.btnOutline : styles.btnPrimary}
            onClick={() => { setShowForm(!showForm); setError('') }}
          >
            <HiPlus className={showForm ? styles.rotated : ''} />
            <span>{showForm ? 'إلغاء' : 'إضافة منتج'}</span>
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{products.length}</span>
          <span className={styles.statLabel}>إجمالي المنتجات</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardGreen}`}>
          <span className={styles.statValue}>{activeCount}</span>
          <span className={styles.statLabel}>ظاهر للعملاء</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardAmber}`}>
          <span className={styles.statValue}>{hiddenCount}</span>
          <span className={styles.statLabel}>مخفي</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className={styles.errorBanner}>
          <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className={styles.errorDismiss}>×</button>
        </div>
      )}

      {/* ── Add product form ── */}
      {showForm && (
        <div className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <h2 className={styles.formCardTitle}>منتج جديد</h2>
            <span className={styles.formCardBadge}>مسودة</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Row 1: names */}
            <div className={styles.formGrid2}>
              <div className={styles.field}>
                <label className={styles.label}>الاسم بالإنجليزية <span className={styles.required}>*</span></label>
                <input className={styles.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>الاسم بالعربية</label>
                <input className={styles.input} value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="اسم المنتج" dir="rtl" />
              </div>
            </div>

            {/* Row 2: price / currency / category / sort */}
            <div className={styles.formGrid4}>
              <div className={styles.field}>
                <label className={styles.label}>السعر <span className={styles.required}>*</span></label>
                <div className={styles.inputGroup}>
                  <HiCurrencyDollar className={styles.inputIcon} />
                  <input className={`${styles.input} ${styles.inputWithIcon}`} type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>العملة</label>
                <select className={styles.select} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option value="LYD">د.ل (LYD)</option>
                  <option value="USD">دولار (USD)</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>التصنيف</label>
                <div className={styles.inputGroup}>
                  <HiTag className={styles.inputIcon} />
                  <input className={`${styles.input} ${styles.inputWithIcon}`} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="مثال: ملابس" />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>ترتيب العرض</label>
                <input className={styles.input} type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })} />
              </div>
            </div>

            {/* Row 3: image */}
            <div className={styles.field}>
              <label className={styles.label}>صورة المنتج</label>
              <div className={styles.imageRow}>
                <label className={`${styles.uploadBtn} ${uploading ? styles.uploadBtnLoading : ''}`}>
                  <HiPhotograph />
                  <span>{uploading ? 'جاري الرفع...' : 'رفع من الجهاز'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
                <input
                  className={`${styles.input} ${styles.imageUrlInput}`}
                  type="url"
                  value={form.image_url}
                  onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="أو الصق رابط الصورة هنا"
                />
                {form.image_url && (
                  <div className={styles.imagePreviewWrap}>
                    <img src={form.image_url} alt="معاينة" className={styles.imagePreview} />
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: description */}
            <div className={styles.field}>
              <label className={styles.label}>الوصف</label>
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="وصف اختياري للمنتج..."
                rows={2}
              />
            </div>

            {/* Row 5: visibility toggle + submit */}
            <div className={styles.formFooter}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.is_active ? styles.toggleOn : ''}`}
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span>{form.is_active ? 'ظاهر للعملاء' : 'مخفي من العملاء'}</span>
              </label>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                {saving ? (
                  <><span className={styles.btnSpinner} /> جاري الحفظ...</>
                ) : (
                  <><HiPlus /> حفظ المنتج</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Products table ── */}
      {loading ? (
        <div className={styles.loadingState}>
          {[0, 1, 2].map(i => (
            <div key={i} className={styles.skeletonRow} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={styles.skThumb} />
              <div className={styles.skLines}>
                <div className={styles.skLine} style={{ width: '55%' }} />
                <div className={styles.skLine} style={{ width: '30%' }} />
              </div>
              <div className={styles.skChip} />
              <div className={styles.skChip} style={{ width: 60 }} />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="14" width="32" height="26" rx="3"/><path d="M16 14V10a8 8 0 0116 0v4"/><path d="M20 26l3 3 6-6"/></svg>
          </div>
          <h3 className={styles.emptyTitle}>لا توجد منتجات بعد</h3>
          <p className={styles.emptyText}>ابدأ بإضافة أول منتج في الكتالوج</p>
          <button type="button" className={styles.btnPrimary} onClick={() => setShowForm(true)}>
            <HiPlus /> إضافة منتج
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>التصنيف</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p.id} className={styles.tableRow} style={{ animationDelay: `${idx * 0.04}s` }}>
                  {/* Product cell */}
                  <td className={styles.productCell}>
                    <div className={styles.productThumbWrap}>
                      {(p.image_url || p.images?.[0]) ? (
                        <img src={p.image_url || p.images[0]} alt="" className={styles.productThumb} />
                      ) : (
                        <div className={styles.productThumbFallback}>
                          <HiPhotograph />
                        </div>
                      )}
                    </div>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{p.name_ar || p.name}</span>
                      {p.name_ar && p.name && <span className={styles.productNameSub}>{p.name}</span>}
                    </div>
                  </td>

                  {/* Price */}
                  <td>
                    <span className={styles.priceTag}>
                      {Number(p.price).toLocaleString('ar-LY')} <span className={styles.priceCurrency}>{p.currency}</span>
                    </span>
                  </td>

                  {/* Category */}
                  <td>
                    {p.category
                      ? <span className={styles.categoryBadge}>{p.category}</span>
                      : <span className={styles.dash}>—</span>}
                  </td>

                  {/* Sort order */}
                  <td><span className={styles.sortOrder}>{p.sort_order}</span></td>

                  {/* Status toggle */}
                  <td>
                    <button
                      type="button"
                      className={`${styles.statusBtn} ${p.is_active ? styles.statusBtnActive : styles.statusBtnHidden}`}
                      onClick={() => handleToggleActive(p.id, p.is_active)}
                      title={p.is_active ? 'اضغط للإخفاء' : 'اضغط للإظهار'}
                    >
                      {p.is_active ? <><HiEye /> ظاهر</> : <><HiEyeOff /> مخفى</>}
                    </button>
                  </td>

                  {/* Actions */}
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleDelete(p.id)}
                        title="حذف المنتج"
                      >
                        <HiTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}