'use client'

import { useState, useEffect } from 'react'
import styles from '../payments.module.css'
import { 
  HiCurrencyDollar, 
  HiPlus, 
  HiPencil, 
  HiTrash,
  HiShoppingBag,
  HiX
} from 'react-icons/hi'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    description: '',
    cost: '',
    currency: 'LYD',
    category: 'packaging',
    isActive: true
  })

  const categories = [
    { id: 'packaging', name: 'تغليف', nameEn: 'Packaging' },
    { id: 'shipping', name: 'شحن', nameEn: 'Shipping' },
    { id: 'storage', name: 'تخزين', nameEn: 'Storage' },
    { id: 'other', name: 'أخرى', nameEn: 'Other' }
  ]

  const currencies = [
    { code: 'LYD', name: 'دينار ليبي', symbol: 'د.ل' },
    { code: 'EUR', name: 'يورو', symbol: '€' },
    { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
    { code: 'GBP', name: 'جنيه إسترليني', symbol: '£' },
    { code: 'TRY', name: 'ليرة تركية', symbol: '₺' }
  ]

  const formatCurrency = (amount, currency = 'LYD') => {
    const currencyInfo = currencies.find(c => c.code === currency)
    const symbol = currencyInfo?.symbol || currency
    return `${amount.toFixed(2)} ${symbol}`
  }

  // Fetch expenses from database
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/expenses')
        if (response.ok) {
          const data = await response.json()
          setExpenses(data)
        } else {
          console.error('Failed to fetch expenses')
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchExpenses()
  }, [])

  const handleAddExpense = () => {
    setEditingExpense(null)
    setFormData({
      name: '',
      nameEn: '',
      description: '',
      cost: '',
      currency: 'LYD',
      category: 'packaging',
      isActive: true
    })
    setShowAddModal(true)
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setFormData({
      name: expense.name,
      nameEn: expense.name_en || '',
      description: expense.description || '',
      cost: expense.cost.toString(),
      currency: expense.currency,
      category: expense.category,
      isActive: expense.is_active !== false
    })
    setShowAddModal(true)
  }

  const handleSaveExpense = async () => {
    if (!formData.name || !formData.cost) {
      alert('الرجاء إدخال الاسم والتكلفة')
      return
    }

    try {
      const expenseData = {
        name: formData.name,
        nameEn: formData.nameEn || null,
        description: formData.description || null,
        cost: parseFloat(formData.cost),
        currency: formData.currency,
        category: formData.category,
        is_active: formData.isActive
      }

      if (editingExpense) {
        // Update existing expense
        const response = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(expenseData)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update expense')
        }

        const updated = await response.json()
        setExpenses(expenses.map(exp => 
          exp.id === editingExpense.id ? updated : exp
        ))
        alert('تم تحديث المصروف بنجاح')
      } else {
        // Create new expense
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(expenseData)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create expense')
        }

        const newExpense = await response.json()
        setExpenses([...expenses, newExpense])
        alert('تم إضافة المصروف بنجاح')
      }

      setShowAddModal(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Error saving expense:', error)
      alert(`حدث خطأ: ${error.message}`)
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete expense')
      }

      setExpenses(expenses.filter(exp => exp.id !== id))
      alert('تم حذف المصروف بنجاح')
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert(`حدث خطأ: ${error.message}`)
    }
  }

  const handleToggleActive = async (id) => {
    const expense = expenses.find(exp => exp.id === id)
    if (!expense) return

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !expense.is_active
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update expense')
      }

      const updated = await response.json()
      setExpenses(expenses.map(exp => 
        exp.id === id ? updated : exp
      ))
    } catch (error) {
      console.error('Error toggling expense active status:', error)
      alert(`حدث خطأ: ${error.message}`)
    }
  }

  return (
    <div className={styles.paymentsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiShoppingBag className={styles.titleIcon} />
            المصروفات
          </h1>
          <p className={styles.pageSubtitle}>
            إدارة المصروفات التي يمكن إضافتها للطلبات (مثل أكياس التغليف، الشحن، إلخ)
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={handleAddExpense}>
            <HiPlus />
            إضافة مصروف جديد
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الاسم بالإنجليزية</th>
              <th>الوصف</th>
              <th>التكلفة</th>
              <th>الفئة</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                  جاري التحميل...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                  لا توجد مصروفات. اضغط على "إضافة مصروف جديد" لبدء الإضافة.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className={styles.paymentId}>{expense.name}</td>
                  <td>{expense.name_en || '-'}</td>
                  <td>{expense.description || '-'}</td>
                  <td className={styles.amount}>{formatCurrency(expense.cost, expense.currency)}</td>
                  <td>
                    <span className={styles.badge}>
                      {categories.find(c => c.id === expense.category)?.name || expense.category}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${expense.is_active ? styles.badgeReceived : styles.badgePending}`}>
                      {expense.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionButton}
                        onClick={() => handleToggleActive(expense.id)}
                        title={expense.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        {expense.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button 
                        className={styles.actionButton}
                        onClick={() => handleEditExpense(expense)}
                      >
                        <HiPencil />
                        تعديل
                      </button>
                      <button 
                        className={styles.actionButton}
                        onClick={() => handleDeleteExpense(expense.id)}
                        style={{ color: 'var(--error)' }}
                      >
                        <HiTrash />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
              </h2>
              <button className={styles.closeButton} onClick={() => setShowAddModal(false)}>
                <HiX />
              </button>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.modalFormGroup}>
                <label className={styles.required}>الاسم (عربي) *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.modalInput}
                  placeholder="مثال: كيس بلاستيك"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>الاسم (إنجليزي)</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className={styles.modalInput}
                  placeholder="Example: Plastic Bag"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={styles.modalTextarea}
                  placeholder="وصف تفصيلي للمصروف"
                  rows="3"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className={styles.modalFormGroup}>
                  <label className={styles.required}>التكلفة *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className={styles.modalInput}
                    placeholder="0.00"
                  />
                </div>

                <div className={styles.modalFormGroup}>
                  <label className={styles.required}>العملة *</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={styles.modalSelect}
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name} ({curr.code}) {curr.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalFormGroup}>
                  <label className={styles.required}>الفئة *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={styles.modalSelect}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalCancelButton} onClick={() => setShowAddModal(false)}>
                  إلغاء
                </button>
                <button
                  className={styles.modalSaveButton}
                  onClick={handleSaveExpense}
                  disabled={!formData.name || !formData.cost}
                >
                  {editingExpense ? 'حفظ التعديلات' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

