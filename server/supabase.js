/**
 * Supabase client connection
 * Handles database operations for payments and customers
 */

const { createClient } = require('@supabase/supabase-js')

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // For admin operations

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase environment variables are not set. Please check your .env file.')
}

/**
 * Create Supabase client with anon key (for client-side operations)
 * This client respects Row Level Security (RLS) policies
 */
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Create Supabase admin client with service role key (for server-side operations)
 * This client bypasses Row Level Security (RLS) policies
 * Use with caution - only for server-side operations
 */
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: async (url, options = {}) => {
          // Increase timeout for server-side requests
          // Use a promise-based timeout wrapper
          const timeout = 30000 // 30 seconds
          
          return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => {
              setTimeout(() => {
                const timeoutError = new Error(`Request timeout after ${timeout}ms`)
                timeoutError.code = 'TIMEOUT'
                timeoutError.name = 'TimeoutError'
                reject(timeoutError)
              }, timeout)
            })
          ])
        }
      }
    })
  : null

/**
 * Customer operations
 */
const customerOperations = {
  /**
   * Get all customers
   * @param {Object} options - Query options
   * @param {boolean} options.activeOnly - Only return active customers
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of customers
   */
  async getAll({ activeOnly = true, limit = 100, offset = 0 } = {}) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    let query = supabase
      .from('customer')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  /**
   * Get customer by ID
   * @param {number|string} id - Customer ID
   * @returns {Promise<Object>} Customer object
   */
  async getById(id) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('customer')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Get customer by phone number
   * @param {string} phone - Phone number
   * @returns {Promise<Object|null>} Customer object or null
   */
  async getByPhone(phone) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('customer')
      .select('*')
      .eq('phone', phone)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data || null
  },

  /**
   * Create a new customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer
   */
  async create(customerData) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('customer')
      .insert([customerData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update customer
   * @param {number|string} id - Customer ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated customer
   */
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('customer')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Delete customer (soft delete by setting is_active to false)
   * @param {number|string} id - Customer ID
   * @returns {Promise<Object>} Updated customer
   */
  async delete(id) {
    return this.update(id, { is_active: false })
  }
}

/**
 * Payment operations
 */
const paymentOperations = {
  /**
   * Get all payments
   * @param {Object} options - Query options
   * @param {string} options.paymentType - Filter by payment type (deposit, refund, balance)
   * @param {string} options.status - Filter by status
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of payments
   */
  async getAll({ paymentType, status, limit = 100, offset = 0 } = {}) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (paymentType) {
      query = query.eq('payment_type', paymentType)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  /**
   * Get payment by ID
   * @param {string} id - Payment ID (UUID)
   * @returns {Promise<Object>} Payment object
   */
  async getById(id) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Get payments by customer ID
   * @param {number|string} customerId - Customer ID
   * @returns {Promise<Array>} Array of payments
   */
  async getByCustomerId(customerId) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Get payments by order ID
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} Array of payments
   */
  async getByOrderId(orderId) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  /**
   * Create a new payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Created payment
   */
  async create(paymentData) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update payment
   * @param {string} id - Payment ID (UUID)
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated payment
   */
  async update(id, updates) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Get deposits (using view)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of deposits
   */
  async getDeposits(options = {}) {
    return this.getAll({ ...options, paymentType: 'deposit' })
  },

  /**
   * Get refunds (using view)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of refunds
   */
  async getRefunds(options = {}) {
    return this.getAll({ ...options, paymentType: 'refund' })
  },

  /**
   * Get pending balances (using view)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of pending balances
   */
  async getPendingBalances(options = {}) {
    return this.getAll({ ...options, paymentType: 'balance' })
  }
}

/**
 * Order operations
 */
const orderOperations = {
  /**
   * Create a new order with all related data
   * @param {Object} orderData - Complete order data including items, expenses, shipping, payments
   * @returns {Promise<Object>} Created order with all relations
   */
  async create(orderData) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    // Helper function to validate and format dates
    const formatDate = (dateValue) => {
      if (!dateValue) return null
      if (typeof dateValue === 'string') {
        // Check if it's already in YYYY-MM-DD format
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateValue
        }
        // Try to parse and format it
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]
        }
      }
      // If it's a number or invalid, return null
      return null
    }
    
    const {
      // Order basic info
      customer_id,
      internal_ref,
      order_date,
      order_source = 'manual',
      basket_link,
      expected_delivery_date,
      notes,
      
      // Financial totals
      subtotal,
      expenses_total,
      service_fee,
      international_shipping,
      local_delivery,
      discount,
      total_amount,
      
      // Status
      status = 'pending',
      has_issues = false,
      
      // Related data
      items = [],
      expenses = [],
      shipping = {},
      payment = {}
    } = orderData

    // Start transaction by creating order first
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([{
        customer_id,
        internal_ref,
        order_date: formatDate(order_date) || new Date().toISOString().split('T')[0], // Default to today if invalid
        order_source,
        basket_link,
        expected_delivery_date: formatDate(expected_delivery_date),
        notes,
        subtotal,
        expenses_total,
        service_fee,
        international_shipping,
        local_delivery,
        discount,
        total_amount,
        status,
        has_issues
      }])
      .select()
      .single()

    if (orderError) throw orderError
    if (!order) throw new Error('Failed to create order')

    const orderId = order.id

    // Insert order items
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: orderId,
        name: item.name,
        product_id: item.productId,
        variant: item.variant,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        selling_price: parseFloat(item.sellingPrice) || 0,
        currency: item.currency || 'LYD',
        exchange_rate: item.exchangeRate || 1.0,
        total_price: item.unitPrice * item.quantity,
        total_price_lyd: (item.unitPrice * item.quantity) * (item.exchangeRate || 1.0),
        total_selling_price: (parseFloat(item.sellingPrice) || 0) * item.quantity,
        product_link: item.originalLink,
        images: item.images || [],
        weight: item.weight,
        dimensions: item.dimensions,
        color: item.color,
        size: item.size,
        availability: item.availability || 'unknown',
        status: item.status || 'pending',
        is_locked: item.locked || false,
        source: item.source || 'manual'
      }))

      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError
    }

    // Insert order expenses
    if (expenses.length > 0) {
      const orderExpenses = expenses.map(exp => ({
        order_id: orderId,
        expense_id: exp.id,
        expense_name: exp.name,
        expense_name_en: exp.nameEn,
        cost: exp.cost,
        currency: exp.currency || 'LYD',
        category: exp.category
      }))

      const { error: expensesError } = await supabaseAdmin
        .from('order_expenses')
        .insert(orderExpenses)

      if (expensesError) throw expensesError
    }

    // Insert shipping info
    if (shipping) {
      const { error: shippingError } = await supabaseAdmin
        .from('order_shipping')
        .insert([{
          order_id: orderId,
          international_company: shipping.internationalCompany,
          international_tracking: shipping.internationalTracking,
          local_company: shipping.localCompany,
          local_tracking: shipping.localTracking,
          warehouse: shipping.warehouse,
          shipping_stage: 'not_started'
        }])

      if (shippingError) throw shippingError
    }

    // Insert payment info
    if (payment) {
      const depositRequired = parseFloat(payment.depositRequired) || 0
      const depositAmount = parseFloat(payment.depositAmount) || 0
      const remainingBalance = total_amount - depositAmount
      
      let paymentStatus = 'unpaid'
      if (depositAmount > 0 && remainingBalance > 0) {
        paymentStatus = 'partial'
      } else if (depositAmount >= total_amount) {
        paymentStatus = 'paid'
      }

      // Validate and format deposit_paid_date
      let depositPaidDate = null
      if (payment.depositPaid && payment.depositPaidDate) {
        const dateStr = String(payment.depositPaidDate).trim()
        // Reject if it's just a number (like "10") or too short
        if (dateStr.length < 8) {
          console.warn(`Invalid date format received: "${dateStr}". Expected YYYY-MM-DD format.`)
          depositPaidDate = null
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Valid YYYY-MM-DD format
          depositPaidDate = dateStr
        } else {
          // Try to parse and format it
          const date = new Date(dateStr)
          if (!isNaN(date.getTime()) && dateStr.length >= 8) {
            depositPaidDate = date.toISOString().split('T')[0]
          } else {
            console.warn(`Could not parse date: "${dateStr}". Setting to null.`)
            depositPaidDate = null
          }
        }
      }

      const { error: paymentError } = await supabaseAdmin
        .from('order_payments')
        .insert([{
          order_id: orderId,
          deposit_required: depositRequired,
          deposit_type: payment.depositType || 'percentage',
          deposit_paid: payment.depositPaid || false,
          deposit_amount: depositAmount,
          deposit_payment_method: payment.paymentMethod,
          deposit_paid_date: depositPaidDate,
          remaining_balance: remainingBalance,
          payment_status: paymentStatus
        }])

      if (paymentError) throw paymentError
    }

    // Fetch complete order with relations
    return this.getById(orderId)
  },

  /**
   * Get order by ID with all relations
   * @param {string} id - Order ID (UUID)
   * @returns {Promise<Object>} Order with all relations
   */
  async getById(id) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError) throw orderError
    if (!order) return null

    // Get order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })

    if (itemsError) throw itemsError

    // Get order expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('order_expenses')
      .select('*')
      .eq('order_id', id)

    if (expensesError) throw expensesError

    // Get shipping info
    const { data: shipping, error: shippingError } = await supabase
      .from('order_shipping')
      .select('*')
      .eq('order_id', id)
      .single()

    if (shippingError && shippingError.code !== 'PGRST116') throw shippingError

    // Get payment info
    const { data: payment, error: paymentError } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', id)
      .single()

    if (paymentError && paymentError.code !== 'PGRST116') throw paymentError

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from('customer')
      .select('*')
      .eq('id', order.customer_id)
      .single()

    if (customerError) throw customerError

    return {
      ...order,
      customer,
      items: items || [],
      expenses: expenses || [],
      shipping: shipping || null,
      payment: payment || null
    }
  },

  /**
   * Get all orders with filters
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of orders
   */
  async getAll({ status, limit = 100, offset = 0 } = {}) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customer_id (
          id,
          name,
          phone,
          email,
          address
        ),
        items:order_items (
          id,
          quantity,
          unit_price,
          selling_price,
          purchase_price,
          purchase_exchange_rate
        ),
        expenses:order_expenses (
          id,
          amount,
          currency,
          exchange_rate
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data: orders, error } = await query
    
    if (error) throw error
    if (!orders || orders.length === 0) return []
    
    // Fetch payment and shipping data for all orders
    const orderIds = orders.map(o => o.id)
    
    // Get all payments for these orders
    const { data: payments, error: paymentsError } = await supabase
      .from('order_payments')
      .select('*')
      .in('order_id', orderIds)
    
    if (paymentsError) throw paymentsError
    
    // Get all shipping records for these orders
    const { data: shippingRecords, error: shippingError } = await supabase
      .from('order_shipping')
      .select('*')
      .in('order_id', orderIds)
    
    if (shippingError) throw shippingError
    
    // Map payments and shipping to orders
    const paymentsMap = new Map((payments || []).map(p => [p.order_id, p]))
    const shippingMap = new Map((shippingRecords || []).map(s => [s.order_id, s]))
    
    return orders.map(order => ({
      ...order,
      payment: paymentsMap.get(order.id) || null,
      shipping: shippingMap.get(order.id) || null
    }))
  },

  /**
   * Update order
   * @param {string} id - Order ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated order
   */
  async update(id, updates) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Delete order (cascade will delete related records)
   * @param {string} id - Order ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const { error } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

