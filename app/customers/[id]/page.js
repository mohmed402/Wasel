'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './customer-detail.module.css'
import {
  HiUser,
  HiPhone,
  HiMail,
  HiLocationMarker,
  HiChat,
  HiShare,
  HiShoppingBag,
  HiCurrencyDollar,
  HiPencil,
  HiTrash,
  HiX,
  HiCheck,
  HiCalendar,
  HiArrowLeft
} from 'react-icons/hi'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    fb_account: '',
    wh_account: '',
    preferred_contact: '',
    notes: '',
    is_active: true
  })

  // Sample customer data - replace with real API call
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])

  useEffect(() => {
    // TODO: Replace with actual API call
    // const fetchCustomer = async () => {
    //   try {
    //     const { customer: customerOps } = require('../../../../server/supabase')
    //     const data = await customerOps.getById(customerId)
    //     setCustomer(data)
    //     setFormData({
    //       name: data.name || '',
    //       phone: data.phone || '',
    //       email: data.email || '',
    //       address: data.address || '',
    //       fb_account: data.fb_account || '',
    //       wh_account: data.wh_account || '',
    //       preferred_contact: data.preferred_contact || '',
    //       notes: data.notes || '',
    //       is_active: data.is_active !== false
    //     })
    //   } catch (error) {
    //     console.error('Error fetching customer:', error)
    //   } finally {
    //     setLoading(false)
    //   }
    // }
    // fetchCustomer()

    // Sample data
    setTimeout(() => {
      const sampleCustomer = {
        id: customerId,
        name: 'أحمد محمد علي',
        phone: '0912345678',
        email: 'ahmed.mohammed@example.com',
        address: 'طرابلس، شارع الجمهورية، بناية رقم 15، الطابق الثاني',
        fb_account: 'https://facebook.com/ahmed.mohammed',
        wh_account: '+218912345678',
        preferred_contact: 'whatsapp',
        total_orders: 5,
        total_spent: 1250.00,
        last_order_date: '2024-01-20',
        is_active: true,
        notes: 'عميل متكرر، يفضل التواصل عبر واتساب',
        created_at: '2023-06-15T10:30:00Z',
        updated_at: '2024-01-20T14:20:00Z'
      }
      setCustomer(sampleCustomer)
      setFormData({
        name: sampleCustomer.name,
        phone: sampleCustomer.phone,
        email: sampleCustomer.email,
        address: sampleCustomer.address,
        fb_account: sampleCustomer.fb_account,
        wh_account: sampleCustomer.wh_account,
        preferred_contact: sampleCustomer.preferred_contact,
        notes: sampleCustomer.notes,
        is_active: sampleCustomer.is_active
      })
      setOrders([
        { id: 'ORD-001', date: '2024-01-20', amount: 250, status: 'delivered' },
        { id: 'ORD-002', date: '2024-01-10', amount: 180, status: 'shipping' },
        { id: 'ORD-003', date: '2023-12-15', amount: 320, status: 'delivered' }
      ])
      setPayments([
        { id: 'PAY-001', type: 'deposit', amount: 100, date: '2024-01-20', status: 'received' },
        { id: 'PAY-002', type: 'balance', amount: 150, date: '2024-01-25', status: 'received' }
      ])
      setLoading(false)
    }, 500)
  }, [customerId])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: Replace with actual API call
      // const { customer: customerOps } = require('../../../../server/supabase')
      // const updated = await customerOps.update(customerId, formData)
      // setCustomer(updated)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setCustomer({ ...customer, ...formData })
      setIsEditing(false)
      alert('تم تحديث بيانات العميل بنجاح')
    } catch (error) {
      console.error('Error updating customer:', error)
      alert('حدث خطأ أثناء تحديث بيانات العميل')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original customer data
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        fb_account: customer.fb_account || '',
        wh_account: customer.wh_account || '',
        preferred_contact: customer.preferred_contact || '',
        notes: customer.notes || '',
        is_active: customer.is_active !== false
      })
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      // TODO: Replace with actual API call
      // const { customer: customerOps } = require('../../../../server/supabase')
      // await customerOps.delete(customerId)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('تم حذف العميل بنجاح')
      router.push('/customers/all')
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert('حدث خطأ أثناء حذف العميل')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getContactIcon = (preferredContact) => {
    switch (preferredContact) {
      case 'phone':
        return <HiPhone className={styles.contactIcon} />
      case 'whatsapp':
        return <HiChat className={styles.contactIcon} />
      case 'facebook':
        return <HiShare className={styles.contactIcon} />
      case 'email':
        return <HiMail className={styles.contactIcon} />
      default:
        return null
    }
  }

  const getContactLabel = (preferredContact) => {
    const labels = {
      phone: 'هاتف',
      whatsapp: 'واتساب',
      facebook: 'فيسبوك',
      email: 'بريد إلكتروني'
    }
    return labels[preferredContact] || preferredContact
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>جاري التحميل...</p>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className={styles.error}>
        <p>العميل غير موجود</p>
        <button onClick={() => router.push('/customers/all')} className={styles.backButton}>
          <HiArrowLeft />
          العودة إلى قائمة العملاء
        </button>
      </div>
    )
  }

  return (
    <div className={styles.customerDetail}>
      <div className={styles.header}>
        <div>
          <button onClick={() => router.push('/customers/all')} className={styles.backButton}>
            <HiArrowLeft />
            العودة
          </button>
          <h1 className={styles.title}>تفاصيل العميل</h1>
          <p className={styles.subtitle}>
            تاريخ التسجيل: {new Date(customer.created_at).toLocaleDateString('ar-LY')}
          </p>
        </div>
        <div className={styles.headerActions}>
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                <HiPencil />
                تعديل
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className={styles.deleteButton}>
                <HiTrash />
                حذف
              </button>
            </>
          ) : (
            <>
              <button onClick={handleSave} className={styles.saveButton} disabled={saving}>
                <HiCheck />
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={handleCancel} className={styles.cancelButton} disabled={saving}>
                <HiX />
                إلغاء
              </button>
            </>
          )}
          {customer.is_active !== false ? (
            <span className={`${styles.badge} ${styles.badgeActive}`}>نشط</span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeInactive}`}>غير نشط</span>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من حذف هذا العميل؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className={styles.modalActions}>
              <button
                onClick={handleDelete}
                className={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={styles.cancelDeleteButton}
                disabled={deleting}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* Customer Basic Info */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiUser />
            المعلومات الأساسية
          </h2>
          {isEditing ? (
            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>الاسم *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>العنوان</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows="3"
                />
              </div>
              <div className={styles.formGroup}>
                <label>حساب فيسبوك</label>
                <input
                  type="text"
                  name="fb_account"
                  value={formData.fb_account}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="https://facebook.com/username"
                />
              </div>
              <div className={styles.formGroup}>
                <label>حساب واتساب</label>
                <input
                  type="text"
                  name="wh_account"
                  value={formData.wh_account}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="+218912345678"
                />
              </div>
              <div className={styles.formGroup}>
                <label>طريقة التواصل المفضلة</label>
                <select
                  name="preferred_contact"
                  value={formData.preferred_contact}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="">اختر طريقة التواصل</option>
                  <option value="phone">هاتف</option>
                  <option value="whatsapp">واتساب</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="email">بريد إلكتروني</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>ملاحظات</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows="4"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className={styles.checkbox}
                  />
                  <span>العميل نشط</span>
                </label>
              </div>
            </div>
          ) : (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>الاسم:</span>
                <span className={styles.infoValue}>{customer.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <HiPhone />
                  رقم الهاتف:
                </span>
                <span className={styles.infoValue}>{customer.phone || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <HiMail />
                  البريد الإلكتروني:
                </span>
                <span className={styles.infoValue}>
                  {customer.email ? (
                    <a href={`mailto:${customer.email}`} className={styles.emailLink}>
                      {customer.email}
                    </a>
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <HiLocationMarker />
                  العنوان:
                </span>
                <span className={styles.infoValue}>{customer.address || '-'}</span>
              </div>
              {customer.fb_account && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <HiShare />
                    حساب فيسبوك:
                  </span>
                  <span className={styles.infoValue}>
                    <a href={customer.fb_account} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      {customer.fb_account}
                    </a>
                  </span>
                </div>
              )}
              {customer.wh_account && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <HiChat />
                    حساب واتساب:
                  </span>
                  <span className={styles.infoValue}>{customer.wh_account}</span>
                </div>
              )}
              {customer.preferred_contact && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>طريقة التواصل المفضلة:</span>
                  <span className={styles.infoValue}>
                    <div className={styles.contactInfo}>
                      {getContactIcon(customer.preferred_contact)}
                      {getContactLabel(customer.preferred_contact)}
                    </div>
                  </span>
                </div>
              )}
              {customer.notes && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>ملاحظات:</span>
                  <span className={styles.infoValue}>{customer.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiCurrencyDollar />
            الإحصائيات
          </h2>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>عدد الطلبات</span>
              <span className={styles.statValue}>{customer.total_orders || 0}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>إجمالي المشتريات</span>
              <span className={styles.statValue}>
                {(customer.total_spent || 0).toFixed(2)} د.ل
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>آخر طلب</span>
              <span className={styles.statValue}>
                {customer.last_order_date
                  ? new Date(customer.last_order_date).toLocaleDateString('ar-LY')
                  : '-'}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>تاريخ التسجيل</span>
              <span className={styles.statValue}>
                {new Date(customer.created_at).toLocaleDateString('ar-LY')}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiShoppingBag />
            الطلبات الأخيرة
          </h2>
          {orders.length > 0 ? (
            <div className={styles.list}>
              {orders.map((order) => (
                <div key={order.id} className={styles.listItem}>
                  <div className={styles.listItemInfo}>
                    <span className={styles.listItemTitle}>{order.id}</span>
                    <span className={styles.listItemSubtitle}>
                      {new Date(order.date).toLocaleDateString('ar-LY')} - {order.amount} د.ل
                    </span>
                  </div>
                  <span className={styles.listItemStatus}>{order.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>لا توجد طلبات</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <HiCurrencyDollar />
            المدفوعات الأخيرة
          </h2>
          {payments.length > 0 ? (
            <div className={styles.list}>
              {payments.map((payment) => (
                <div key={payment.id} className={styles.listItem}>
                  <div className={styles.listItemInfo}>
                    <span className={styles.listItemTitle}>
                      {payment.type === 'deposit' ? 'وديعة' : payment.type === 'refund' ? 'استرداد' : 'رصيد'}
                    </span>
                    <span className={styles.listItemSubtitle}>
                      {new Date(payment.date).toLocaleDateString('ar-LY')} - {payment.amount} د.ل
                    </span>
                  </div>
                  <span className={styles.listItemStatus}>{payment.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>لا توجد مدفوعات</p>
          )}
        </div>
      </div>
    </div>
  )
}



