# Supabase Setup Guide

## Installation

1. Install the Supabase client library:
```bash
npm install @supabase/supabase-js
```

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

# Supabase Anon/Public Key (for client-side operations)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (for server-side admin operations)
# ⚠️  KEEP THIS SECRET - Never expose this in client-side code
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Getting Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Usage

### Import the Supabase client:

```javascript
const { supabase, customer, payment } = require('./server/supabase')
```

### Customer Operations:

```javascript
// Get all active customers
const customers = await customer.getAll({ activeOnly: true })

// Get customer by ID
const customerData = await customer.getById(1)

// Get customer by phone
const customerByPhone = await customer.getByPhone('0912345678')

// Create a new customer
const newCustomer = await customer.create({
  name: 'أحمد محمد',
  phone: '0912345678',
  email: 'ahmed@example.com',
  address: 'طرابلس، شارع الجمهورية'
})

// Update customer
const updated = await customer.update(1, { email: 'newemail@example.com' })

// Soft delete customer
await customer.delete(1) // Sets is_active to false
```

### Payment Operations:

```javascript
// Get all payments
const payments = await payment.getAll()

// Get deposits only
const deposits = await payment.getDeposits()

// Get refunds only
const refunds = await payment.getRefunds()

// Get pending balances
const balances = await payment.getPendingBalances()

// Get payments by customer
const customerPayments = await payment.getByCustomerId(1)

// Get payments by order
const orderPayments = await payment.getByOrderId('ORD-001')

// Create a new payment
const newPayment = await payment.create({
  payment_type: 'deposit',
  customer_name: 'أحمد محمد',
  amount: 100.00,
  required_amount: 100.00,
  received_amount: 100.00,
  payment_method: 'transfer',
  status: 'received',
  deposit_status: 'received'
})

// Update payment
const updated = await payment.update(paymentId, { status: 'completed' })
```

## Client Types

- **`supabase`**: Standard client with anon key (respects RLS policies)
- **`supabaseAdmin`**: Admin client with service role key (bypasses RLS - use carefully)

## Notes

- The `supabase` client respects Row Level Security (RLS) policies
- The `supabaseAdmin` client bypasses RLS - only use in server-side code
- All operations return Promises - use `async/await` or `.then()`
- Errors are thrown as exceptions - wrap in try/catch blocks