/**
 * Financial Account operations
 */
const financialAccountOperations = {
  /**
   * Get all financial accounts
   * @param {Object} options - Query options
   * @param {string} options.accountType - Filter by account type ('asset' or 'liability')
   * @param {boolean} options.activeOnly - Only return active accounts
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of financial accounts
   */
  async getAll({ accountType, activeOnly = true, limit = 100, offset = 0 } = {}) {
    if (!supabaseAdmin && !supabase) {
      throw new Error('Supabase client not initialized')
    }
    
    // Use admin client for server-side operations (preferred) or fallback to regular client
    const client = supabaseAdmin || supabase
    
    // Retry logic with exponential backoff for network errors
    const maxRetries = 3
    let lastError
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        let query = client
          .from('financial_accounts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        if (accountType) {
          query = query.eq('account_type', accountType)
        }
        
        if (activeOnly) {
          query = query.eq('is_active', true)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        return data || []
      } catch (error) {
        lastError = error
        
        // Don't retry on non-network errors (like validation errors)
        const isNetworkError = error.message?.includes('timeout') || 
                              error.message?.includes('TIMEOUT') || 
                              error.message?.includes('ECONNREFUSED') ||
                              error.message?.includes('fetch failed') ||
                              error.code?.includes('TIMEOUT') ||
                              error.code === 'UND_ERR_CONNECT_TIMEOUT'
        
        if (!isNetworkError) {
          throw error
        }
        
        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
          console.warn(`[Financial Accounts] Retrying query (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // If all retries failed, throw the last error
    throw lastError || new Error('Failed to fetch financial accounts after retries')
  },

  /**
   * Get financial account by ID
   * @param {string} id - Account ID (UUID)
   * @returns {Promise<Object>} Financial account object
   */
  async getById(id) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Create a new financial account
   * @param {Object} accountData - Account data
   * @returns {Promise<Object>} Created account
   */
  async create(accountData) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const { data, error } = await supabaseAdmin
      .from('financial_accounts')
      .insert([accountData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Update financial account
   * @param {string} id - Account ID (UUID)
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated account
   */
  async update(id, updates) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const { data, error } = await supabaseAdmin
      .from('financial_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Delete financial account (soft delete by setting is_active to false)
   * @param {string} id - Account ID (UUID)
   * @returns {Promise<Object>} Updated account
   */
  async delete(id) {
    return this.update(id, { is_active: false })
  },

  /**
   * Get assets only
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of asset accounts
   */
  async getAssets(options = {}) {
    return this.getAll({ ...options, accountType: 'asset' })
  },

  /**
   * Get liabilities only
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of liability accounts
   */
  async getLiabilities(options = {}) {
    return this.getAll({ ...options, accountType: 'liability' })
  }
}

/**
 * Financial Transaction operations
 */
const financialTransactionOperations = {
  /**
   * Get all financial transactions
   * @param {Object} options - Query options
   * @param {string} options.accountId - Filter by account ID
   * @param {string} options.transactionType - Filter by transaction type
   * @param {number} options.limit - Limit number of results
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Array>} Array of transactions
   */
  async getAll({ accountId, transactionType, limit = 100, offset = 0 } = {}) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    let query = supabase
      .from('financial_transactions')
      .select(`
        *,
        account:financial_accounts!financial_transactions_account_id_fkey(
          id,
          name,
          account_type,
          currency
        ),
        related_account:financial_accounts!financial_transactions_related_account_id_fkey(
          id,
          name,
          account_type,
          currency
        )
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (accountId) {
      query = query.or(`account_id.eq.${accountId},related_account_id.eq.${accountId}`)
    }
    
    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  },

  /**
   * Get recent transactions for an account
   * @param {string} accountId - Account ID (UUID)
   * @param {number} limit - Number of transactions to return
   * @returns {Promise<Array>} Array of recent transactions
   */
  async getRecentByAccount(accountId, limit = 10) {
    return this.getAll({ accountId, limit })
  },

  /**
   * Get transaction by ID
   * @param {string} id - Transaction ID (UUID)
   * @returns {Promise<Object>} Transaction object
   */
  async getById(id) {
    if (!supabase) throw new Error('Supabase client not initialized')
    
    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        account:financial_accounts!financial_transactions_account_id_fkey(*),
        related_account:financial_accounts!financial_transactions_related_account_id_fkey(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Create a new financial transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  async create(transactionData) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    // Calculate amount_in_base_currency if not provided
    if (!transactionData.amount_in_base_currency) {
      transactionData.amount_in_base_currency = transactionData.amount * (transactionData.exchange_rate || 1.0)
    }
    
    const { data, error } = await supabaseAdmin
      .from('financial_transactions')
      .insert([transactionData])
      .select(`
        *,
        account:financial_accounts!financial_transactions_account_id_fkey(*),
        related_account:financial_accounts!financial_transactions_related_account_id_fkey(*)
      `)
      .single()
    
    if (error) throw error
    
    // Update account balance (skip for transfer transactions as they're handled in createTransfer)
    if (transactionData.transaction_type !== 'transfer') {
      await this.updateAccountBalance(transactionData.account_id, transactionData.transaction_type, transactionData.amount, transactionData.currency, transactionData.exchange_rate)
    }
    
    return data
  },

  /**
   * Update account balance based on transaction
   * @param {string} accountId - Account ID
   * @param {string} transactionType - 'credit' or 'debit'
   * @param {number} amount - Transaction amount (should be in account's currency)
   * @param {string} currency - Transaction currency
   * @param {number} exchangeRate - Exchange rate to base currency (for reporting only)
   */
  async updateAccountBalance(accountId, transactionType, amount, currency, exchangeRate = 1.0) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    // Get current account balance and currency
    const { data: account, error: accountError } = await supabaseAdmin
      .from('financial_accounts')
      .select('balance, currency')
      .eq('id', accountId)
      .single()
    
    if (accountError) throw accountError
    
    // For purchase transactions, the amount should be in the account's currency
    // If currencies don't match, log a warning but proceed
    // (In production, you might want to throw an error or convert properly)
    let amountToAdjust = amount
    
    if (currency !== account.currency) {
      console.warn(`Currency mismatch: Transaction in ${currency}, Account in ${account.currency}. Using amount directly.`)
      // If account is in base currency (LYD), convert using exchange rate
      if (account.currency === 'LYD') {
        amountToAdjust = amount * exchangeRate
      }
      // Otherwise, assume the amount is already correct (shouldn't happen in normal flow)
    }
    
    // Calculate new balance
    let newBalance = parseFloat(account.balance || 0)
    
    if (transactionType === 'credit') {
      // Money coming into account - increase balance
      newBalance += amountToAdjust
    } else if (transactionType === 'debit') {
      // Money going out of account - decrease balance
      newBalance = Math.max(0, newBalance - amountToAdjust)
    }
    
    // Update account balance
    const { error: updateError } = await supabaseAdmin
      .from('financial_accounts')
      .update({ balance: newBalance })
      .eq('id', accountId)
    
    if (updateError) throw updateError
    
    return newBalance
  },

  /**
   * Recalculate account balance from all transactions
   * @param {string} accountId - Account ID
   * @returns {Promise<number>} New balance
   */
  async recalculateAccountBalance(accountId) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    // Get all transactions for this account
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('financial_transactions')
      .select('transaction_type, amount, currency, exchange_rate, account_id, related_account_id')
      .or(`account_id.eq.${accountId},related_account_id.eq.${accountId}`)
    
    if (txError) throw txError
    
    // Get account currency
    const { data: account, error: accountError } = await supabaseAdmin
      .from('financial_accounts')
      .select('currency')
      .eq('id', accountId)
      .single()
    
    if (accountError) throw accountError
    
    // Calculate balance
    let balance = 0
    transactions.forEach(tx => {
      let amount = parseFloat(tx.amount || 0)
      const exchangeRate = parseFloat(tx.exchange_rate || 1.0)
      
      // Convert to account currency if needed
      if (tx.currency !== account.currency) {
        if (account.currency === 'LYD') {
          amount = amount * exchangeRate
        }
        // For other currencies, we'd need proper conversion
      }
      
      if (tx.transaction_type === 'credit') {
        if (tx.account_id === accountId) {
          balance += amount
        }
      } else if (tx.transaction_type === 'debit') {
        if (tx.account_id === accountId) {
          balance -= amount
        }
      } else if (tx.transaction_type === 'transfer') {
        if (tx.account_id === accountId) {
          // Money going out
          balance -= amount
        } else if (tx.related_account_id === accountId) {
          // Money coming in (already converted)
          balance += amount
        }
      }
    })
    
    // Update account balance
    const { error: updateError } = await supabaseAdmin
      .from('financial_accounts')
      .update({ balance: Math.max(0, balance) })
      .eq('id', accountId)
    
    if (updateError) throw updateError
    
    return Math.max(0, balance)
  },

  /**
   * Create a transfer transaction (creates two transaction records)
   * @param {Object} transferData - Transfer data
   * @returns {Promise<Array>} Array of created transactions
   */
  async createTransfer(transferData) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const {
      from_account_id,
      to_account_id,
      amount,
      currency,
      exchange_rate = 1.0,
      description,
      transaction_date
    } = transferData
    
    if (!from_account_id || !to_account_id || !amount) {
      throw new Error('from_account_id, to_account_id, and amount are required')
    }
    
    // Calculate converted amount
    const converted_amount = amount * exchange_rate
    
    // Get account currencies to determine exchange rate
    // We need to access the operations here, so we'll use supabaseAdmin directly
    const { data: fromAccount, error: fromError } = await supabaseAdmin
      .from('financial_accounts')
      .select('*')
      .eq('id', from_account_id)
      .single()
    
    if (fromError) throw fromError
    
    const { data: toAccount, error: toError } = await supabaseAdmin
      .from('financial_accounts')
      .select('*')
      .eq('id', to_account_id)
      .single()
    
    if (toError) throw toError
    
    const baseAmount = amount * exchange_rate
    
    // Calculate new balances using the account data we already fetched
    // For from_account: decrease balance (money going out)
    const fromCurrentBalance = parseFloat(fromAccount.balance || 0)
    const fromNewBalance = Math.max(0, fromCurrentBalance - amount)
    
    // For to_account: increase balance (money coming in, already converted)
    const toCurrentBalance = parseFloat(toAccount.balance || 0)
    const toNewBalance = toCurrentBalance + converted_amount
    
    // Create debit transaction from source account
    const debitTransaction = await this.create({
      account_id: from_account_id,
      related_account_id: to_account_id,
      transaction_type: 'transfer',
      amount: amount,
      currency: fromAccount.currency,
      exchange_rate: exchange_rate,
      amount_in_base_currency: baseAmount,
      description: description || `تحويل إلى ${toAccount.name}`,
      transaction_date: transaction_date || new Date().toISOString().split('T')[0]
    })
    
    // Create credit transaction to destination account
    const creditTransaction = await this.create({
      account_id: to_account_id,
      related_account_id: from_account_id,
      transaction_type: 'transfer',
      amount: converted_amount,
      currency: toAccount.currency,
      exchange_rate: 1.0, // Already converted
      amount_in_base_currency: baseAmount,
      description: description || `تحويل من ${fromAccount.name}`,
      transaction_date: transaction_date || new Date().toISOString().split('T')[0]
    })
    
    // Update account balances
    const { error: updateFromError } = await supabaseAdmin
      .from('financial_accounts')
      .update({ balance: fromNewBalance })
      .eq('id', from_account_id)
    
    if (updateFromError) throw updateFromError
    
    const { error: updateToError } = await supabaseAdmin
      .from('financial_accounts')
      .update({ balance: toNewBalance })
      .eq('id', to_account_id)
    
    if (updateToError) throw updateToError
    
    return [debitTransaction, creditTransaction]
  }
}

