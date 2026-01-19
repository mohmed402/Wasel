'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './new-order.module.css'
import ordersStyles from '../orders.module.css'
import {
  HiUser,
  HiCalendar,
  HiCurrencyDollar,
  HiTruck,
  HiShoppingCart,
  HiShoppingBag,
  HiPlus,
  HiX,
  HiPencil,
  HiTrash,
  HiExclamation,
  HiCheckCircle,
  HiXCircle,
  HiLink,
  HiCloudUpload,
  HiSave,
  HiLockClosed,
  HiLockOpen
} from 'react-icons/hi'

export default function NewOrderPage() {
  // Order header state
  const [customerId, setCustomerId] = useState('')
  const [orderSource, setOrderSource] = useState('manual')
  const [basketLink, setBasketLink] = useState('')
  const [internalRef, setInternalRef] = useState(`ORD-${Date.now()}`)
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')

  // Product API fetch state
  const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState('')
  const [fetchedProduct, setFetchedProduct] = useState(null)
  const [fetchedProductQuantity, setFetchedProductQuantity] = useState(1)
  const [fetchedProductExchangeRate, setFetchedProductExchangeRate] = useState(1.0)
  const [fetchedProductSellingPrice, setFetchedProductSellingPrice] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [lockFetchedData, setLockFetchedData] = useState(false)

  // Manual product state
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualProduct, setManualProduct] = useState({
    name: '',
    link: '',
    sku: '',
    color: '',
    size: '',
    quantity: 1,
    price: '', // Cost price (in original currency)
    sellingPrice: '', // Selling price (in LYD)
    currency: 'LYD',
    exchangeRate: 1.0, // Exchange rate to base currency (LYD)
    picture: null
  })

  // Order items state
  const [orderItems, setOrderItems] = useState([])
  const [editingItem, setEditingItem] = useState(null)

  // Shipping state
  const [shipping, setShipping] = useState({
    internationalCompany: '',
    internationalTracking: '',
    localCompany: '',
    localTracking: '',
    warehouse: ''
  })

  // Payment state
  const [payment, setPayment] = useState({
    depositRequired: '',
    depositType: 'percentage',
    depositPaid: false,
    depositAmount: '',
    paymentMethod: '',
    remainingBalance: 0
  })

  // Expenses state
  const [expenses, setExpenses] = useState([])
  const [selectedExpenses, setSelectedExpenses] = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)

  // Validation warnings
  const [warnings, setWarnings] = useState([])

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    fb_account: '',
    wh_account: '',
    preferred_contact: '',
    notes: ''
  })

  // Customers state
  const [customers, setCustomers] = useState([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  
  // Customer search state
  const [customerPhoneSearch, setCustomerPhoneSearch] = useState('')
  const [searchedCustomer, setSearchedCustomer] = useState(null)
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [customerNotFound, setCustomerNotFound] = useState(false)

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers?activeOnly=true')
        if (response.ok) {
          const data = await response.json()
          setCustomers(data)
        } else {
          // Fallback to sample data if API fails
          console.error('Failed to fetch customers, using sample data')
          setCustomers([
            { id: '1', name: 'أحمد محمد', phone: '0912345678' },
            { id: '2', name: 'فاطمة علي', phone: '0923456789' },
            { id: '3', name: 'خالد حسن', phone: '0934567890' }
          ])
        }
      } catch (error) {
        console.error('Error fetching customers:', error)
        // Fallback to sample data
        setCustomers([
          { id: '1', name: 'أحمد محمد', phone: '0912345678' },
          { id: '2', name: 'فاطمة علي', phone: '0923456789' },
          { id: '3', name: 'خالد حسن', phone: '0934567890' }
        ])
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  // Fetch expenses on mount
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoadingExpenses(true)
        const response = await fetch('/api/expenses?activeOnly=true')
        if (response.ok) {
          const data = await response.json()
          setExpenses(data)
        } else {
          console.error('Failed to fetch expenses')
          setExpenses([])
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
        setExpenses([])
      } finally {
        setLoadingExpenses(false)
      }
    }
    fetchExpenses()
  }, [])

  // Generate internal ref
  const generateInternalRef = () => {
    setInternalRef(`ORD-${Date.now()}`)
  }

  // Search customer by phone number
  useEffect(() => {
    const searchCustomer = async () => {
      // Only search if phone number is exactly 10 digits
      if (customerPhoneSearch.length === 10 && /^\d+$/.test(customerPhoneSearch)) {
        setSearchingCustomer(true)
        setCustomerNotFound(false)
        setSearchedCustomer(null)
        
        try {
          // Search in already fetched customers
          const foundCustomer = customers.find(c => 
            c.phone && c.phone.replace(/\D/g, '').slice(-10) === customerPhoneSearch
          )
          
          if (foundCustomer) {
            setSearchedCustomer(foundCustomer)
            setCustomerId(foundCustomer.id.toString())
            setCustomerNotFound(false)
          } else {
            setSearchedCustomer(null)
            setCustomerId('')
            setCustomerNotFound(true)
          }
        } catch (error) {
          console.error('Error searching customer:', error)
          setCustomerNotFound(true)
        } finally {
          setSearchingCustomer(false)
        }
      } else if (customerPhoneSearch.length === 0) {
        // Reset when input is cleared
        setSearchedCustomer(null)
        setCustomerId('')
        setCustomerNotFound(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchCustomer()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [customerPhoneSearch, customers])

  // Handle customer phone input change
  const handleCustomerPhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only allow digits
    if (value.length <= 10) {
      setCustomerPhoneSearch(value)
    }
  }

  // Handle add customer button click
  const handleAddCustomerClick = () => {
    setShowCustomerModal(true)
    setNewCustomerData({
      name: '',
      phone: '',
      email: '',
      address: '',
      fb_account: '',
      wh_account: '',
      preferred_contact: '',
      notes: ''
    })
  }

  // Handle customer form input change
  const handleCustomerInputChange = (e) => {
    const { name, value } = e.target
    setNewCustomerData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle save new customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault()

    // Validation
    if (!newCustomerData.name.trim() || !newCustomerData.phone.trim()) {
      alert('يرجى إدخال الاسم ورقم الهاتف')
      return
    }

    setSavingCustomer(true)
    try {
      // Save to Supabase via API route
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          email: newCustomerData.email || null,
          address: newCustomerData.address || null,
          fb_account: newCustomerData.fb_account || null,
          wh_account: newCustomerData.wh_account || null,
          preferred_contact: newCustomerData.preferred_contact || null,
          notes: newCustomerData.notes || null,
          is_active: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save customer')
      }

      const savedCustomer = await response.json()

      // Add to customers list
      setCustomers([...customers, savedCustomer])
      
      // Select the new customer
      setCustomerId(savedCustomer.id.toString())
      setSearchedCustomer(savedCustomer)
      setCustomerPhoneSearch(savedCustomer.phone.replace(/\D/g, '').slice(-10))
      
      // Close modal
      setShowCustomerModal(false)
      
      alert('تم إضافة العميل بنجاح')
    } catch (error) {
      console.error('Error saving customer:', error)
      alert('حدث خطأ أثناء حفظ العميل')
    } finally {
      setSavingCustomer(false)
    }
  }

  // Handle close customer modal
  const handleCloseCustomerModal = () => {
    setShowCustomerModal(false)
  }

  // Fetch basket from link
  const handleFetchBasket = async () => {
    if (!basketLink.trim()) {
      setWarnings([...warnings, 'يرجى إدخال رابط السلة'])
      return
    }

    setIsFetching(true)
    setFetchError('')
    setWarnings([])

    try {
      const response = await fetch('/api/shein/cart-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartShareUrl: basketLink.trim()
        })
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error) {
        // Log detailed error info for debugging
        console.error('API Error Response:', responseData)
        console.error('Response Status:', response.status)
        
        // Extract more detailed error message if available
        let errorMessage = responseData.error || `خطأ في الطلب (${response.status})`
        
        if (responseData.debug) {
          console.error('Debug Info:', responseData.debug)
          if (responseData.debug.capturedCount === 0) {
            errorMessage = 'لم يتم العثور على عناصر في السلة. قد يكون الرابط غير صحيح أو السلة فارغة.'
          }
        }
        
        throw new Error(errorMessage)
      }

      // Extract items from response
      const cartItems = responseData.items || []
      
      if (cartItems.length === 0) {
        setFetchError('لم يتم العثور على أي عناصر في السلة')
        setWarnings([...warnings, 'لم يتم العثور على أي عناصر في السلة'])
        return
      }

      // Convert cart items to order items format
      const newOrderItems = cartItems.map((item, index) => ({
        id: Date.now() + index, // Unique ID for each item
        name: item.name || `منتج ${index + 1}`,
        productId: item.productId || item.sku || `SHEIN-${Date.now()}-${index}`,
        variant: item.variant || '',
        quantity: item.qty || 1,
        unitPrice: parseFloat(item.price) || 0,
        sellingPrice: '', // User needs to set selling price later
        currency: item.currency || 'USD',
        exchangeRate: 1.0, // User needs to set exchange rate later
        images: item.images || (item.image ? [item.image] : []),
        originalLink: basketLink, // Link to the cart
        weight: '',
        dimensions: '',
        availability: 'unknown',
        locked: false,
        sku: item.sku || '',
        source: 'shein_cart'
      }))

      // Add all items to order items
      setOrderItems([...orderItems, ...newOrderItems])
      
      // Clear warnings and show success
      setWarnings([])
      setFetchError('')
      
      // Optional: Show success message
      alert(`تم إضافة ${newOrderItems.length} عنصر من السلة إلى الطلب`)
      
    } catch (error) {
      console.error('Error fetching basket:', error)
      const errorMessage = error.message || 'حدث خطأ غير متوقع'
      setFetchError(`فشل في جلب بيانات السلة: ${errorMessage}`)
      setWarnings([...warnings, `فشل في جلب السلة: ${errorMessage}`])
    } finally {
      setIsFetching(false)
    }
  }

  // Fetch product data from API
  const handleFetchProduct = async () => {
    if (!productId.trim()) {
      setFetchError('يرجى إدخال Product ID')
      return
    }

    setIsFetching(true)
    setFetchError('')
    setFetchedProduct(null)

    try {
      const response = await fetch(`/api/shein/product/${encodeURIComponent(productId)}`)
      const responseData = await response.json()
      
      // Check for errors in the response
      if (!response.ok || responseData.error) {
        // Handle API errors - get the error message from the response
        const errorMessage = responseData.error || `خطأ في الطلب (${response.status})`
        throw new Error(errorMessage)
      }
      
      // Transform API response to match our component's expected format
      // Adjust this transformation based on the actual API response structure
      const transformedProduct = {
        id: productId,
        name: responseData.product?.title || responseData.title || responseData.product?.name || `منتج ${productId}`,
        images: responseData.product?.images || responseData.images || responseData.product?.image_urls || [],
        price: responseData.product?.price || responseData.price || responseData.product?.discount_price || 0,
        currency: responseData.product?.currency || responseData.currency || 'USD',
        variants: responseData.product?.variants || responseData.variants || responseData.product?.sizes || [],
        weight: responseData.product?.weight || responseData.weight || '',
        dimensions: responseData.product?.dimensions || responseData.dimensions || '',
        originalLink: responseData.product?.url || responseData.url || responseData.product?.product_url || `https://shein.com/product/${productId}`,
        inStock: responseData.product?.in_stock !== false && responseData.in_stock !== false && responseData.product?.available !== false
      }

      setFetchedProduct(transformedProduct)
      setFetchError('')
    } catch (error) {
      console.error('Error fetching product:', error)
      const errorMessage = error.message || 'حدث خطأ غير متوقع'
      setFetchError(`فشل في جلب بيانات المنتج: ${errorMessage}`)
      setFetchedProduct(null)
    } finally {
      setIsFetching(false)
    }
  }

  // Add product from API fetch
  const handleAddFetchedProduct = () => {
    if (!fetchedProduct || !fetchedProductSellingPrice) {
      setWarnings([...warnings, 'يرجى إدخال سعر البيع'])
      return
    }

    const selectedVariant = fetchedProduct.variants?.find(v => v.id === variant) || fetchedProduct.variants?.[0]
    const item = {
      id: Date.now(),
      name: fetchedProduct.name,
      productId: fetchedProduct.id,
      variant: selectedVariant ? `${selectedVariant.size} - ${selectedVariant.color}` : '',
      quantity: fetchedProductQuantity || 1,
      unitPrice: fetchedProduct.price,
      sellingPrice: parseFloat(fetchedProductSellingPrice), // Selling price in LYD
      currency: fetchedProduct.currency || 'LYD',
      exchangeRate: fetchedProductExchangeRate || 1.0,
      images: fetchedProduct.images,
      originalLink: fetchedProduct.originalLink,
      weight: fetchedProduct.weight,
      dimensions: fetchedProduct.dimensions,
      availability: fetchedProduct.inStock ? 'in_stock' : 'out_of_stock',
      locked: lockFetchedData,
      sku: '',
      source: 'api'
    }

    setOrderItems([...orderItems, item])
    setFetchedProduct(null)
    setProductId('')
    setVariant('')
    setFetchedProductQuantity(1)
    setFetchedProductExchangeRate(1.0)
    setFetchedProductSellingPrice('')
  }

  // Add manual product
  const handleAddManualProduct = () => {
    if (!manualProduct.name.trim() || !manualProduct.price || !manualProduct.sellingPrice) {
      setWarnings([...warnings, 'يرجى ملء جميع الحقول المطلوبة (الاسم، سعر التكلفة، وسعر البيع)'])
      return
    }

    const item = {
      id: Date.now(),
      name: manualProduct.name,
      productId: manualProduct.sku || `MAN-${Date.now()}`,
      variant: `${manualProduct.size}${manualProduct.size && manualProduct.color ? ' - ' : ''}${manualProduct.color}`,
      quantity: parseInt(manualProduct.quantity) || 1,
      unitPrice: parseFloat(manualProduct.price),
      sellingPrice: parseFloat(manualProduct.sellingPrice) || 0, // Selling price in LYD
      currency: manualProduct.currency,
      exchangeRate: parseFloat(manualProduct.exchangeRate) || 1.0,
      images: manualProduct.picture ? [URL.createObjectURL(manualProduct.picture)] : [],
      originalLink: manualProduct.link,
      weight: '',
      dimensions: '',
      availability: 'unknown',
      locked: false,
      sku: manualProduct.sku,
      source: 'manual'
    }

    setOrderItems([...orderItems, item])
    setManualProduct({
      name: '',
      link: '',
      sku: '',
      color: '',
      size: '',
      quantity: 1,
      price: '',
      sellingPrice: '',
      currency: 'LYD',
      exchangeRate: 1.0,
      picture: null
    })
    setShowManualForm(false)
  }

  // Remove item
  const handleRemoveItem = (itemId) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId))
  }

  // Update item
  const handleUpdateItem = (itemId, updates) => {
    setOrderItems(orderItems.map(item => 
      item.id === itemId ? { 
        ...item, 
        ...updates, 
        sellingPrice: updates.sellingPrice !== undefined ? parseFloat(updates.sellingPrice) || 0 : item.sellingPrice || 0
      } : item
    ))
    setEditingItem(null)
  }

  // Convert amount to base currency (LYD) using exchange rate
  const convertToBaseCurrency = (amount, currency, exchangeRate = 1.0) => {
    if (currency === 'LYD') return amount
    return amount * (exchangeRate || 1.0)
  }

  // Calculate totals (all converted to LYD)
  const calculateTotals = () => {
    // Calculate cost subtotal in LYD (base currency) - what we paid
    const costSubtotal = orderItems.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity
      const convertedTotal = convertToBaseCurrency(itemTotal, item.currency || 'LYD', item.exchangeRate || 1.0)
      return sum + convertedTotal
    }, 0)

    // Calculate selling subtotal in LYD - what customer pays
    const sellingSubtotal = orderItems.reduce((sum, item) => {
      const sellingPrice = parseFloat(item.sellingPrice) || 0
      return sum + (sellingPrice * item.quantity)
    }, 0)

    // Calculate expenses total in LYD
    const expensesTotal = selectedExpenses.reduce((sum, expId) => {
      const exp = expenses.find(e => e.id === expId)
      if (!exp) return sum
      const expenseCost = parseFloat(exp.cost) || 0
      const convertedExpense = convertToBaseCurrency(expenseCost, exp.currency || 'LYD', 1.0)
      return sum + convertedExpense
    }, 0)

    // Calculate profit: (selling price - cost price) for each item
    const profit = orderItems.reduce((sum, item) => {
      const costPrice = convertToBaseCurrency(item.unitPrice, item.currency || 'LYD', item.exchangeRate || 1.0)
      const sellingPrice = parseFloat(item.sellingPrice) || 0
      const itemProfit = (sellingPrice - costPrice) * item.quantity
      return sum + itemProfit
    }, 0)

    // Net profit = profit - expenses
    const netProfit = profit - expensesTotal

    const discount = 0
    const total = sellingSubtotal - discount // Total customer pays

    return { 
      costSubtotal, 
      sellingSubtotal, 
      expensesTotal, 
      profit, 
      netProfit, 
      discount, 
      total 
    }
  }

  // Validate before save
  const validateOrder = () => {
    const newWarnings = []

    if (!customerId) {
      newWarnings.push('يرجى اختيار العميل')
    }

    if (orderItems.length === 0) {
      newWarnings.push('يرجى إضافة عنصر واحد على الأقل للطلب')
    }

    orderItems.forEach((item, index) => {
      if (!item.unitPrice || item.unitPrice <= 0) {
        newWarnings.push(`عنصر ${index + 1} (${item.name}) بدون سعر تكلفة صحيح`)
      }
      if (!item.sellingPrice || item.sellingPrice <= 0) {
        newWarnings.push(`عنصر ${index + 1} (${item.name}) بدون سعر بيع صحيح`)
      }

      if (item.availability === 'out_of_stock') {
        newWarnings.push(`تحذير: ${item.name} غير متوفر`)
      }
    })

    // Check currency consistency
    const currencies = [...new Set(orderItems.map(item => item.currency))]
    if (currencies.length > 1) {
      newWarnings.push(`تحذير: العملات غير موحدة (${currencies.join(', ')})`)
    }

    setWarnings(newWarnings)
    return newWarnings.length === 0
  }

  // Handle save actions
  const handleSaveDraft = () => {
    if (validateOrder()) {
      console.log('Saving draft...', { orderItems, customerId, orderSource })
      // TODO: Save to backend
      alert('تم حفظ المسودة بنجاح')
    }
  }

  const handleCreateOrder = async () => {
    if (!validateOrder()) return

    try {
      const totals = calculateTotals()
      
      // Prepare order data
      const orderData = {
        customer_id: parseInt(customerId),
        internal_ref: internalRef,
        order_date: orderDate,
        order_source: orderSource,
        basket_link: basketLink || null,
        expected_delivery_date: expectedDelivery || null,
        notes: notes || null,
        subtotal: totals.sellingSubtotal,
        expenses_total: totals.expensesTotal,
        service_fee: 0, // No longer used - replaced with profit calculation
        international_shipping: 0, // Will be added later based on item weight
        local_delivery: 0, // Customer pays for this
        discount: totals.discount,
        total_amount: totals.total,
        status: 'pending',
        has_issues: false,
        items: orderItems.map(item => ({
          name: item.name,
          productId: item.productId,
          variant: item.variant || '',
          sku: item.sku || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellingPrice: parseFloat(item.sellingPrice) || 0,
          currency: item.currency || 'LYD',
          exchangeRate: item.exchangeRate || 1.0,
          originalLink: item.originalLink || '',
          images: item.images || [],
          weight: item.weight || '',
          dimensions: item.dimensions || '',
          color: item.color || '',
          size: item.size || '',
          availability: item.availability || 'unknown',
          status: item.status || 'pending',
          locked: item.locked || false,
          source: item.source || 'manual'
        })),
        expenses: selectedExpenses.map(expId => {
          const exp = expenses.find(e => e.id === expId)
          return exp ? {
            id: exp.id,
            name: exp.name,
            nameEn: exp.name_en || null,
            cost: parseFloat(exp.cost) || 0,
            currency: exp.currency,
            category: exp.category
          } : null
        }).filter(Boolean),
        shipping: {
          internationalCompany: shipping.internationalCompany || null,
          internationalTracking: shipping.internationalTracking || null,
          localCompany: shipping.localCompany || null,
          localTracking: shipping.localTracking || null,
          warehouse: shipping.warehouse || null
        },
        payment: {
          depositRequired: parseFloat(payment.depositRequired) || 0,
          depositType: payment.depositType || 'percentage',
          depositPaid: payment.depositPaid || false,
          depositAmount: parseFloat(payment.depositAmount) || 0,
          paymentMethod: payment.paymentMethod || null,
          depositPaidDate: payment.depositPaid ? new Date().toISOString().split('T')[0] : null
        }
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const createdOrder = await response.json()
      alert('تم إنشاء الطلب بنجاح')
      // Redirect to order detail page
      window.location.href = `/orders/${createdOrder.id}`
    } catch (error) {
      console.error('Error creating order:', error)
      alert(`حدث خطأ أثناء إنشاء الطلب: ${error.message}`)
    }
  }

  const handleCreateAndRequestDeposit = async () => {
    if (!validateOrder()) return

    try {
      const totals = calculateTotals()
      
      // Prepare order data (same as handleCreateOrder)
      const orderData = {
        customer_id: parseInt(customerId),
        internal_ref: internalRef,
        order_date: orderDate,
        order_source: orderSource,
        basket_link: basketLink || null,
        expected_delivery_date: expectedDelivery || null,
        notes: notes || null,
        subtotal: totals.sellingSubtotal,
        expenses_total: totals.expensesTotal,
        service_fee: 0, // No longer used - replaced with profit calculation
        international_shipping: 0, // Will be added later based on item weight
        local_delivery: 0, // Customer pays for this
        discount: totals.discount,
        total_amount: totals.total,
        status: 'pending',
        has_issues: false,
        items: orderItems.map(item => ({
          name: item.name,
          productId: item.productId,
          variant: item.variant || '',
          sku: item.sku || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellingPrice: parseFloat(item.sellingPrice) || 0,
          currency: item.currency || 'LYD',
          exchangeRate: item.exchangeRate || 1.0,
          originalLink: item.originalLink || '',
          images: item.images || [],
          weight: item.weight || '',
          dimensions: item.dimensions || '',
          color: item.color || '',
          size: item.size || '',
          availability: item.availability || 'unknown',
          status: item.status || 'pending',
          locked: item.locked || false,
          source: item.source || 'manual'
        })),
        expenses: selectedExpenses.map(expId => {
          const exp = expenses.find(e => e.id === expId)
          return exp ? {
            id: exp.id,
            name: exp.name,
            nameEn: exp.name_en || null,
            cost: parseFloat(exp.cost) || 0,
            currency: exp.currency,
            category: exp.category
          } : null
        }).filter(Boolean),
        shipping: {
          internationalCompany: shipping.internationalCompany || null,
          internationalTracking: shipping.internationalTracking || null,
          localCompany: shipping.localCompany || null,
          localTracking: shipping.localTracking || null,
          warehouse: shipping.warehouse || null
        },
        payment: {
          depositRequired: parseFloat(payment.depositRequired) || 0,
          depositType: payment.depositType || 'percentage',
          depositPaid: payment.depositPaid || false,
          depositAmount: parseFloat(payment.depositAmount) || 0,
          paymentMethod: payment.paymentMethod || null,
          depositPaidDate: payment.depositPaid ? new Date().toISOString().split('T')[0] : null
        }
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const createdOrder = await response.json()
      alert('تم إنشاء الطلب وطلب العربون بنجاح')
      // Redirect to order detail page
      window.location.href = `/orders/${createdOrder.id}`
    } catch (error) {
      console.error('Error creating order:', error)
      alert(`حدث خطأ أثناء إنشاء الطلب: ${error.message}`)
    }
  }

  const totals = calculateTotals()

  return (
    <div className={styles.newOrderPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>الطلبات</h1>
        <p className={styles.pageSubtitle}>إدارة جميع الطلبات في النظام</p>
      </div>

      <div className={ordersStyles.tabsContainer}>
        <Link
          href="/orders/all"
          className={ordersStyles.tab}
        >
          قائمة الطلبات
        </Link>
        <Link
          href="/orders/new"
          className={`${ordersStyles.tab} ${ordersStyles.tabActive}`}
        >
          إضافة طلب جديد / Add New Order
        </Link>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className={styles.warningsBox}>
          <HiExclamation className={styles.warningIcon} />
          <div>
            <strong>تحذيرات:</strong>
            <ul className={styles.warningList}>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 1. Header / معلومات الزبون والطلب */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>معلومات الطلب والزبون</h2>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>العميل *</label>
            <div className={styles.customerSearchContainer}>
              <div className={styles.customerSearchInputWrapper}>
                <input
                  type="text"
                  value={customerPhoneSearch}
                  onChange={handleCustomerPhoneChange}
                  className={styles.customerSearchInput}
                  placeholder="أدخل رقم الهاتف (10 أرقام)"
                  maxLength={10}
                  inputMode="numeric"
                />
                {searchingCustomer && (
                  <span className={styles.searchingIndicator}>جاري البحث...</span>
                )}
              </div>
              
              {searchedCustomer && (
                <div className={styles.customerFoundCard}>
                  <div className={styles.customerFoundInfo}>
                    <div className={styles.customerFoundName}>{searchedCustomer.name}</div>
                    <div className={styles.customerFoundPhone}>{searchedCustomer.phone}</div>
                    {searchedCustomer.email && (
                      <div className={styles.customerFoundEmail}>{searchedCustomer.email}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerPhoneSearch('')
                      setSearchedCustomer(null)
                      setCustomerId('')
                    }}
                    className={styles.clearCustomerButton}
                    title="إزالة"
                  >
                    <HiX />
                  </button>
                </div>
              )}
              
              {customerNotFound && customerPhoneSearch.length === 10 && !searchingCustomer && (
                <div className={styles.customerNotFoundMessage}>
                  <HiExclamation className={styles.notFoundIcon} />
                  <span>لا يوجد عميل بهذا الرقم</span>
                </div>
              )}
              
              <button 
                onClick={handleAddCustomerClick}
                className={styles.addCustomerButton} 
                type="button"
              >
                <HiPlus />
                إضافة عميل جديد
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>مصدر الطلب *</label>
            <select
              value={orderSource}
              onChange={(e) => setOrderSource(e.target.value)}
              className={styles.select}
            >
              <option value="shein">Shein Basket Link</option>
              <option value="manual">Manual Order</option>
            </select>
          </div>

          {orderSource === 'shein' && (
            <div className={styles.formGroup}>
              <label>رابط السلة</label>
              <div className={styles.basketLinkGroup}>
                <input
                  type="url"
                  value={basketLink}
                  onChange={(e) => setBasketLink(e.target.value)}
                  placeholder="https://..."
                  className={styles.input}
                />
                <button
                  onClick={handleFetchBasket}
                  disabled={isFetching}
                  className={styles.fetchButton}
                  type="button"
                >
                  <HiLink />
                  {isFetching ? 'جاري الجلب...' : 'جلب / Fetch'}
                </button>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>الرقم الداخلي</label>
            <div className={styles.refGroup}>
              <input
                type="text"
                value={internalRef}
                onChange={(e) => setInternalRef(e.target.value)}
                className={styles.input}
              />
              <button
                onClick={generateInternalRef}
                className={styles.generateButton}
                type="button"
              >
                توليد
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>تاريخ الطلب</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>نافذة التسليم المتوقعة (اختياري)</label>
            <input
              type="text"
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              placeholder="مثال: 15-20 يوم"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroupFull}>
            <label>ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.textarea}
              rows="3"
              placeholder="ملاحظات عامة عن الطلب..."
            />
          </div>
        </div>
      </div>

      {/* 2. Products / عناصر الطلب */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>إضافة المنتجات</h2>

        A) Add by Product ID
        <div className={styles.productBlock}>
          <h3 className={styles.blockTitle}>إضافة عن طريق Product ID (API)</h3>
          <div className={styles.apiForm}>
            <div className={styles.formGroup}>
              <label>Product ID</label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={styles.input}
                placeholder="أدخل Product ID"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Variant (اختياري)</label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className={styles.select}
                disabled={!fetchedProduct}
              >
                <option value="">اختر Variant</option>
                {fetchedProduct?.variants?.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.size} - {v.color} {!v.available && '(غير متوفر)'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleFetchProduct}
              disabled={isFetching}
              className={styles.fetchButton}
              type="button"
            >
              {isFetching ? 'جاري الجلب...' : 'جلب بيانات المنتج / Get Product Data'}
            </button>
            {fetchError && (
              <div className={styles.errorMessage}>
                <HiXCircle /> {fetchError}
              </div>
            )}
            {fetchedProduct && (
              <div className={styles.productPreview}>
                <div className={styles.previewHeader}>
                  <h4>معاينة المنتج</h4>
                  <button
                    onClick={() => setLockFetchedData(!lockFetchedData)}
                    className={styles.lockButton}
                    type="button"
                  >
                    {lockFetchedData ? (
                      <>
                        <HiLockClosed /> بيانات مقفولة
                      </>
                    ) : (
                      <>
                        <HiLockOpen /> قابل للتعديل
                      </>
                    )}
                  </button>
                </div>
                <div className={styles.previewContent}>
                  <div className={styles.previewImage}>
                    {fetchedProduct.images?.[0] && (
                      <img src={fetchedProduct.images[0]} alt={fetchedProduct.name} />
                    )}
                  </div>
                  <div className={styles.previewDetails}>
                    <h5>{fetchedProduct.name}</h5>
                    <div className={styles.previewRow}>
                      <span>السعر:</span>
                      <strong>{fetchedProduct.price} {fetchedProduct.currency}</strong>
                    </div>
                    {fetchedProduct.variants && (
                      <div className={styles.previewRow}>
                        <span>المقاسات/الألوان:</span>
                        <div className={styles.variantsList}>
                          {fetchedProduct.variants.map(v => (
                            <span key={v.id} className={v.available ? styles.variantAvailable : styles.variantUnavailable}>
                              {v.size} - {v.color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {fetchedProduct.weight && (
                      <div className={styles.previewRow}>
                        <span>الوزن:</span>
                        <span>{fetchedProduct.weight}</span>
                      </div>
                    )}
                    {fetchedProduct.dimensions && (
                      <div className={styles.previewRow}>
                        <span>الأبعاد:</span>
                        <span>{fetchedProduct.dimensions}</span>
                      </div>
                    )}
                    <div className={styles.previewRow}>
                      <span>الحالة:</span>
                      <span className={fetchedProduct.inStock ? styles.inStock : styles.outOfStock}>
                        {fetchedProduct.inStock ? 'متوفر' : 'غير متوفر'}
                      </span>
                    </div>
                    <div className={styles.previewRow}>
                      <span>العملة:</span>
                      <select
                        value={fetchedProduct.currency || 'LYD'}
                        onChange={(e) => {
                          const newCurrency = e.target.value
                          setFetchedProduct({ 
                            ...fetchedProduct, 
                            currency: newCurrency
                          })
                          setFetchedProductExchangeRate(newCurrency === 'LYD' ? 1.0 : fetchedProductExchangeRate)
                        }}
                        className={styles.select}
                        disabled={lockFetchedData}
                        style={{ width: 'auto', minWidth: '150px' }}
                      >
                        <option value="LYD">دينار ليبي (LYD)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="EUR">يورو (EUR)</option>
                        <option value="GBP">جنيه إسترليني (GBP)</option>
                        <option value="TRY">ليرة تركية (TRY)</option>
                      </select>
                    </div>
                    <div className={styles.previewRow}>
                      <span>سعر الصرف (إلى LYD):</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <input
                          type="number"
                          step="0.0001"
                          value={fetchedProductExchangeRate}
                          onChange={(e) => setFetchedProductExchangeRate(parseFloat(e.target.value) || 1.0)}
                          className={styles.input}
                          placeholder="1.0000"
                          disabled={lockFetchedData || (fetchedProduct.currency || 'LYD') === 'LYD'}
                          style={{ width: '150px' }}
                        />
                        <small style={{ color: '#6B7280', fontSize: '0.85rem' }}>
                          {(fetchedProduct.currency || 'LYD') === 'LYD' 
                            ? 'العملة الأساسية - لا حاجة لسعر صرف' 
                            : `1 ${fetchedProduct.currency || 'LYD'} = ${fetchedProductExchangeRate} LYD`}
                        </small>
                      </div>
                    </div>
                    <div className={styles.previewRow}>
                      <span>الرابط الأصلي:</span>
                      <a href={fetchedProduct.originalLink} target="_blank" rel="noopener noreferrer">
                        <HiLink /> عرض
                      </a>
                    </div>
                  </div>
                </div>
                <div className={styles.previewActions}>
                  <div className={styles.previewActionGroup}>
                    <label>الكمية:</label>
                  <input
                    type="number"
                    min="1"
                    value={fetchedProductQuantity}
                    onChange={(e) => setFetchedProductQuantity(parseInt(e.target.value) || 1)}
                    className={styles.quantityInput}
                    placeholder="الكمية"
                  />
                  </div>
                  <div className={styles.previewActionGroup}>
                    <label>سعر البيع (د.ل) *:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fetchedProductSellingPrice}
                      onChange={(e) => setFetchedProductSellingPrice(e.target.value)}
                      className={styles.quantityInput}
                      placeholder="سعر البيع"
                    />
                  </div>
                  <button
                    onClick={handleAddFetchedProduct}
                    className={styles.addToOrderButton}
                    type="button"
                    disabled={!fetchedProductSellingPrice}
                  >
                    <HiPlus />
                    إضافة للطلب / Add to Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* B) Manual Product */}
        <div className={styles.productBlock}>
          {!showManualForm ? (
            <button
              onClick={() => setShowManualForm(true)}
              className={styles.addToOrderButton}
              type="button"
              style={{ width: '100%' }}
            >
              <HiPlus />
              إضافة منتج يدوياً / Add Item Manually
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className={styles.blockTitle}>إضافة يدوياً (Manual Product)</h3>
                <button
                  onClick={() => setShowManualForm(false)}
                  className={styles.clearCustomerButton}
                  type="button"
                  title="إغلاق / Close"
                >
                  <HiX />
                </button>
              </div>
              <div className={styles.manualForm}>
                <div className={styles.grid}>
                  <div className={styles.formGroup}>
                    <label>اسم المنتج *</label>
                    <input
                      type="text"
                      value={manualProduct.name}
                      onChange={(e) => setManualProduct({ ...manualProduct, name: e.target.value })}
                      className={styles.input}
                      placeholder="اسم المنتج"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>رابط المنتج (اختياري)</label>
                    <input
                      type="url"
                      value={manualProduct.link}
                      onChange={(e) => setManualProduct({ ...manualProduct, link: e.target.value })}
                      className={styles.input}
                      placeholder="https://..."
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>SKU / Product ID</label>
                    <input
                      type="text"
                      value={manualProduct.sku}
                      onChange={(e) => setManualProduct({ ...manualProduct, sku: e.target.value })}
                      className={styles.input}
                      placeholder="SKU"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>اللون</label>
                    <input
                      type="text"
                      value={manualProduct.color}
                      onChange={(e) => setManualProduct({ ...manualProduct, color: e.target.value })}
                      className={styles.input}
                      placeholder="اللون"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>المقاس</label>
                    <input
                      type="text"
                      value={manualProduct.size}
                      onChange={(e) => setManualProduct({ ...manualProduct, size: e.target.value })}
                      className={styles.input}
                      placeholder="المقاس"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>الكمية *</label>
                    <input
                      type="number"
                      min="1"
                      value={manualProduct.quantity}
                      onChange={(e) => setManualProduct({ ...manualProduct, quantity: parseInt(e.target.value) || 1 })}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>سعر الوحدة (سعر التكلفة) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={manualProduct.price}
                      onChange={(e) => setManualProduct({ ...manualProduct, price: e.target.value })}
                      className={styles.input}
                      placeholder="0.00"
                    />
                    {manualProduct.price && manualProduct.exchangeRate && manualProduct.currency !== 'LYD' && (
                      <small style={{ color: '#059669', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem', fontWeight: '500' }}>
                        السعر بعد التحويل: {(parseFloat(manualProduct.price) * parseFloat(manualProduct.exchangeRate)).toFixed(2)} د.ل
                      </small>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label>سعر البيع (د.ل) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualProduct.sellingPrice}
                      onChange={(e) => setManualProduct({ ...manualProduct, sellingPrice: e.target.value })}
                      className={styles.input}
                      placeholder="0.00"
                    />
                    <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                      سعر البيع بالدينار الليبي
                    </small>
                    {manualProduct.price && manualProduct.exchangeRate && manualProduct.currency !== 'LYD' && manualProduct.sellingPrice && (
                      <small style={{ 
                        color: parseFloat(manualProduct.sellingPrice) >= (parseFloat(manualProduct.price) * parseFloat(manualProduct.exchangeRate)) ? '#059669' : '#DC2626', 
                        fontSize: '0.85rem', 
                        display: 'block', 
                        marginTop: '0.25rem',
                        fontWeight: '500'
                      }}>
                        {parseFloat(manualProduct.sellingPrice) >= (parseFloat(manualProduct.price) * parseFloat(manualProduct.exchangeRate))
                          ? `✓ الربح: ${(parseFloat(manualProduct.sellingPrice) - (parseFloat(manualProduct.price) * parseFloat(manualProduct.exchangeRate))).toFixed(2)} د.ل`
                          : `⚠ سعر البيع أقل من سعر التكلفة!`}
                      </small>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label>العملة *</label>
                    <select
                      value={manualProduct.currency}
                      onChange={(e) => {
                        const newCurrency = e.target.value
                        setManualProduct({ 
                          ...manualProduct, 
                          currency: newCurrency,
                          exchangeRate: newCurrency === 'LYD' ? 1.0 : manualProduct.exchangeRate
                        })
                      }}
                      className={styles.select}
                    >
                      <option value="LYD">دينار ليبي (LYD)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="EUR">يورو (EUR)</option>
                      <option value="GBP">جنيه إسترليني (GBP)</option>
                      <option value="TRY">ليرة تركية (TRY)</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>سعر الصرف (إلى LYD) *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={manualProduct.exchangeRate}
                      onChange={(e) => setManualProduct({ ...manualProduct, exchangeRate: e.target.value })}
                      className={styles.input}
                      placeholder="1.0000"
                      disabled={manualProduct.currency === 'LYD'}
                    />
                    <small style={{ color: '#6B7280', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                      {manualProduct.currency === 'LYD' 
                        ? 'العملة الأساسية - لا حاجة لسعر صرف' 
                        : `1 ${manualProduct.currency} = ${manualProduct.exchangeRate || 1} LYD`}
                    </small>
                    {manualProduct.price && manualProduct.exchangeRate && manualProduct.currency !== 'LYD' && (
                      <small style={{ color: '#2563EB', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem', fontWeight: '600' }}>
                        سعر التكلفة بعد التحويل: {(parseFloat(manualProduct.price) * parseFloat(manualProduct.exchangeRate)).toFixed(2)} د.ل
                      </small>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label>صورة المنتج (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setManualProduct({ ...manualProduct, picture: e.target.files[0] })}
                      className={styles.fileInput}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddManualProduct}
                  className={styles.addToOrderButton}
                  type="button"
                >
                  <HiPlus />
                  إضافة للطلب / Add to Order
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Order Items Table */}
      {orderItems.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>عناصر الطلب</h2>
          <div className={styles.tableContainer}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>العنصر</th>
                  <th>Variant</th>
                  <th>الكمية</th>
                  <th>سعر الوحدة</th>
                  <th>المجموع</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.itemCell}>
                        {item.images?.[0] && (
                          <img src={item.images[0]} alt={item.name} className={styles.itemImage} />
                        )}
                        <div>
                          <div className={styles.itemName}>{item.name}</div>
                          {item.source === 'api' && item.locked && (
                            <span className={styles.lockedBadge}>
                              <HiLockClosed /> مقفول
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{item.variant || '-'}</td>
                    <td>
                      {editingItem?.id === item.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editingItem.quantity}
                          onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                          className={styles.inlineInput}
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td>
                      {editingItem?.id === item.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#6B7280' }}>سعر التكلفة:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingItem.unitPrice}
                              onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })}
                              className={styles.inlineInput}
                              disabled={item.locked}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#6B7280' }}>سعر البيع (د.ل):</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingItem.sellingPrice || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                              className={styles.inlineInput}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span>{item.unitPrice.toFixed(2)} {item.currency || 'LYD'}</span>
                          {(item.currency && item.currency !== 'LYD' && item.exchangeRate) && (
                            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                              ≈ {(item.unitPrice * (item.exchangeRate || 1.0)).toFixed(2)} LYD
                            </span>
                          )}
                          {item.sellingPrice && (
                            <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: '500' }}>
                              سعر البيع: {parseFloat(item.sellingPrice).toFixed(2)} د.ل
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={styles.subtotalCell}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {item.sellingPrice ? (
                          <>
                            <span style={{ fontWeight: '600', color: '#059669', fontSize: '1rem' }}>
                              {(parseFloat(item.sellingPrice) * item.quantity).toFixed(2)} د.ل
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                              (سعر التكلفة: {convertToBaseCurrency(item.unitPrice * item.quantity, item.currency, item.exchangeRate).toFixed(2)} د.ل)
                            </span>
                          </>
                        ) : (
                          <>
                            <span>{(item.unitPrice * item.quantity).toFixed(2)} {item.currency || 'LYD'}</span>
                            {(item.currency && item.currency !== 'LYD' && item.exchangeRate) && (
                              <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: '500' }}>
                                ≈ {convertToBaseCurrency(item.unitPrice * item.quantity, item.currency, item.exchangeRate).toFixed(2)} LYD
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={
                        item.availability === 'in_stock' ? styles.statusInStock :
                        item.availability === 'out_of_stock' ? styles.statusOutOfStock :
                        styles.statusUnknown
                      }>
                        {item.availability === 'in_stock' ? 'متوفر' :
                         item.availability === 'out_of_stock' ? 'غير متوفر' :
                         'غير معروف'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.itemActions}>
                        {editingItem?.id === item.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateItem(item.id, editingItem)}
                              className={styles.actionButton}
                              title="حفظ"
                            >
                              <HiCheckCircle />
                            </button>
                            <button
                              onClick={() => setEditingItem(null)}
                              className={styles.actionButton}
                              title="إلغاء"
                            >
                              <HiX />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingItem({ ...item })}
                              className={styles.actionButton}
                              disabled={item.locked}
                              title="تعديل"
                            >
                              <HiPencil />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className={styles.actionButton}
                              title="حذف"
                            >
                              <HiTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className={styles.totalLabel}>المجموع الفرعي (سعر البيع):</td>
                  <td className={styles.totalValue}>{totals.sellingSubtotal.toFixed(2)} LYD</td>
                </tr>
                {totals.expensesTotal > 0 && (
                <tr>
                    <td colSpan="4" className={styles.totalLabel}>المصروفات:</td>
                    <td className={styles.totalValue}>{totals.expensesTotal.toFixed(2)} LYD</td>
                </tr>
                )}
                <tr>
                  <td colSpan="4" className={styles.totalLabel}>الربح:</td>
                  <td className={styles.totalValue}>{totals.profit.toFixed(2)} LYD</td>
                </tr>
                <tr className={styles.netProfitRow}>
                  <td colSpan="4" className={styles.totalLabel}>صافي الربح:</td>
                  <td className={styles.netProfit}>{totals.netProfit.toFixed(2)} LYD</td>
                </tr>
                <tr className={styles.grandTotalRow}>
                  <td colSpan="4" className={styles.totalLabel}>الإجمالي (ما يدفعه العميل):</td>
                  <td className={styles.grandTotal}>{totals.total.toFixed(2)} LYD</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 4. Shipping & Routing */}
      {/* <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <HiTruck />
          مسار الشحن
        </h2>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>شركة الشحن الدولي</label>
            <select
              value={shipping.internationalCompany}
              onChange={(e) => setShipping({ ...shipping, internationalCompany: e.target.value })}
              className={styles.select}
            >
              <option value="">اختر الشركة</option>
              <option value="dhl">DHL</option>
              <option value="fedex">FedEx</option>
              <option value="aramex">Aramex</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>رقم التتبع (دولي)</label>
            <input
              type="text"
              value={shipping.internationalTracking}
              onChange={(e) => setShipping({ ...shipping, internationalTracking: e.target.value })}
              className={styles.input}
              placeholder="رقم التتبع"
            />
          </div>
          <div className={styles.formGroup}>
            <label>شركة التوصيل المحلية</label>
            <select
              value={shipping.localCompany}
              onChange={(e) => setShipping({ ...shipping, localCompany: e.target.value })}
              className={styles.select}
            >
              <option value="">اختر الشركة</option>
              <option value="libya-post">بريد ليبيا</option>
              <option value="local-courier">شركة توصيل محلية</option>
              <option value="pickup">استلام من المقر</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>رقم التتبع (محلي)</label>
            <input
              type="text"
              value={shipping.localTracking}
              onChange={(e) => setShipping({ ...shipping, localTracking: e.target.value })}
              className={styles.input}
              placeholder="رقم التتبع"
            />
          </div>
          <div className={styles.formGroup}>
            <label>المستودع / نقطة الاستلام</label>
            <input
              type="text"
              value={shipping.warehouse}
              onChange={(e) => setShipping({ ...shipping, warehouse: e.target.value })}
              className={styles.input}
              placeholder="نقطة الاستلام"
            />
          </div>
        </div>
        <div className={styles.shippingStages}>
          <div className={styles.stage}>تم الشراء</div>
          <div className={styles.stage}>تم الشحن دولياً</div>
          <div className={styles.stage}>وصلت إلى ليبيا</div>
          <div className={styles.stage}>تم التسليم للموصل المحلي</div>
          <div className={styles.stage}>تم التسليم</div>
        </div>
      </div> */}

      {/* 4.5. Expenses */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <HiShoppingBag />
          المصروفات (اختياري)
        </h2>
        <p style={{ color: '#6B7280', marginBottom: '1rem', fontSize: '0.9rem' }}>
          اختر المصروفات المرتبطة بهذا الطلب:
        </p>
        {loadingExpenses ? (
          <p>جاري تحميل المصروفات...</p>
        ) : (
          <div className={styles.expensesGrid}>
            {expenses.filter(exp => exp.is_active !== false).map((expense) => (
              <label key={expense.id} className={styles.expenseCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedExpenses.includes(expense.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedExpenses([...selectedExpenses, expense.id])
                    } else {
                      setSelectedExpenses(selectedExpenses.filter(id => id !== expense.id))
                    }
                  }}
                />
                <div className={styles.expenseInfo}>
                  <div className={styles.expenseName}>
                    {expense.name}
                    {expense.name_en && <span className={styles.expenseNameEn}> ({expense.name_en})</span>}
                  </div>
                  {expense.description && (
                    <div className={styles.expenseDescription}>{expense.description}</div>
                  )}
                  <div className={styles.expenseCost}>
                    {parseFloat(expense.cost).toFixed(2)} {expense.currency === 'LYD' ? 'د.ل' : expense.currency}
                  </div>
                </div>
              </label>
            ))}
            {expenses.filter(exp => exp.is_active !== false).length === 0 && (
              <p style={{ color: '#6B7280', gridColumn: '1 / -1' }}>
                لا توجد مصروفات متاحة. يمكنك إضافة مصروفات من صفحة{' '}
                <Link href="/payments/expenses" style={{ color: 'var(--primary)' }}>المصروفات</Link>.
              </p>
            )}
          </div>
        )}
        {selectedExpenses.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#F3F4F6', borderRadius: 'var(--border-radius)' }}>
            <strong>المصروفات المختارة:</strong>
            <ul style={{ margin: '0.5rem 0 0 0', paddingRight: '1.5rem' }}>
              {selectedExpenses.map(expId => {
                const exp = expenses.find(e => e.id === expId)
                return exp ? (
                  <li key={expId}>
                    {exp.name}: {parseFloat(exp.cost).toFixed(2)} {exp.currency === 'LYD' ? 'د.ل' : exp.currency}
                  </li>
                ) : null
              })}
            </ul>
            <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
              إجمالي المصروفات: {selectedExpenses.reduce((sum, expId) => {
                const exp = expenses.find(e => e.id === expId)
                return sum + (exp ? parseFloat(exp.cost) : 0)
              }, 0).toFixed(2)} د.ل
            </div>
          </div>
        )}
      </div>

      {/* 5. Payment Snapshot */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <HiCurrencyDollar />
          ملخص الدفع
        </h2>
        <div className={styles.grid}>
          <div className={styles.formGroup}>
            <label>العربون المطلوب</label>
            <div className={styles.depositInputGroup}>
              <input
                type="number"
                step="0.01"
                value={payment.depositRequired}
                onChange={(e) => setPayment({ ...payment, depositRequired: e.target.value })}
                className={styles.input}
                placeholder="0.00"
              />
              <select
                value={payment.depositType}
                onChange={(e) => setPayment({ ...payment, depositType: e.target.value })}
                className={styles.select}
              >
                <option value="percentage">%</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>تم دفع العربون؟</label>
            <select
              value={payment.depositPaid ? 'yes' : 'no'}
              onChange={(e) => setPayment({ ...payment, depositPaid: e.target.value === 'yes' })}
              className={styles.select}
            >
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </select>
          </div>
          {payment.depositPaid && (
            <>
              <div className={styles.formGroup}>
                <label>مبلغ العربون المدفوع</label>
                <input
                  type="number"
                  step="0.01"
                  value={payment.depositAmount}
                  onChange={(e) => setPayment({ ...payment, depositAmount: e.target.value })}
                  className={styles.input}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.formGroup}>
                <label>طريقة الدفع</label>
                <select
                  value={payment.paymentMethod}
                  onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}
                  className={styles.select}
                >
                  <option value="">اختر الطريقة</option>
                  <option value="cash">نقدي</option>
                  <option value="transfer">تحويل بنكي</option>
                  <option value="card">بطاقة</option>
                </select>
              </div>
            </>
          )}
          <div className={styles.formGroup}>
            <label>الرصيد المتبقي</label>
            <div className={styles.remainingBalance}>
              {totals.total - (parseFloat(payment.depositAmount) || 0)} د.ل
            </div>
          </div>
        </div>
      </div>

      {/* 7. Actions */}
      <div className={styles.actionsSection}>
        <button
          onClick={handleSaveDraft}
          className={styles.actionButtonSecondary}
          type="button"
        >
          <HiSave />
          حفظ كمسودة / Save as Draft
        </button>
        <button
          onClick={handleCreateOrder}
          className={styles.actionButtonPrimary}
          type="button"
        >
          <HiCheckCircle />
          إنشاء الطلب / Create Order
        </button>
        <button
          onClick={handleCreateAndRequestDeposit}
          className={styles.actionButtonPrimary}
          type="button"
        >
          <HiCurrencyDollar />
          إنشاء وطلب عربون / Create & Request Deposit
        </button>
        <button
          onClick={() => window.history.back()}
          className={styles.actionButtonCancel}
          type="button"
        >
          <HiX />
          إلغاء / Cancel
        </button>
      </div>

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className={styles.modalOverlay} onClick={handleCloseCustomerModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>إضافة عميل جديد</h3>
              <button onClick={handleCloseCustomerModal} className={styles.closeButton}>
                <HiX />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className={styles.modalForm}>
              <div className={styles.modalFormGroup}>
                <label className={styles.required}>الاسم</label>
                <input
                  type="text"
                  name="name"
                  value={newCustomerData.name}
                  onChange={handleCustomerInputChange}
                  className={styles.modalInput}
                  placeholder="اسم العميل"
                  required
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label className={styles.required}>رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={newCustomerData.phone}
                  onChange={handleCustomerInputChange}
                  className={styles.modalInput}
                  placeholder="0912345678"
                  required
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>البريد الإلكتروني</label>
                <input
                  type="email"
                  name="email"
                  value={newCustomerData.email}
                  onChange={handleCustomerInputChange}
                  className={styles.modalInput}
                  placeholder="email@example.com"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>العنوان</label>
                <textarea
                  name="address"
                  value={newCustomerData.address}
                  onChange={handleCustomerInputChange}
                  className={styles.modalTextarea}
                  placeholder="العنوان الكامل"
                  rows="3"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>حساب فيسبوك</label>
                <input
                  type="text"
                  name="fb_account"
                  value={newCustomerData.fb_account}
                  onChange={handleCustomerInputChange}
                  className={styles.modalInput}
                  placeholder="https://facebook.com/username"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>حساب واتساب</label>
                <input
                  type="text"
                  name="wh_account"
                  value={newCustomerData.wh_account}
                  onChange={handleCustomerInputChange}
                  className={styles.modalInput}
                  placeholder="+218912345678"
                />
              </div>

              <div className={styles.modalFormGroup}>
                <label>طريقة التواصل المفضلة</label>
                <select
                  name="preferred_contact"
                  value={newCustomerData.preferred_contact}
                  onChange={handleCustomerInputChange}
                  className={styles.modalSelect}
                >
                  <option value="">اختر طريقة التواصل</option>
                  <option value="phone">هاتف</option>
                  <option value="whatsapp">واتساب</option>
                  <option value="facebook">فيسبوك</option>
                  <option value="email">بريد إلكتروني</option>
                </select>
              </div>

              <div className={styles.modalFormGroup}>
                <label>ملاحظات</label>
                <textarea
                  name="notes"
                  value={newCustomerData.notes}
                  onChange={handleCustomerInputChange}
                  className={styles.modalTextarea}
                  placeholder="ملاحظات إضافية عن العميل"
                  rows="3"
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleCloseCustomerModal}
                  className={styles.modalCancelButton}
                  disabled={savingCustomer}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={styles.modalSaveButton}
                  disabled={savingCustomer}
                >
                  {savingCustomer ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
