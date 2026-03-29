'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from '../../orders/orders.module.css'
import { HiPlus, HiRefresh, HiTrash } from 'react-icons/hi'

export default function CatalogProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    price: '',
    currency: 'LYD',
    image_url: '',
    category: '',
    is_active: true,
    sort_order: 0
  })

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

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('اسم المنتج مطلوب')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/catalog/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          sort_order: parseInt(form.sort_order, 10) || 0
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'فشل الحفظ')
      }
      setForm({ name: '', name_ar: '', description: '', price: '', currency: 'LYD', image_url: '', category: '', is_active: true, sort_order: products.length })
      setShowForm(false)
      fetchProducts()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id, current) => {
    try {
      const res = await fetch(`/api/catalog/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !current })
      })
      if (!res.ok) throw new Error('فشل التحديث')
      fetchProducts()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/catalog/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل رفع الصورة')
      setForm((f) => ({ ...f, image_url: data.url }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا المنتج؟')) return
    try {
      const res = await fetch(`/api/catalog/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      fetchProducts()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className={styles.ordersPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>📦</span>
            منتجات الكتالوج
          </h1>
          <p className={styles.pageSubtitle}>
            المنتجات المعروضة في صفحة العملاء (<Link href="/customer/products" target="_blank" rel="noopener">قائمة المنتجات</Link>). أضف أو عدّل المنتجات هنا.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => fetchProducts()}
            disabled={loading}
          >
            <HiRefresh /> تحديث
          </button>
          <button
            type="button"
            className={styles.exportButton}
            onClick={() => setShowForm(!showForm)}
          >
            <HiPlus /> {showForm ? 'إلغاء' : 'إضافة منتج'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#B91C1C' }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>منتج جديد</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>الاسم (إنجليزي) *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Product name"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>الاسم (عربي)</label>
              <input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                placeholder="اسم المنتج"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>السعر *</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>العملة</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              >
                <option value="LYD">د.ل</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>التصنيف</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="مثال: ملابس"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>ترتيب العرض</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>صورة المنتج (رفع أو رابط)</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <label style={{ padding: '0.5rem 1rem', background: '#E5E7EB', borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                {uploading ? 'جاري الرفع...' : 'رفع من الجهاز'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
              </label>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="أو الصق رابط الصورة"
                style={{ flex: 1, minWidth: 200, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
              />
            </div>
            {form.image_url && (
              <div style={{ marginTop: 8 }}>
                <img src={form.image_url} alt="معاينة" style={{ maxWidth: 120, maxHeight: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #E5E7EB' }} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="وصف اختياري"
              rows={2}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: 6 }}
            />
          </div>
          <button type="submit" className={styles.exportButton} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </button>
        </form>
      )}

      {loading && <p style={{ color: '#6B7280' }}>جاري التحميل...</p>}
      {!loading && products.length === 0 && (
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
          لا توجد منتجات. استخدم «إضافة منتج» لرفع أول منتج. تأكد من تنفيذ جدول <code>catalog_products</code> في Supabase (انظر <code>catalog_products_schema.sql</code>).
        </div>
      )}
      {!loading && products.length > 0 && (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>الصورة</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>السعر</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>التصنيف</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>الترتيب</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>الحالة</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '0.75rem' }}>
                    {(p.image_url || (p.images && p.images[0])) ? (
                      <img src={p.image_url || p.images[0]} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{p.name_ar || p.name}</td>
                  <td style={{ padding: '0.75rem' }}>{p.price} {p.currency}</td>
                  <td style={{ padding: '0.75rem' }}>{p.category || '—'}</td>
                  <td style={{ padding: '0.75rem' }}>{p.sort_order}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p.id, p.is_active)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 6,
                        border: '1px solid #D1D5DB',
                        background: p.is_active ? '#D1FAE5' : '#FEE2E2',
                        color: p.is_active ? '#065F46' : '#B91C1C',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {p.is_active ? 'ظاهر' : 'مخفى'}
                    </button>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      style={{ padding: '0.35rem', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="حذف"
                    >
                      <HiTrash />
                    </button>
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