/**
 * Financial Settings operations
 */
const financialSettingsOperations = {
  /**
   * Get financial settings
   * @returns {Promise<Object>} Settings object
   */
  async get() {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const { data, error } = await supabaseAdmin
      .from('financial_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // Return default settings if none exist (use LYD as default to match frontend)
    return data || {
      id: '00000000-0000-0000-0000-000000000000',
      base_currency: 'LYD',
      settings_json: {},
      updated_at: new Date().toISOString()
    }
  },

  /**
   * Update financial settings
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated settings
   */
  async update(updates) {
    if (!supabaseAdmin) throw new Error('Supabase admin client not initialized')
    
    const settingsId = '00000000-0000-0000-0000-000000000000'
    
    // Try to update first
    const { data, error } = await supabaseAdmin
      .from('financial_settings')
      .update(updates)
      .eq('id', settingsId)
      .select()
      .single()
    
    // If no row exists, insert it
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabaseAdmin
        .from('financial_settings')
        .insert([{ id: settingsId, ...updates }])
        .select()
        .single()
      
      if (insertError) throw insertError
      return newData
    }
    
    if (error) throw error
    return data
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  customer: customerOperations,
  payment: paymentOperations,
  order: orderOperations,
  financialAccount: financialAccountOperations,
  financialTransaction: financialTransactionOperations,
  financialSettings: financialSettingsOperations
}



