# Orders Database Schema Documentation

## Overview
This document describes the database schema required for the order management system. The schema supports multi-currency orders with exchange rates, expenses tracking, and shipping management.

---

## Required Tables

### 1. **orders** (الطلبات)
Main table storing order information.

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | ✅ |
| `internal_ref` | VARCHAR(50) | Unique reference (e.g., ORD-1234567890) | ✅ |
| `customer_id` | UUID | Foreign key to customers table | ✅ |
| `order_date` | DATE | Date when order was created | ✅ |
| `order_source` | VARCHAR(20) | Source: 'manual', 'shein', 'other' | ✅ |
| `basket_link` | TEXT | Link to basket (optional) | ❌ |
| `expected_delivery_date` | DATE | Expected delivery date | ❌ |
| `notes` | TEXT | Internal notes | ❌ |
| `subtotal` | DECIMAL(12,2) | Subtotal in LYD (base currency) | ✅ |
| `expenses_total` | DECIMAL(12,2) | Total expenses in LYD | ✅ |
| `service_fee` | DECIMAL(12,2) | Service fee (10%) in LYD | ✅ |
| `international_shipping` | DECIMAL(12,2) | International shipping cost in LYD | ✅ |
| `local_delivery` | DECIMAL(12,2) | Local delivery cost in LYD | ✅ |
| `discount` | DECIMAL(12,2) | Discount amount in LYD | ✅ |
| `total_amount` | DECIMAL(12,2) | Total order amount in LYD | ✅ |
| `status` | VARCHAR(20) | Order status: 'pending', 'processing', 'shipping', 'delivered', 'cancelled' | ✅ |
| `has_issues` | BOOLEAN | Whether order has issues | ✅ |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ |
| `updated_at` | TIMESTAMP | Last update timestamp | ✅ |

**Indexes:**
- `customer_id`
- `status`
- `order_date`
- `internal_ref` (unique)

---

### 2. **order_items** (عناصر الطلب)
Stores individual items in each order with multi-currency support.

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | ✅ |
| `order_id` | UUID | Foreign key to orders | ✅ |
| `name` | VARCHAR(255) | Product name | ✅ |
| `product_id` | VARCHAR(100) | SKU or external product ID | ❌ |
| `variant` | TEXT | Variant info (e.g., "M - blue") | ❌ |
| `sku` | VARCHAR(100) | SKU code | ❌ |
| `quantity` | INTEGER | Quantity ordered | ✅ |
| `unit_price` | DECIMAL(12,2) | Price per unit in original currency | ✅ |
| `currency` | VARCHAR(3) | Currency: 'LYD', 'EUR', 'USD', 'GBP', 'TRY' | ✅ |
| `exchange_rate` | DECIMAL(10,4) | Exchange rate to LYD | ✅ |
| `total_price` | DECIMAL(12,2) | Total in original currency | ✅ |
| `total_price_lyd` | DECIMAL(12,2) | Total converted to LYD | ✅ |
| `product_link` | TEXT | Original product link | ❌ |
| `images` | TEXT[] | Array of image URLs | ❌ |
| `weight` | VARCHAR(50) | Product weight | ❌ |
| `dimensions` | VARCHAR(100) | Product dimensions | ❌ |
| `color` | VARCHAR(50) | Product color | ❌ |
| `size` | VARCHAR(50) | Product size | ❌ |
| `availability` | VARCHAR(20) | 'in_stock', 'out_of_stock', 'unknown' | ❌ |
| `status` | VARCHAR(20) | 'pending', 'received', 'missing', 'damaged' | ❌ |
| `is_locked` | BOOLEAN | If from API, cannot be edited | ❌ |
| `source` | VARCHAR(20) | 'manual', 'api', 'shein' | ❌ |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ |
| `updated_at` | TIMESTAMP | Last update timestamp | ✅ |

**Indexes:**
- `order_id`
- `status`

---

### 3. **order_expenses** (مصروفات الطلب)
Links expenses to orders (snapshot at time of order).

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | ✅ |
| `order_id` | UUID | Foreign key to orders | ✅ |
| `expense_id` | UUID | Reference to expenses table | ✅ |
| `expense_name` | VARCHAR(255) | Expense name (snapshot) | ✅ |
| `expense_name_en` | VARCHAR(255) | English name (snapshot) | ❌ |
| `cost` | DECIMAL(12,2) | Cost at time of order | ✅ |
| `currency` | VARCHAR(3) | Currency code | ✅ |
| `category` | VARCHAR(50) | 'packaging', 'shipping', 'storage', 'other' | ❌ |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ |

**Indexes:**
- `order_id`

---

