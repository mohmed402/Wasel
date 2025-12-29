'use client'

import { useState } from 'react'
import PaymentFilters from '../../../components/PaymentFilters'
import PaymentsTable from '../../../components/PaymentsTable'
import styles from '../payments.module.css'
import { HiCurrencyDollar, HiCheckCircle, HiXCircle, HiClock, HiX } from 'react-icons/hi'

export default function DepositsPage() {
  const [filters, setFilters] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    requiredAmount: '',
    receivedAmount: '',
    paymentMethod: '',
    dateReceived: new Date().toISOString().split('T')[0],
    receivedBy: '',
    orderStatus: 'pending'
  })
  const [deposits, setDeposits] = useState([
    {
      id: 'DEP-001',
      orderId: 'ORD-001',
      customerName: 'أحمد محمد',
      paymentType: 'deposit',
      amount: 100,
      requiredAmount: 100,
      receivedAmount: 100,
      paymentMethod: 'transfer',
      dateReceived: '2024-01-15',
      receivedBy: 'محمد علي',
      status: 'received',
      depositStatus: 'received',
      orderStatus: 'ordered'
    },
    {
      id: 'DEP-002',
      orderId: 'ORD-002',
      customerName: 'فاطمة علي',
      paymentType: 'deposit',
      amount: 80,
      requiredAmount: 100,
      receivedAmount: 80,
      paymentMethod: 'cash',
      dateReceived: '2024-01-16',
      receivedBy: 'فاطمة أحمد',
      status: 'received',
      depositStatus: 'partial',
      orderStatus: 'pending'
    },
    {
      id: 'DEP-003',
      orderId: 'ORD-003',
      customerName: 'محمد خالد',
      paymentType: 'deposit',
      amount: 150,
      requiredAmount: 150,
      receivedAmount: 0,
      paymentMethod: null,
      dateReceived: null,
      receivedBy: null,
      status: 'pending',
      depositStatus: 'pending',
      orderStatus: 'pending'
    },
    {
      id: 'DEP-004',
      orderId: 'ORD-004',
      customerName: 'سارة أحمد',
      paymentType: 'deposit',
      amount: 120,
      requiredAmount: 120,
      receivedAmount: 120,
      paymentMethod: 'bank',
      dateReceived: '2024-01-10',
      receivedBy: 'خالد حسن',
      status: 'refunded',
      depositStatus: 'refunded',
      orderStatus: 'cancelled'
    }
  ])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddDeposit = () => {
    setShowAddModal(true)
    // Reset form
    setFormData({
      orderId: '',
      customerName: '',
      requiredAmount: '',
      receivedAmount: '',
      paymentMethod: '',
      dateReceived: new Date().toISOString().split('T')[0],
      receivedBy: '',
      orderStatus: 'pending'
    })
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
  }

  const handleSaveDeposit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.orderId || !formData.customerName || !formData.requiredAmount || !formData.receivedAmount) {
      alert('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    setSaving(true)
    try {
      // TODO: Replace with actual API call
      // const { payment } = require('../../../server/supabase')
      // const newDeposit = await payment.create({
      //   payment_type: 'deposit',
      //   payment_number: null, // Will be auto-generated
      //   order_id: formData.orderId,
      //   customer_name: formData.customerName,
      //   amount: parseFloat(formData.receivedAmount),
      //   required_amount: parseFloat(formData.requiredAmount),
      //   received_amount: parseFloat(formData.receivedAmount),
      //   payment_method: formData.paymentMethod || null,
      //   date_received: formData.dateReceived || null,
      //   received_by: formData.receivedBy || null,
      //   status: parseFloat(formData.receivedAmount) >= parseFloat(formData.requiredAmount) ? 'received' : 
      //           parseFloat(formData.receivedAmount) > 0 ? 'partial' : 'pending',
      //   deposit_status: parseFloat(formData.receivedAmount) >= parseFloat(formData.requiredAmount) ? 'received' : 
      //                   parseFloat(formData.receivedAmount) > 0 ? 'partial' : 'pending',
      //   order_status: formData.orderStatus
      // })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Determine status
      const receivedAmount = parseFloat(formData.receivedAmount)
      const requiredAmount = parseFloat(formData.requiredAmount)
      const depositStatus = receivedAmount >= requiredAmount ? 'received' : 
                           receivedAmount > 0 ? 'partial' : 'pending'

      // Create new deposit
      const newDeposit = {
        id: `DEP-${String(deposits.length + 1).padStart(3, '0')}`,
        orderId: formData.orderId,
        customerName: formData.customerName,
        paymentType: 'deposit',
        amount: receivedAmount,
        requiredAmount: requiredAmount,
        receivedAmount: receivedAmount,
        paymentMethod: formData.paymentMethod || null,
        dateReceived: formData.dateReceived || null,
        receivedBy: formData.receivedBy || null,
        status: depositStatus,
        depositStatus: depositStatus,
        orderStatus: formData.orderStatus
      }

      // Add to deposits list
      setDeposits([newDeposit, ...deposits])
      setShowAddModal(false)
      alert('تم تسجيل الوديعة بنجاح')
    } catch (error) {
      console.error('Error saving deposit:', error)
      alert('حدث خطأ أثناء حفظ الوديعة')
    } finally {
      setSaving(false)
    }
  }

  const getDepositStatusBadge = (status) => {
    const configs = {
      pending: { label: 'معلق', class: styles.badgePending, icon: HiClock },
      received: { label: 'مستلم', class: styles.badgeReceived, icon: HiCheckCircle },
      partial: { label: 'جزئي', class: styles.badgePartial, icon: HiClock },
      refunded: { label: 'مسترد', class: styles.badgeRefunded, icon: HiXCircle }
    }
    const config = configs[status] || { label: status, class: styles.badgeDefault, icon: HiClock }
    const Icon = config.icon
    return (
      <span className={`${styles.badge} ${config.class}`}>
        <Icon className={styles.badgeIcon} />
        {config.label}
      </span>
    )
  }

  return (
    <div className={styles.paymentsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <HiCurrencyDollar className={styles.titleIcon} />
            الودائع
          </h1>
          <p className={styles.pageSubtitle}>
            تتبع المدفوعات المقدمة قبل شراء الطلب
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleAddDeposit} className={styles.addButton}>
            تسجيل دفعة جديدة
          </button>
        </div>
      </div>

      {/* <div className={styles.infoBox}>
        <strong>💡 ما هي الودائع؟</strong>
        <p>المدفوعات المقدمة من العملاء قبل شراء الطلب من SHEIN. هذه الصفحة تحميك من الشراء بدون أموال.</p>
      </div> */}

      <PaymentFilters onFilterChange={handleFilterChange} />

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>إجمالي الودائع:</span>
          <span className={styles.statValue}>{deposits.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>مستلمة:</span>
          <span className={styles.statValue}>
            {deposits.filter(d => d.depositStatus === 'received').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>معلقة:</span>
          <span className={styles.statValue}>
            {deposits.filter(d => d.depositStatus === 'pending').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>جزئية:</span>
          <span className={styles.statValue}>
            {deposits.filter(d => d.depositStatus === 'partial').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>مستردة:</span>
          <span className={styles.statValue}>
            {deposits.filter(d => d.depositStatus === 'refunded').length}
          </span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>رقم الدفعة</th>
              <th>رقم الطلب</th>
              <th>اسم العميل</th>
              <th>المبلغ المطلوب</th>
              <th>المبلغ المستلم</th>
              <th>حالة الوديعة</th>
              <th>طريقة الدفع</th>
              <th>تاريخ الاستلام</th>
              <th>حالة الطلب</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((deposit) => (
              <tr key={deposit.id}>
                <td className={styles.paymentId}>{deposit.id}</td>
                <td>
                  <a href={`/orders/${deposit.orderId}`} className={styles.orderLink}>
                    {deposit.orderId}
                  </a>
                </td>
                <td>{deposit.customerName}</td>
                <td className={styles.amount}>{deposit.requiredAmount} د.ل</td>
                <td className={styles.amount}>
                  {deposit.receivedAmount} د.ل
                  {deposit.receivedAmount < deposit.requiredAmount && (
                    <span className={styles.partialAmount}>
                      ({deposit.requiredAmount - deposit.receivedAmount} د.ل متبقي)
                    </span>
                  )}
                </td>
                <td>{getDepositStatusBadge(deposit.depositStatus)}</td>
                <td>{deposit.paymentMethod ? (deposit.paymentMethod === 'cash' ? 'نقدي' : deposit.paymentMethod === 'transfer' ? 'تحويل' : 'بنكي') : '-'}</td>
                <td>{deposit.dateReceived || 'لم يتم بعد'}</td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeOrderStatus}`}>
                    {deposit.orderStatus === 'ordered' ? 'تم الطلب' : deposit.orderStatus === 'pending' ? 'معلق' : 'ملغي'}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionButton}>
                      {deposit.depositStatus === 'pending' || deposit.depositStatus === 'partial' ? 'تسجيل استلام' : 'عرض'}
                    </button>
                    {deposit.depositStatus === 'received' && (
                      <button className={styles.actionButton}>
                        إثبات
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Deposit Modal */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>تسجيل وديعة جديدة</h3>
              <button onClick={handleCloseModal} className={styles.closeButton}>
                <HiX />
              </button>
            </div>

            <form onSubmit={handleSaveDeposit} className={styles.modalForm}>
              <div className={styles.modalFormGroup}>
                <label className={styles.required}>رقم الطلب</label>
                <input
                  type="text"
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleInputChange}
                  className={styles.modalInput}
                  placeholder="ORD-001"
                  required
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label className={styles.required}>اسم العميل</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className={styles.modalInput}
                  placeholder="اسم العميل"
                  required
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label className={styles.required}>المبلغ المطلوب (د.ل)</label>
                <input
                  type="number"
                  name="requiredAmount"
                  value={formData.requiredAmount}
                  onChange={handleInputChange}
                  className={styles.modalInput}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label className={styles.required}>المبلغ المستلم (د.ل)</label>
                <input
                  type="number"
                  name="receivedAmount"
                  value={formData.receivedAmount}
                  onChange={handleInputChange}
                  className={styles.modalInput}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>طريقة الدفع</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className={styles.modalSelect}
                >
                  <option value="">اختر طريقة الدفع</option>
                  <option value="cash">نقدي</option>
                  <option value="transfer">تحويل</option>
                  <option value="bank">بنكي</option>
                </select>
              </div>

              <div className={styles.modalFormGroup}>
                <label>تاريخ الاستلام</label>
                <input
                  type="date"
                  name="dateReceived"
                  value={formData.dateReceived}
                  onChange={handleInputChange}
                  className={styles.modalInput}
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>استلم من قبل</label>
                <input
                  type="text"
                  name="receivedBy"
                  value={formData.receivedBy}
                  onChange={handleInputChange}
                  className={styles.modalInput}
                  placeholder="اسم الموظف"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>حالة الطلب</label>
                <select
                  name="orderStatus"
                  value={formData.orderStatus}
                  onChange={handleInputChange}
                  className={styles.modalSelect}
                >
                  <option value="pending">معلق</option>
                  <option value="ordered">تم الطلب</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={styles.modalCancelButton}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={styles.modalSaveButton}
                  disabled={saving}
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


