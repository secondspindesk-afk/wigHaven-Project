# 🎯 WigHaven E-Commerce Platform - Complete Technical Specification

**Version:** 2.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2025-11-30

This document provides the **complete, exhaustive technical specification** for the WigHaven E-Commerce Platform, covering both backend API capabilities and frontend user interface requirements.

---

# 📋 Table of Contents

1. [Authentication & Security](#authentication--security)
2. [Product Management](#product-management)
3. [Shopping Cart](#shopping-cart)
4. [Order Processing](#order-processing)
5. [Payment Integration](#payment-integration)
6. [Notification System](#notification-system)
7. [Discount & Promotions](#discount--promotions)
8. [Analytics & Dashboard](#analytics--dashboard)
9. [Media Management](#media-management)
10. [Currency & Internationalization](#currency--internationalization)
11. [Support System](#support-system)
12. [Reviews & Ratings](#reviews--ratings)
13. [Admin Capabilities](#admin-capabilities)
14. [Super Admin Capabilities](#super-admin-capabilities)
15. [Automated Jobs](#automated-jobs)
16. [Frontend Specifications](#frontend-specifications)
17. [API Documentation](#api-documentation)
18. [Error Handling](#error-handling)
19. [Infrastructure](#infrastructure)

---

# 1. 🔐 Authentication & Security

## Backend Capabilities

### Core Authentication
- ✅ **User Registration**
  - Email, password (bcrypt 10 rounds), name, phone
  - Auto-login after registration
  - Email verification token generation
  - Guest cart merging
  
- ✅ **User Login**
  - Email/Password authentication
  - JWT Access Tokens (1 hour expiry)
  - JWT Refresh Tokens (7 days expiry, auto-rotation)
  - Token blacklisting for logout
  
- ✅ **Password Management**
  - Forgot password (token-based email link)
  - Reset password with token validation
  - Change password (authenticated users)
  
- ✅ **Email Verification**
  - Token-based verification
  - Resend verification email
  - Auto-expiry after 24 hours

### Security Controls
- ✅ **Input Validation:** Joi schemas on all endpoints
- ✅ **Rate Limiting:**
  - Login: 5 attempts / 15 mins
  - Registration: 10 attempts / hour
  - Global API: 100 requests / 15 mins
- ✅ **Network Security:**
  - Helmet headers (HSTS, CSP)
  - CORS (strict production origins)
  - IP blocking middleware
- ✅ **Super Admin Security:**
  - Hidden routes (404 masking)
  - IP whitelist (`SUPER_ADMIN_WHITELIST`)
  - Header-based auth (`x-super-admin-email`, `x-super-admin-secret`)

## Frontend Specifications

### Registration Page
- **Route:** `/register`
- **API:** `POST /api/auth/register`
- **Fields:** firstName, lastName, email, phone (optional), password (min 8 chars)
- **Behavior:**
  - Success: Auto-login → redirect to `/verify-email`
  - Merge guest cart if session exists

### Login Page
- **Route:** `/login`
- **API:** `POST /api/auth/login`
- **Fields:** email, password
- **Behavior:**
  - Success: Store tokens → redirect to previous page or dashboard
  - Handle "Account Deactivated" error (401) → Show support modal

### Forgot Password Page
- **Route:** `/forgot-password`
- **API:** `POST /api/auth/password-reset/request`
- **Security:** Always show success message (prevent email enumeration)

### Reset Password Page
- **Route:** `/reset-password?token=...&email=...`
- **API:** `POST /api/auth/password-reset/confirm`
- **Fields:** newPassword, confirmPassword
- **Validation:** Match validation, min 8 chars

### Email Verification Page
- **Route:** `/verify-email?token=...`
- **API:** `POST /api/auth/verify-email`
- **States:** Loading → Success/Error
- **Actions:** Resend verification button

---

# 2. 🛍️ Product Management

## Backend Capabilities

### Product Operations
- ✅ **CRUD:** Create, Read, Update, Soft Delete
- ✅ **Advanced Search:** Filter by category, price range, stock, text search
- ✅ **Sorting:** Price (asc/desc), newness, popularity
- ✅ **Pagination:** Efficient offset pagination
- ✅ **Soft Delete:** Products marked inactive (preserves order history)

### Variant System
- ✅ **Complex Variants:** Size, Color, Length, Texture
- ✅ **SKU Generation:** Unique SKU per variant
- ✅ **Inventory Tracking:** Real-time stock per variant
- ✅ **Attribute Uniqueness:** Prevents duplicate variants
- ✅ **Bulk Variant Update:** `PATCH /api/variants/bulk`

### Bulk Operations
- ✅ **CSV Upload:** Bulk create/update products
- ✅ **Validation:** SKU collisions, invalid prices
- ✅ **Product Duplication:** `POST /api/products/:id/duplicate`

## Frontend Specifications

### Home Page
- **Route:** `/`
- **APIs:**
  - `GET /api/categories?isActive=true`
  - `GET /api/products?sort=newest&limit=10`
  - `GET /api/products?sort=popularity&limit=10`
  - `GET /api/banners/active`
- **Sections:**
  - Hero Slider (Banners)
  - Featured Categories Grid
  - New Arrivals Carousel
  - Best Sellers Grid

### Shop Page
- **Route:** `/shop`
- **API:** `GET /api/products`
- **Query Params:** page, category, minPrice, maxPrice, sort, inStock, search
- **Components:**
  - Filter Sidebar (Category, Price Range, Stock Toggle)
  - Sort Dropdown
  - Product Cards Grid
  - Pagination

### Product Details Page
- **Route:** `/product/:id`
- **API:** `GET /api/products/:id`
- **Components:**
  - Image Gallery (Main + Thumbnails, Click to enlarge)
  - Product Info:
    - Name, Price, Rating
    - Variant Selector (Dropdowns/Buttons)
    - Stock Indicator:
      - "In Stock" (> 5 units)
      - "Only X left!" (1-5 units)
      - "Out of Stock" (0) → Show "Notify Me" button
    - Quantity Selector (+/- buttons, max = stock)
    - Add to Cart, Add to Wishlist buttons
  - Tabs: Description, Reviews, Shipping Info
  - Related Products Carousel

### Search Results Page
- **Route:** `/search?q=...`
- **API:** `GET /api/products/search?q=...`
- **UI:** Same as Shop Page

### Wishlist Page
- **Route:** `/account/wishlist`
- **API:** `GET /api/wishlist`
- **Actions:**
  - Move to Cart
  - Remove → `DELETE /api/wishlist/:productId`

### Admin Product Management
- **Route:** `/admin/products`
- **Features:**
  - List: Searchable, Filterable, Sortable
  - Actions: Edit, Delete, Duplicate
  - Bulk Upload (CSV with error feedback)
  - Add/Edit Product:
    - Basic Info, Pricing, Inventory
    - Variants (Add, Delete, Bulk Update)
    - Media Upload (Drag & Drop)
    - SEO (Meta Title, Meta Description)

---

# 3. 🛒 Shopping Cart

## Backend Capabilities

### Cart Features
- ✅ **Hybrid Cart:** Guest (session-based) + User (database-backed)
- ✅ **Cart Merging:** Auto-merge guest cart on login
- ✅ **Stock Validation:** Real-time availability checks
- ✅ **Persistence:** PostgreSQL storage (not just local)
- ✅ **Auto-Cleanup:** Cron job removes old guest carts (30 days)
- ✅ **Coupon Application:** Validate and apply discount codes
- ✅ **Cart Validation:** `GET /api/cart/validate` before checkout

## Frontend Specifications

### Cart Drawer/Page
- **Location:** Drawer (slide from right) OR `/cart` page
- **API:** `GET /api/cart`
- **Components:**
  - Cart Items (Image, Name, Variant, Price, Qty Selector, Remove)
  - Coupon Input → Apply button → `POST /api/cart/coupon`
  - Order Summary (Subtotal, Discount, Tax, Shipping, Total)
  - Actions: "Continue Shopping", "Checkout"
- **Edge Case:** Stock changes → Show toast, auto-adjust qty

---

# 4. 📦 Order Processing

## Backend Capabilities

### Order Lifecycle
- ✅ **Creation:** Atomic transaction (stock deducted only if order succeeds)
- ✅ **Concurrency Safety:** Optimistic locking prevents overselling
- ✅ **Status Workflow:** pending → paid → processing → shipped → delivered
- ✅ **Guest Support:** Full guest checkout with email capture
- ✅ **Invoice Generation:** PDF invoices via Handlebars templates

### Order Management
- ✅ **Cancellation:** Users cancel pending orders (stock auto-restocked)
- ✅ **Refunds:** Admins refund paid orders (stock restocked + Paystack refund)
- ✅ **Bulk Status Update:** `PATCH /api/admin/orders/bulk-status`
- ✅ **Export CSV:** `GET /api/admin/orders/export`
- ✅ **Auto-Cancellation:** Cron job cancels unpaid orders after 30 mins

### Webhook Logs
- ✅ **Tracking:** All Paystack webhooks logged with payload
- ✅ **Admin View:** `GET /api/orders/webhooks/paystack/logs`

## Frontend Specifications

### Checkout Page
- **Route:** `/checkout`
- **Steps:**
  1. **Shipping Address:**
     - Logged In: Select saved address OR add new
     - Guest: Fill form (Name, Email, Phone, Address)
  2. **Order Review:**
     - Cart items (readonly), Address, Coupon, Summary
  3. **Payment:**
     - Paystack Integration
     - `POST /api/orders` → Returns `paystackAuthUrl` → Redirect
- **Validation:** Call `GET /api/cart/validate` before submit

### Order Confirmation Page
- **Route:** `/order-confirmation?reference=...`
- **API:** `GET /api/orders/verify?reference=...`
- **UI:**
  - Loading: "Processing payment..." (Poll every 3s, max 30s)
  - Success: Order #, Total, "View Order Details"
  - Failed: "Payment Failed", "Try Again" → `/checkout`

### User Order History
- **Route:** `/account/orders`
- **API:** `GET /api/orders`
- **UI:** List (Order #, Date, Total, Status), Filter by Status

### User Order Details
- **Route:** `/account/orders/:id`
- **API:** `GET /api/orders/:id`
- **UI:**
  - Order Info, Items, Shipping Address, Summary
  - Timeline: Placed → Paid → Processing → Shipped → Delivered
  - Actions: Download Invoice, Cancel Order (if pending), Write Review (if delivered)

### Admin Order Management
- **Route:** `/admin/orders`
- **Features:**
  - List: Filter by Status, Search by Order #/Email
  - Kanban Board: Drag & drop to update status
  - Bulk Update Status: Select multiple → Apply new status
  - Export CSV: Download with filters
  - Order Details: Update status, Process refund, Add tracking
  - Webhook Logs: View Paystack webhook history

---

# 5. 💳 Payment Integration (Paystack)

## Backend Capabilities

### Integration
- ✅ **Secure Initialization:** Server-side transaction init
- ✅ **Verification:** Server-side payment status verification
- ✅ **Webhooks:**
  - HMAC SHA512 signature verification (anti-spoofing)
  - Idempotency (handles duplicate webhooks)
  - Real-time order status updates
- ✅ **Reconciliation:** Cron job checks pending orders every 10 mins
- ✅ **Force Verify (SuperAdmin):** `POST /api/super-admin/payment/force-verify`

## Frontend Specifications

### Payment Flow
1. User completes checkout form
2. `POST /api/orders` → Receive Paystack URL
3. Redirect to Paystack hosted page
4. Paystack redirects to `/order-confirmation?reference=...`
5. Poll `GET /api/orders/verify?reference=...` for status
6. Show success or failure message

### Edge Cases
- **Failed Transactions:** Show retry button
- **Verification Delays:** Poll for 30s max, then show "Check your account page"
- **Abandoned Payments:** Order auto-cancelled after 30 mins

---

# 6. 🔔 Notification System

## Backend Capabilities

### Email System
- ✅ **Transactional Emails (20+ types):**
  - Welcome, Email Verification
  - Password Reset & Changed
  - Order Confirmation, Shipped, Delivered, Cancelled, Refunded
  - Back-in-Stock Alert
  - Abandoned Cart Reminder
  - Review Approved/Rejected
  - Support Ticket Updates
  - Account Deactivation
  - Low Stock Alerts (Admin)
- ✅ **Reliability:** `safeQueueEmail` fallback (direct send if queue fails)
- ✅ **Templates:** Premium HTML templates with Handlebars
- ✅ **Preferences:** CAN-SPAM compliant unsubscribe
- ✅ **Email Logs:** Track all sent/failed emails
- ✅ **Retry Failed:** Admin can manually retry failed emails

### In-App Notifications
- ✅ **Smart Filtering:**
  - Admins: Critical business events (New Order, Low Stock, Milestones)
  - Users: Personal updates (Order Status, Security, Promos)
- ✅ **Real-time:** Server-Sent Events (SSE)
- ✅ **Milestone Tracking:** Admin alerts for achievements (100th order, ₵10k sales)
- ✅ **Management:** Mark read, delete, view all
- ✅ **Bulk Notification:** `POST /api/notifications/bulk` (Admin)

## Frontend Specifications

### Notification Center
- **Location:** Header Bell Icon
- **API:** `GET /api/notifications`, `POST /api/notifications/subscribe` (SSE)
- **Actions:**
  - Mark Read: `PATCH /api/notifications/:id/read`
  - Mark All Read: `POST /api/notifications/read-all`
  - Clear All: `DELETE /api/notifications/all`

### Back in Stock Alert
- **Trigger:** "Notify Me" button on out-of-stock product
- **API:** `POST /api/stock/notify`
- **Form:** Email input (pre-filled if authenticated)

### Admin Milestone Notifications
- **Types:** Order Count (10, 50, 100, 500, 1000), Daily Sales ($1k, $5k, $10k)
- **Delivery:** Push notification via SSE
- **Message:** "🎉 Milestone Reached! You've reached [X] orders!"
- **Link:** `/admin/analytics`
- **Reset:** Daily sales reset at midnight

### Email Preferences Page
- **Route:** `/account/email-preferences`
- **API:** `GET /api/unsubscribe/preferences`, `PUT /api/unsubscribe/preferences`
- **UI:**
  - Toggle Switches: Marketing, Abandoned Cart, Back-in-Stock
  - "Unsubscribe from All" link

### Public Unsubscribe Page
- **Route:** `/unsubscribe?email=...`
- **API:** `POST /api/unsubscribe`
- **UI:** Email input, Confirmation message, "Manage Preferences" link

---

# 7. 🏷️ Discount & Promotions

## Backend Capabilities

### Coupon System
- ✅ **Types:** Percentage-off, Fixed-amount
- ✅ **Validation:**
  - Expiry date check
  - Minimum purchase amount
  - Usage limits (Total & Per-customer)
  - Active status check
- ✅ **Application:** Applied to cart subtotal securely
- ✅ **API:** `POST /api/discounts/validate`, `POST /api/cart/coupon`

### Promotional Banners
- ✅ **Management:** Admin CRUD operations
- ✅ **Scheduling:** Auto-activation based on start/end dates
- ✅ **Priority:** Control display order
- ✅ **Broadcasting:** Notify all users on banner creation
- ✅ **Active Banners:** `GET /api/banners/active`

## Frontend Specifications

### Cart/Checkout Coupon Application
- **Input:** "Enter Coupon Code" field
- **API:** `POST /api/discounts/validate` then `POST /api/cart/coupon`
- **Feedback:**
  - Success: "Coupon Applied: - $10.00"
  - Error: "Invalid Code: Expired" / "Minimum purchase $50"

### Admin Discount Management
- **Route:** `/admin/discounts`
- **Features:**
  - List: Code, Type, Value, Usage, Status
  - Create/Edit: Code, Type (%), Value, Start/End Dates, Max Uses, Min Purchase
  - Delete: `DELETE /api/discounts/:id`

### Admin Banner Management
- **Route:** `/admin/banners`
- **Features:**
  - List: Title, Image, Priority, Active Status
  - Create/Edit: Title, Description, Image, Link URL, Start/End Dates, Priority, Notify Users toggle
  - Delete: `DELETE /api/admin/banners/:id`

---

# 8. 📊 Analytics & Dashboard

## Backend Capabilities

### Metrics
- ✅ **Real-time Stats:** Total Sales, Orders, Active Users, Low Stock Count
- ✅ **Sales Reports:** Daily/Weekly/Monthly revenue breakdown
- ✅ **Inventory Reports:** Low stock alerts, Out of stock items
- ✅ **User Growth:** Registration trends
- ✅ **Exports:** CSV for Orders, Products, Customers
- ✅ **Admin Activity:** Tracks who did what, when
- ✅ **Cart Abandonment Rate:** Abandoned carts / Total carts

### APIs
- ✅ `GET /api/admin/dashboard/summary`
- ✅ `GET /api/admin/dashboard/sales-trends`
- ✅ `GET /api/admin/dashboard/top-products`
- ✅ `GET /api/admin/dashboard/recent-orders`
- ✅ `GET /api/admin/dashboard/low-stock`
- ✅ `GET /api/admin/dashboard/admin-activity`
- ✅ `GET /api/admin/analytics/...`
- ✅ `GET /api/admin/reports/export?type=orders|products|customers`

## Frontend Specifications

### Admin Dashboard Overview
- **Route:** `/admin`
- **Widgets:**
  - Stats Cards: Total Revenue, Orders, Customers, Low Stock Alerts
  - Sales Trends: Line Chart (7/30/90 days filter)
  - Order Status: Pie Chart (Pending, Processing, Shipped, Delivered)
  - Top Products: Table (Name, Sales Count, Revenue)
  - Recent Orders: List (ID, Customer, Total, Status)
  - Inventory Health: Bar Chart (In Stock vs Low Stock vs Out of Stock)
  - Cart Abandonment: Stat (Abandonment Rate)

### Admin Analytics & Reports
- **Route:** `/admin/analytics`
- **Charts:**
  - Revenue by Category (Bar Chart)
  - Customer Growth (Line Chart)
  - Payment Methods (Pie Chart)
- **Export Tools:**
  - Export Orders: CSV Download
  - Export Products: CSV Download
  - Export Customers: CSV Download

### Admin Activity Log
- **Route:** `/admin/activity`
- **API:** `GET /api/admin/dashboard/admin-activity`
- **UI:** List (Admin Name, Action, Target, Timestamp)

---

# 9. 🖼️ Media Management

## Backend Capabilities

### Media Tracking & Security
- ✅ **Centralized Library:** `Media` model tracks all uploads
- ✅ **Upload Validation:**
  - Magic Bytes: Validates actual file signatures
  - Resolution Limits: 25MP max (ImageKit compatibility)
  - Duplicate Detection: SHA256 hashing
  - File Size: Max 5MB
  - Allowed Types: JPEG, PNG, WEBP, GIF, BMP
- ✅ **Entity Integration:** Links to Products, Categories, Reviews, Variants
- ✅ **Ownership Enforcement:** Users can only attach own images

### Lifecycle Management
- ✅ **Soft Delete:** "Trash" system for recovery
- ✅ **Hard Delete:** Permanent deletion
- ✅ **Usage Tracking:** Cannot delete media in use
- ✅ **Automated Cleanup:** Weekly cron removes orphaned files (> 7 days)
- ✅ **Audit Logging:** Tracks uploader, deleter, restorer

### Upload Methods
- ✅ **Single Upload:** `POST /api/upload?type=product`
- ✅ **Batch Upload:** `POST /api/upload/batch?type=product` (up to 10 files)
- ✅ **URL Upload:** `POST /api/upload/url`

## Frontend Specifications

### Admin Media Library
- **Route:** `/admin/media`
- **API:** `GET /api/admin/media?type=product&status=active&page=1`
- **UI:**
  - Grid View: Thumbnail, Filename, Type, Uploader, Date
  - Filters: Type (product/review/variant/category), Status (active/trashed)
  - Search: By filename
  - Select Mode: Checkboxes for batch operations
- **Actions:**
  - Single: Soft Delete, Download, Copy URL
  - Batch: Move to Trash (DELETE /api/admin/media/batch)

### Media Trash
- **Route:** `/admin/media/trash`
- **API:** `GET /api/admin/media/trash`
- **UI:** Same as gallery, shows trashed items with delete date
- **Actions:**
  - Single: Restore (`POST /api/admin/media/:id/restore`), Permanent Delete
  - Batch: Restore Selected, Delete Selected
  - Empty Trash: `DELETE /api/admin/media/trash/clear`
- **Confirmation:** Hard delete requires double confirmation

### Upload System
1. **Single File Upload:**
   - Drag & Drop zone
   - Preview thumbnail
   - Validations displayed
   - Duplicate detection warning
   
2. **Batch Upload:**
   - Upload up to 10 files
   - Progress bar per file
   - Partial success summary: "Uploaded 8/10 files. 2 failed."
   
3. **URL Upload:**
   - Form: imageUrl (text), type (dropdown)
   - Validation: No local IPs, no data URIs

---

# 10. 💱 Currency & Internationalization

## Backend Capabilities

### Currency System
- ✅ **Multi-Currency:**
  - Base: GHS (Ghana Cedis)
  - Supported: USD, EUR, GBP, NGN
- ✅ **Real-time Conversion:**
  - Fetches rates from Frankfurter API
  - Caches in DB (6-hour validity)
  - Fallback if API fails
- ✅ **Smart Caching:** Auto-refreshes stale rates
- ✅ **Cron Job:** Updates every 6 hours

### APIs
- ✅ `GET /api/currency/rates` - Get all rates
- ✅ `POST /api/currency/convert` - Convert amount

## Frontend Specifications

### Currency Switcher
- **Location:** Header
- **API:** `GET /api/currency/rates`
- **Storage:** Persist selected currency to localStorage
- **Dropdown:** USD, EUR, GBP, GHS, NGN
- **Price Display:** All prices shown in selected currency
- **Conversion:** Real-time conversion on currency change

---

# 11. 🎫 Support System

## Backend Capabilities

### Ticket Management
- ✅ **Create Ticket:** Subject, Priority (low/medium/high), Message
- ✅ **Reply to Ticket:** Supports user and admin replies
- ✅ **Status Workflow:** open → in_progress → resolved → closed
- ✅ **Auto-Reopen:** Replying to closed ticket reopens it
- ✅ **Email Notifications:** Ticket created, reply received
- ✅ **Admin View:** All tickets with filters

### APIs
- ✅ `GET /api/support` - List tickets (filtered by user or all for admin)
- ✅ `POST /api/support` - Create ticket
- ✅ `GET /api/support/:id` - Get ticket details
- ✅ `POST /api/support/:id/reply` - Add message
- ✅ `PATCH /api/support/:id` - Update status (admin only)

## Frontend Specifications

### User Support Portal
- **Route:** `/account/support`
- **API:** `GET /api/support`
- **Actions:**
  - "New Ticket" → Modal (Subject, Priority, Message)
  - Click Ticket → Go to Details

### User Ticket Details
- **Route:** `/account/support/:id`
- **API:** `GET /api/support/:id`
- **UI:** Chat-like interface (messages in chronological order)
- **Actions:**
  - Reply → `POST /api/support/:id/reply`
  - Status Badge (Open/Closed)
  - Edge Case: Replying to closed ticket shows hint "This will reopen the ticket"

### Admin Support Management
- **Route:** `/admin/support`
- **API:** `GET /api/support` (all tickets)
- **Features:**
  - List: Filter by Status, Priority
  - Details: Same as user view + Update status dropdown

---

# 12. ⭐ Reviews & Ratings

## Backend Capabilities

### Review System
- ✅ **Create Review:** Rating (1-5), Title, Content, Images
- ✅ **Moderation:** Admin approve/reject workflow
- ✅ **Status:** pending → approved/rejected
- ✅ **Helpful Votes:** Users can mark reviews as helpful
- ✅ **Product Rating:** Auto-calculated average from approved reviews
- ✅ **Image Uploads:** Up to 5 images per review (ImageKit)
- ✅ **Ownership:** Users can only review purchased products

### APIs
- ✅ `GET /api/reviews/product/:id` - Public reviews for product
- ✅ `POST /api/reviews` - Create review
- ✅ `POST /api/reviews/:id/helpful` - Mark as helpful
- ✅ `GET /api/reviews/admin/all` - All reviews (admin)
- ✅ `PATCH /api/reviews/:id/approve` - Approve review (admin)
- ✅ `PATCH /api/reviews/:id` - Update review (admin)
- ✅ `DELETE /api/reviews/:id` - Delete review (admin)

## Frontend Specifications

### Write Review Modal
- **Trigger:** "Write a Review" button (Product Page or Order History)
- **API:** `POST /api/reviews`
- **Fields:**
  - Rating (1-5 stars, required)
  - Title (min 3 chars)
  - Content (min 10 chars)
  - Images (File upload, max 5)
- **Validation:** Title > 3 chars, Content > 10 chars

### Review List Component
- **API:** `GET /api/reviews/product/:id`
- **UI:** User Avatar, Name, Rating, Date, Content, Images
- **Actions:**
  - "Helpful" button → `POST /api/reviews/:id/helpful`
  - Pagination if > 10 reviews

### Admin Review Moderation
- **Route:** `/admin/reviews`
- **API:** `GET /api/reviews/admin/all`
- **Features:**
  - List: Filter by Status (Pending, Approved, Rejected)
  - Actions: Approve, Reject, Delete, Edit content

---

# 13. 🛠️ Admin Capabilities
*Regular admin users have access to ALL these features*

## 1. Dashboard Overview
- **Route:** `/admin`
- **Widgets:** Stats Cards, Sales Trends, Order Status, Top Products, Recent Orders, Inventory Health, Cart Abandonment

## 2. Analytics & Reports
- **Route:** `/admin/analytics`
- **Features:** Revenue by Category, Customer Growth, Payment Methods, CSV Exports

## 3. Product Management
- **Route:** `/admin/products`
- **Features:** List, CRUD, Bulk Upload, Duplicate
- **Add/Edit:** Basic Info, Pricing, Inventory, Variants (Bulk Update), Media, SEO

## 4. Variant Management
- **Bulk Update:** `PATCH /api/variants/bulk`
- **Individual:** Create, Update, Delete

## 5. Category Management
- **Route:** `/admin/categories`
- **Features:** CRUD, Image upload, Active/Inactive toggle

## 6. Order Management
- **Route:** `/admin/orders`
- **Features:**
  - List, Filter, Search
  - Kanban Board (Drag & Drop)
  - Bulk Status Update
  - Export CSV
  - Order Details (Update status, Refund, Tracking)
  - Webhook Logs

## 7. Review Moderation
- **Route:** `/admin/reviews`
- **Features:** Filter by Status, Approve, Reject, Delete, Edit

## 8. User Management
- **Route:** `/admin/users`
- **Features:** List, Search, View Details (Lifetime Value, Order History), Ban/Unban

## 9. Media Library
- **Route:** `/admin/media`
- **Features:** Gallery, Upload (Single/Batch/URL), Trash, Restore, Usage Tracking

## 10. Banner Management
- **Route:** `/admin/banners`
- **Features:** CRUD, Schedule, Priority, Notify Users toggle

## 11. Discount Management
- **Route:** `/admin/discounts`
- **Features:** Create codes, Set type, Expiry, Limits

## 12. Support Ticket Management
- **Route:** `/admin/support`
- **Features:** View all tickets, Filter, Reply, Update status

## 13. Email Management
- **Route:** `/admin/emails`
- **Features:**
  - Email Logs: View sent/failed with filters
  - Email Stats: Send rates, Queue status
  - Retry Failed: Manually retry

## 14. Admin Activity Log
- **Route:** `/admin/activity`
- **Features:** View all admin actions (who, what, when)

## 15. Low Stock Alerts
- **Route:** `/admin/inventory`
- **Features:** View products with stock ≤ 5, Quick restock

## 16. Communications
- **Route:** `/admin/communications`
- **Features:** Bulk Notification (Target users, Type, Title, Message, Link)

---

# 14. 👑 Super Admin Capabilities
*Exclusive backdoor features - Regular admins DO NOT have access*

## 1. System Logs & Health Monitoring
- **Route:** `/super-admin/logs`
- **Features:**
  - View Logs (app.log, error.log - last 50KB)
  - System Health (`GET /api/super-admin/health`) - Database, API uptime, Memory

## 2. Force Password Reset
- **Route:** `/super-admin/users`
- **API:** `POST /api/super-admin/users/reset-password`
- **Use Case:** Emergency reset when user locked out

## 3. Force User Logout/Deactivation
- **API:** `POST /api/super-admin/users/force-logout`
- **Behavior:** Sets `isActive: false`, forcing logout on next request

## 4. System Settings Management
- **Route:** `/super-admin/settings`
- **Features:**
  - Maintenance Mode toggle
  - Payment Gateway toggle
  - Critical system configs

## 5. IP Blocking & Security
- **Route:** `/super-admin/security`
- **Features:** Block/Unblock IP, View Blocked IPs

## 6. Developer Tools
- **Route:** `/super-admin/tools`
- **Features:**
  - Trigger Background Jobs: `POST /api/super-admin/jobs`
  - Force Verify Payment: `POST /api/super-admin/payment/force-verify`

## 7. System Stats (Server-Level)
- **Route:** `/super-admin/stats`
- **Features:** Total Users/Orders/Products, Node Env, Memory Usage

## 8. Queue Status Monitoring
- **Route:** `/super-admin/queues`
- **Features:** Real-time queue monitoring (Email, Notifications)

## 9. Environment Variables Viewer
- **Route:** `/super-admin/env`
- **Features:** View safe env vars (NODE_ENV, PORT, FRONTEND_URL)
- **Security:** Sensitive vars NOT exposed

---

# 15. 🤖 Automated Jobs (Cron)

## 1. Order Auto-Cancellation
- **Schedule:** Every hour
- **Logic:** Cancels orders with `status=pending` and `paymentStatus=pending` older than 30 minutes
- **Impact:** Notification + Email sent, Stock restocked

## 2. Payment Verification
- **Schedule:** Every 10 mins
- **Logic:** Recovers "stuck" pending orders by verifying with Paystack

## 3. Abandoned Cart Recovery
- **Schedule:** Daily
- **Logic:** Emails users with abandoned carts > 24h

## 4. Low Stock Alerts
- **Schedule:** Daily at 9 AM
- **Logic:** Emails admin about variants with stock ≤ 5

## 5. Currency Rate Updates
- **Schedule:** Every 6 hours
- **Logic:** Fetches latest rates from Frankfurter API

## 6. Analytics Aggregation
- **Schedule:** Nightly
- **Logic:** Aggregates daily sales, revenue, customer metrics

## 7. Session & Token Cleanup
- **Schedule:** Daily at midnight
- **Logic:**
  - Deletes expired email verification tokens
  - Deletes expired password reset tokens
  - Clears blacklisted JWT tokens past expiry
  - Cleans old guest cart sessions (> 30 days)

## 8. Notification Cleanup
- **Schedule:** Weekly
- **Logic:** Deletes read notifications older than 30 days

## 9. Orphaned Media Cleanup
- **Schedule:** Weekly
- **Logic:** Hard deletes media in `deleted` status or trashed > 30 days

## 10. Milestone Reset
- **Schedule:** Daily at midnight
- **Logic:** Resets daily sales milestone counters

## 11. Database Backup
- **Schedule:** Daily
- **Logic:** Automated backup routine

---

# 16. 📱 Frontend Specifications

## Global Elements

### Header (Navigation Bar)
- **States:** Guest vs Logged In
- **Components:**
  - Logo (Link to Home)
  - Search Bar (Live search, redirects to `/search?q=...`)
  - Navigation Links (Shop, Categories, About, Contact)
  - Currency Switcher (Dropdown: USD, EUR, GBP, GHS, NGN)
  - Cart Icon (Badge with count, opens Cart Drawer)
  - Notification Bell (Badge with unread count, opens Notification Dropdown)
  - User Menu:
    - Guest: Login/Register buttons
    - User: Avatar + Name, Dropdown (Dashboard, Orders, Wishlist, Support, Logout)
    - Admin: Adds "Admin Panel" link

### Footer
- **Links:** Shop, About Us, Contact, FAQ, Terms, Privacy, Returns
- **Social Media:** Instagram, Facebook, Twitter icons
- **Newsletter:** Email input → "Thanks for subscribing!" (Placeholder)
- **Copyright:** "© 2024 WigHaven. All rights reserved."

### Global Interactions
- **Toast Notifications:** Success/Error/Info (Top-Right)
- **Loading States:** NProgress bar for route transitions
- **Scroll to Top:** Button appears after scrolling 300px

## User Profile Module

### Dashboard Overview
- **Route:** `/account`
- **UI:** Welcome card, Quick stats (Total Orders, Wishlist Count), Quick links

### Edit Profile Page
- **Route:** `/account/profile`
- **Fields:** firstName, lastName, phone
- **Actions:** Change Password, Deactivate Account

### Address Book Page
- **Route:** `/account/addresses`
- **Actions:** Add, Edit, Delete, Set as Default

---

# 17. 🔗 API Documentation

## Base URL
- **Development:** `http://localhost:5000/api`
- **Production:** `https://api.wighaven.com/api` *(example)*

## Authentication
- **Access Token:** Include in `Authorization: Bearer <token>` header
- **Refresh Token:** Include in request body for `/api/auth/refresh`

## Standard Response Format
```json
{
  "success": true|false,
  "data": {...} | [...],
  "error": {
    "message": "Error description",
    "type": "validation|authentication|authorization|not_found|server",
    "fields": [{"field": "email", "message": "Invalid email"}]
  },
  "meta": {
    "page": 1,
    "pages": 10,
    "total": 100
  }
}
```

## Rate Limits
- **Login:** 5 attempts / 15 minutes
- **Registration:** 10 attempts / hour
- **Global API:** 100 requests / 15 minutes
- **Super Admin:** No limits

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (Duplicate)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

---

# 18. ⚠️ Error Handling & Edge Cases

## API Error Responses
- **Standard Format:** `{ success: false, error: { message, type, fields } }`
- **Validation Errors (400):** Map to form inputs, display inline
- **Auth Errors (401):** Auto-refresh token, redirect to login if fails
- **Network Errors:** Show "Connection Lost" toast, retry GET requests 3 times

## Cart & Checkout Edge Cases
- **Stock Changes:** Validate cart before checkout, auto-adjust quantities
- **Coupon Auto-Removal:** Remove invalid coupons automatically
- **Item/Qty Limits:** Max 100 items, max 999 per item

## Payment Edge Cases
- **Failed Transactions:** Show retry button
- **Abandoned Payments:** Order auto-cancelled after 30 mins
- **Verification Delays:** Poll for 30s max, then show "Check your account"

## Image Upload Edge Cases
- **File Too Large:** Show error before upload
- **Invalid Format:** Validate MIME type + file signature
- **Upload Failures:** Show which files failed in batch uploads

## Empty States
- **Empty Cart:** "Your cart is empty" + "Continue Shopping" button
- **No Orders:** "You haven't placed any orders yet"
- **No Wishlist:** "Your wishlist is empty"

## Product Management Edge Cases
- **Bulk Upload:** Show detailed error report for failed rows
- **Variant Uniqueness:** Check attributes before saving
- **Cannot Delete Last Variant:** Disable delete button
- **Product Duplication:** Copy all data except SKU (auto-generate new)

## Search & Pagination
- **No Results:** "No products found" + suggest clearingfilters
- **Large Result Sets:** Lazy load images as user scrolls

## Support System Edge Cases
- **Closed Ticket Reply:** Reopens ticket automatically + show warning
- **Ticket Priority:** Admin can update, user cannot

---

# 19. 🏗️ Infrastructure

## Technology Stack

### Backend
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Queue:** pg-boss
- **Email:** Nodemailer
- **Templates:** Handlebars
- **Logging:** Winston (file rotation)
- **Security:** bcryptjs, Helmet, CORS, Joi
- **Payments:** Paystack SDK
- **Media:** ImageKit SDK

### Frontend *(Recommended)*
- **Framework:** React.js or Next.js
- **Styling:** Vanilla CSS (Dark Mode, Glassmorphism)
- **State Management:** Redux or Context API
- **HTTP Client:** Axios
- **Notifications:** Server-Sent Events (SSE)

## Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/wighaven

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://wighaven.com

# Authentication
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx

# ImageKit
IMAGEKIT_PUBLIC_KEY=public_xxx
IMAGEKIT_PRIVATE_KEY=private_xxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/xxx

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@wighaven.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@wighaven.com

# Super Admin
SUPER_ADMIN_WHITELIST=192.168.1.1,10.0.0.1
SUPER_ADMIN_EMAIL=superadmin@wighaven.com
SUPER_ADMIN_SECRET=your-super-secret
```

## Server Requirements

### Minimum Specifications (Development/Testing)
```
CPU: 1 Core (2.0 GHz)
RAM: 1GB
Storage: 10GB SSD
Bandwidth: 1TB/month
```

### Recommended Specifications (Production)
```
CPU: 2 Cores (2.4 GHz+)
RAM: 2GB (4GB for high traffic)
Storage: 20GB SSD
Bandwidth: 2TB/month
Database: Separate instance (512MB+ dedicated RAM)
```

### Resource Usage Analysis
**Architecture:** Node.js VPS + Neon DB (External) + ImageKit Media (External)

**Memory Breakdown (VPS Only - Production Load):**
- Node.js Application: ~100-150MB
- pg-boss Queue System: ~50-100MB
- Prisma ORM Overhead: ~30-50MB (lightweight with external DB)
- Concurrent Requests (50 users): ~150-200MB
- Cron Jobs (11 tasks): ~50-100MB (spike)
- ImageKit/Paystack SDKs: ~20MB

**Total VPS RAM Required:** 400-620MB under moderate load

> ✅ **With Neon + ImageKit:** 512MB RAM is now VIABLE for low-moderate traffic  
> ✅ **Recommended:** 1GB RAM for production stability  
> 🚀 **Optimal:** 2GB RAM for growth and traffic spikes

**What's Offloaded:**
- ❌ **No PostgreSQL on VPS** (Neon handles this - saves ~200-350MB)
- ❌ **No Media Storage on VPS** (ImageKit handles this - saves storage)
- ✓ **VPS only runs:** Node.js app + pg-boss queue + cron jobs

### Traffic Capacity Estimates (with Neon + ImageKit)

**512MB RAM Server:**
- ~30-80 concurrent users
- ~300-800 orders/day
- Suitable for: **Launch, Low-Moderate Traffic** ✅
- **Risk:** May struggle during traffic spikes, tight on memory

**1GB RAM Server:**
- ~100-200 concurrent users
- ~1000-3000 orders/day
- Suitable for: **Production, Stable Growth** ✅ RECOMMENDED

**2GB RAM Server:**
- ~300-500 concurrent users
- ~5000-10,000 orders/day
- Suitable for: **High Traffic, Scaling Business** 🚀

### ✅ UPDATED: 512MB RAM Assessment
**With Neon (External DB) + ImageKit (External Media):**
- ✅ **Viable for launch** with low-moderate traffic
- ✅ VPS only runs Node.js app (no DB overhead)
- ⚠️ **Risk Factors:**
  - Traffic spikes may cause slowdowns
  - Limited headroom for growth
  - Cron jobs may compete for resources during peak hours
- ✅ **Mitigation:** Monitor memory usage, upgrade to 1GB if usage > 80%

**Verdict:** 512MB can work, but 1GB is safer for production

**Minimum Viable:** 512MB with Neon + ImageKit (low traffic only)  
**Production Recommended:** 1GB RAM (stability + growth headroom)  
**Optimal:** 2GB RAM (handles spikes + scaling)

### Recommended Hosting Providers

**Budget Options (< $10/month):**
- **DigitalOcean Droplet** - 1GB: $6/mo, 2GB: $12/mo
- **Linode Nanode** - 1GB: $5/mo
- **Vultr Cloud Compute** - 1GB: $6/mo
- **Hetzner Cloud** - 2GB: €4.51/mo (~$5)

**Managed PaaS (Auto-Scaling):**
- **Railway.app** - Pay per usage, auto-scaling
- **Render.com** - 512MB free tier (dev only), $7/mo for 512MB, $25/mo for 2GB
- **Fly.io** - Pay per usage, global edge network
- **Heroku** - From $7/mo (512MB), $25/mo (2GB)

**Database Hosting (Separate):**
- **Neon** ⭐ **RECOMMENDED** - Serverless PostgreSQL, Free tier: 512MB storage, Paid from $19/mo
- **Supabase** - Free 500MB PostgreSQL + Auth/Storage, Paid from $25/mo
- **Railway PostgreSQL** - Integrated with app hosting
- **ElephantSQL** - Free 20MB, Paid from $5/mo

### Scaling Recommendations (Neon + ImageKit Architecture)
1. **Phase 1 (Launch):** 512MB-1GB VPS + Neon Free Tier + ImageKit
   - **Cost:** ~$5-7/month (VPS only, DB & media free)
   - **Capacity:** 300-800 orders/day
   
2. **Phase 2 (Growth):** 1GB-2GB VPS + Neon Paid ($19/mo) + ImageKit
   - **Cost:** ~$25-35/month
   - **Capacity:** 1000-3000 orders/day
   
3. **Phase 3 (Scale):** 2GB+ VPS or PaaS with auto-scaling + Neon Scale ($69/mo)
   - **Cost:** ~$80-120/month
   - **Capacity:** 5000+ orders/day

### Neon-Specific Optimizations
- **Connection Pooling:** Prisma already configured (10 connections default)
- **Branching:** Use Neon branches for staging/testing environments
- **Autoscaling:** Neon automatically scales compute based on load
- **Monitoring:** Enable Neon query analytics to identify slow queries
- **Backup:** Neon handles automated backups (point-in-time recovery)

### ImageKit Optimizations
- **Transformation URL Patterns:** Pre-define common sizes (thumbnail, card, detail)
- **Cache Management:** Purge cache after product updates
- **Usage Limits:** Monitor bandwidth (20GB free, then $0.01/GB)
- **Media Versioning:** Use folder structure for organized assets

### Performance Optimization Tips
- **Enable gzip compression** (Already configured via `compression` middleware)
- **Use CDN** for static assets (ImageKit handles this)
- **Database connection pooling** (Prisma default: 10 connections)
- **Implement Redis caching** for frequently accessed data (future enhancement)
- **Enable HTTP/2** on reverse proxy (Nginx/Caddy)

## Deployment Checklist
- [ ] **Server provisioned** with minimum 1GB RAM (2GB+ for production)
- [ ] Environment variables configured
- [ ] Database migrated (`npx prisma migrate deploy`)
- [ ] SSL certificate installed (Let's Encrypt recommended)
- [ ] CORS origins whitelisted (production domain)
- [ ] Rate limits configured and tested
- [ ] Super Admin IP whitelist set
- [ ] Cron jobs scheduled (verify with `crontab -l` or using node-cron)
- [ ] Backup system configured (daily automated backups)
- [ ] Error logging enabled (Winston file rotation working)
- [ ] Health check endpoint tested (`GET /api/health`)
- [ ] **Load testing completed** (minimum 50 concurrent users)
- [ ] **Memory monitoring** set up (PM2, New Relic, or Datadog)
- [ ] **Database indexes** optimized for common queries
- [ ] **ImageKit account** configured and tested
- [ ] **Paystack production keys** configured and verified

### Production Launch Checklist
- [ ] Database backed up
- [ ] Environment set to `NODE_ENV=production`
- [ ] Secrets rotated (JWT_SECRET, SUPER_ADMIN_SECRET)
- [ ] Admin accounts created
- [ ] Test orders placed and verified
- [ ] Email delivery tested (all 20+ templates)
- [ ] Payment flow tested end-to-end
- [ ] Webhook endpoints verified with Paystack
- [ ] Cron jobs verified running (check logs)
- [ ] Monitoring alerts configured
- [ ] Backup restoration tested
- [ ] Rollback plan documented

---

# 🎉 Conclusion

This document represents the **complete, exhaustive technical specification** for the WigHaven E-Commerce Platform. It covers:

✅ **12 Core Modules** with full backend and frontend specifications  
✅ **16 Admin Capabilities** comprehensively documented  
✅ **9 Super Admin Exclusives** properly separated  
✅ **11 Automated Jobs** ensuring system reliability  
✅ **100+ API Endpoints** documented  
✅ **50+ Frontend Pages** specified in detail  
✅ **Security, Error Handling, Edge Cases** thoroughly covered

**Status:** ✅ **PRODUCTION READY**

---

*Document Version: 2.0*  
*Last Updated: 2025-11-30*  
*Maintained By: WigHaven Development Team*