### 4. **order_shipping** (معلومات الشحن)
Shipping and delivery tracking information.

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | ✅ |
| `order_id` | UUID | Foreign key to orders | ✅ |
| `international_company` | VARCHAR(100) | 'dhl', 'fedex', 'aramex', 'other' | ❌ |
| `international_tracking` | VARCHAR(255) | International tracking number | ❌ |
| `local_company` | VARCHAR(100) | 'libya-post', 'local-courier', 'pickup' | ❌ |
| `local_tracking` | VARCHAR(255) | Local tracking number | ❌ |
| `warehouse` | VARCHAR(255) | Warehouse location | ❌ |
| `shipping_stage` | VARCHAR(50) | Current shipping stage | ✅ |
| `international_shipped_date` | DATE | Date shipped internationally | ❌ |
| `arrived_libya_date` | DATE | Date arrived in Libya | ❌ |
| `local_delivery_date` | DATE | Date of local delivery | ❌ |
| `delivered_date` | DATE | Date delivered to customer | ❌ |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ |
| `updated_at` | TIMESTAMP | Last update timestamp | ✅ |

**Shipping Stages:**
- `not_started`
- `international_shipping`
- `arrived_libya`
- `local_delivery`
- `delivered`

**Indexes:**
- `order_id`
- `shipping_stage`

---

### 5. **order_payments** (معلومات الدفع)
Payment and deposit information.

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | ✅ |
| `order_id` | UUID | Foreign key to orders | ✅ |
| `deposit_required` | DECIMAL(12,2) | Required deposit amount | ✅ |
| `deposit_type` | VARCHAR(20) | 'percentage' or 'fixed' | ✅ |
| `deposit_paid` | BOOLEAN | Whether deposit was paid | ✅ |
| `deposit_amount` | DECIMAL(12,2) | Actual deposit paid | ✅ |
| `deposit_payment_method` | VARCHAR(50) | 'cash', 'transfer', 'card' | ❌ |
| `deposit_paid_date` | DATE | Date deposit was paid | ❌ |
| `remaining_balance` | DECIMAL(12,2) | Remaining balance to pay | ✅ |
| `payment_status` | VARCHAR(20) | 'unpaid', 'partial', 'paid' | ✅ |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ |
| `updated_at` | TIMESTAMP | Last update timestamp | ✅ |

**Payment Status Values:**
- `unpaid` - No payment received
- `partial` - Deposit paid, balance remaining
- `paid` - Fully paid

**Indexes:**
- `order_id`
- `payment_status`

---

### 6. **expenses** (المصروفات)
Master table for expenses that can be added to orders.

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | ✅ |
| `name` | VARCHAR(255) | Expense name (Arabic) | ✅ |
| `name_en` | VARCHAR(255) | Expense name (English) | ❌ |
| `description` | TEXT | Expense description | ❌ |
| `cost` | DECIMAL(12,2) | Cost per unit | ✅ |
| `currency` | VARCHAR(3) | Currency code | ✅ |
| `category` | VARCHAR(50) | 'packaging', 'shipping', 'storage', 'other' | ✅ |
| `is_active` | BOOLEAN | Whether expense is active | ✅ |
| `created_at` | TIMESTAMP | Creation timestamp | ✅ |
| `updated_at` | TIMESTAMP | Last update timestamp | ✅ |

**Indexes:**
- `category`
- `is_active`

---

## Relationships

```
customers (1) ──< (many) orders
orders (1) ──< (many) order_items
orders (1) ──< (many) order_expenses
orders (1) ──< (1) order_shipping
orders (1) ──< (1) order_payments
expenses (1) ──< (many) order_expenses
```

---

## Important Notes

### 1. **Multi-Currency Support**
- All amounts in `orders` table are stored in **LYD (base currency)**
- `order_items` stores original currency and exchange rate
- Exchange rates are stored per item for accurate historical tracking

### 2. **Expenses**
- Expenses are stored as snapshot in `order_expenses` at time of order
- This ensures historical accuracy even if expense prices change later

### 3. **Shipping Stages**
- Tracked separately in `order_shipping` table
- Allows detailed tracking of order progress

### 4. **Payment Tracking**
- Separate table for payment information
- Tracks deposits and remaining balances
- Supports partial payments

### 5. **Data Integrity**
- Foreign keys ensure referential integrity
- Check constraints validate data values
- Indexes optimize common queries

---

## SQL File Location
The complete SQL schema is available in: `orders_schema.sql`

Run this file in your Supabase SQL editor to create all tables, indexes, triggers, and views.

---

## Next Steps

1. Run `orders_schema.sql` in Supabase
2. Create API routes in `/app/api/orders/`
3. Update order creation functions to save to database
4. Test order creation and retrieval

