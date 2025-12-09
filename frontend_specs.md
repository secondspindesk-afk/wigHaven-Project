# WigHaven - Complete Frontend Specification
**Version:** 3.1 | **Last Updated:** 2025-11-30

> **Note:** For design tokens (colors, spacing, typography), see `design_system.md`

---

# Table of Contents
1. [Global Elements](#global-elements)
2. [Public Pages](#public-pages)
3. [Authentication](#authentication)
4. [User Account](#user-account)
5. [Admin Dashboard](#admin-dashboard)
6. [Super Admin](#super-admin)
7. [Shared Components](#shared-components)
8. [State Management](#state-management)
9. [API Integration](#api-integration)
10. [Error Handling](#error-handling)
11. [Accessibility](#accessibility)

---

# 1. Global Elements

## Header (Navigation Bar)
**States:** Guest | Logged In User | Admin

**Components:**
- Logo (links to `/`)
- Search Bar → redirects to `/search?q=...`
- Currency Switcher (USD, EUR, GBP, GHS, NGN) - persists to localStorage
- Cart Icon (badge shows count) → opens Cart Drawer
- Notification Bell (badge shows unread count) → opens Notification Dropdown
- User Menu:
  - Guest: Login/Register buttons
  - User: Avatar, dropdown (Dashboard, Orders, Wishlist, Support, Logout)
  - Admin: adds "Admin Panel" link

**Behavior:**
- Sticky header on scroll
- Search: Live debounced search (300ms delay)
- Cart badge updates on add/remove
- Notification bell uses SSE for real-time updates

## Footer
**Links:** Shop, About Us, Contact, FAQ, Terms, Privacy, Returns  
**Social:** Instagram, Facebook, Twitter icons  
**Newsletter:** Email input (static, placeholder only)

## Global Interactions
- **Toast Notifications:** Top-right, auto-dismiss 5s
- **Loading:** NProgress bar for route transitions
- **Scroll to Top:** Button after 300px scroll

---

# 2. Public Pages

## 2.1 Home Page (`/`)

**APIs:**
- `GET /api/categories?isActive=true` - Featured categories
- `GET /api/products?sort=newest&limit=10` - New arrivals
- `GET /api/products?sort=popularity&limit=10` - Best sellers
- `GET /api/banners/active` - Hero banners

**Sections:**
1. **Hero Slider**
   - Auto-scroll every 5 seconds, pause on hover
   - Swipe gestures on mobile
   - Click banner → navigate to banner.linkUrl

2. **Featured Categories Grid**
   - 4 columns (desktop) → 2 (tablet) → 1 (mobile)
   - Click → `/shop?category={id}`

3. **New Arrivals Carousel**
   - Horizontal scroll, 4 visible (desktop) → 2 (tablet) → 1 (mobile)
   - Product Card: Image, Name, Price, Rating, "Add to Cart", Wishlist icon

4. **Best Sellers Grid**
   - Same as Featured Categories Grid

**Product Card Interactions:**
- Click image/name → Product details
- Click heart → Toggle wishlist (optimistic update)
- Click "Add to Cart" → Add to cart, show toast, update badge

---

## 2.2 Shop Page (`/shop`)

**API:** `GET /api/products?page={}&category={}&minPrice={}&maxPrice={}&sort={}&inStock={}`

**Layout:** Filter Sidebar (sticky) + Product Grid + Pagination

**Filters:**
- Categories (checkboxes, multi-select)
- Price Range (min/max inputs)
- In Stock Only (checkbox)
- Sort (dropdown: newest, popularity, price_asc, price_desc)

**Behavior:**
- Filters update URL query params
- "Apply Filters" button (not real-time)
- Mobile: Filters in bottom drawer

**Product Grid:**
- 4 columns → 3 → 2 → 1 (responsive)
- Show 20 products per page

**Pagination:**
- Show max 7 page numbers
- Pattern: `1 ... 4 5 6 ... 10` (current in center)
- Scroll to top on page change

**Loading States:**
- Initial: Skeleton grid
- Filter change: Overlay skeleton
- Min duration: 300ms (avoid flash)

**Empty State:**
- "No products found"
- "Try adjusting your filters"
- "Clear Filters" button

---

## 2.3 Product Details Page (`/product/:id`)

**API:** `GET /api/products/:id`

**Sections:**

### Image Gallery
- Main image (zoomable, click for lightbox)
- Thumbnails (4-6 images)
- Lightbox: arrow keys, swipe, ESC to close

### Product Info
- Breadcrumb navigation
- Product name (H1)
- Rating (stars + count) + "Write a Review" link
- Price (updates with variant selection)
- Stock status:
  - In Stock (> 5 units)
  - "Only X left!" (1-5 units)
  - Out of Stock (0 units)

### Variant Selector
- Size (buttons), Color (color swatches), Length (dropdown), Texture (dropdown)
- Selected variant updates price and stock automatically
- Variant match logic: Find variant where all attributes match selection

### Quantity Selector
- +/- buttons
- Min: 1, Max: selectedVariant.stock
- Manual input validates against stock

### Actions
- **Add to Cart** (if in stock)
  - Click → API `POST /api/cart` with {variantId, quantity}
  - Loading spinner on button
  - Success: Toast "Added to cart!", update badge
  - Error: Toast with error message
  
- **Notify When Available** (if out of stock)
  - Click → Open modal with email input
  - API: `POST /api/stock/notify` with {variantId, email}
  - Success: Button shows "You'll be notified" (disabled)

- **Wishlist** (heart icon)
  - API: `POST /api/wishlist/{productId}` (toggle)
  - Optimistic UI update

### Tabs
1. **Description** - Product description (HTML content)
2. **Reviews** - Review list + "Write Review" button
3. **Shipping Info** - Static content

### Reviews Tab
**Components:**
- Rating Summary (average, star breakdown)
- "Write a Review" button (opens modal)
- Reviews List (paginated, 10 per page)

**Write Review Modal:**
- Star rating (1-5, required)
- Title (min 3 chars, required)
- Content (min 10 chars, required)
- Images (max 5, 5MB each, optional)
- API: `POST /api/reviews` with multipart/form-data
- Validation: Show inline errors

**Review List:**
- User avatar, name, date, rating, title, content, images
- "Helpful" button → `POST /api/reviews/:id/helpful`
- Load More button for pagination

### Related Products
- Horizontal carousel
- API: `GET /api/products?category={categoryId}&limit=6` (exclude current product)

---

## 2.4 Search Results Page (`/search?q=...`)

**API:** `GET /api/products/search?q={query}&page={}`

**UI:** Same as Shop Page (grid + filters + pagination)

**Behavior:**
- Search term pre-filled in header search bar
- Show "Showing results for '{query}'"
- All shop filters available

---

## 2.5 Cart Page (`/cart` or Drawer)

**API:** `GET /api/cart`

**Components:**
- Cart Items List
  - Product image, name, variant details
  - Quantity selector (updates via `PATCH /api/cart/item/:id`)
  - Remove button (`DELETE /api/cart/item/:id`)
  - Price (quantity × unit price)
  
- Coupon Input
  - Input field + "Apply" button
  - API: `POST /api/cart/coupon` with {code}
  - Success: Show discount amount
  - Error: Show error message ("Expired", "Invalid", "Min purchase $50")
  
- Order Summary
  - Subtotal, Discount, Tax (calculated), Shipping (TBD or Free), **Total**

- Actions
  - "Continue Shopping" → close/redirect
  - "Checkout" → `/checkout`

**Behavior:**
- Stock Validation: Before Add to Cart, check stock availability
- If stock changes: Toast "Stock updated", auto-adjust quantity
- Cart badge real-time sync
- Persist cart for logged-in users (DB), guests (session cookie)

**Empty State:**
- "Your cart is empty"
- "Continue Shopping" button

---

## 2.6 Checkout Page (`/checkout`)

**Steps:**

### Step 1: Shipping Address
**Logged In:**
- Show saved addresses (radio select)
- "Add New Address" button → opens modal

**Guest:**
- Form: Name, Email, Phone, Street, City, State, Zip, Country

**Address Modal:**
- Same fields as guest form
- "Set as Default" checkbox
- API: `POST /api/addresses` (create) or `PUT /api/addresses/:id` (update)

### Step 2: Order Review
- Cart items (readonly)
- Shipping address (with edit link)
- Coupon code (can remove)
- Order Summary (Subtotal, Discount, Tax, Shipping, Total)

### Step 3: Payment
- **Pre-submit validation:** `GET /api/cart/validate`
  - Checks stock availability
  - If fails: Toast error, redirect to cart
  
- **Submit:** `POST /api/orders`
  - Request: {addressId, items, couponCode}
  - Response: {orderNumber, paystackAuthUrl}
  - Redirect to Paystack hosted page

**Behavior:**
- All steps in one page (accordion style) or multi-step wizard
- Can't proceed to next step without completing current
- Back button goes to previous step

---

## 2.7 Order Confirmation Page (`/order-confirmation?reference=...`)

**API:** `GET /api/orders/verify?reference={reference}`

**States:**

### Loading
- "Processing payment..."
- Poll API every 3 seconds, max 30 seconds
- Show spinner

### Success
- ✅ "Order Placed Successfully!"
- Order Number, Total, Estimated Delivery
- "View Order Details" button → `/account/orders/:id`
- "Continue Shopping" button → `/shop`

### Failed
- ❌ "Payment Failed"
- Error message from API
- "Try Again" button → `/checkout`
- "Contact Support" link

**Edge Cases:**
- If polling times out: "Payment processing, check your account page in a few minutes"
- If reference invalid: "Order not found"

---

# 3. Authentication

## 3.1 Registration Page (`/register`)

**API:** `POST /api/auth/register`

**Form Fields:**
- firstName (required, min 2 chars)
- lastName (required, min 2 chars)
- email (required, email format)
- phone (optional, phone format)
- password (required, min 8 chars)

**Validation:**
- Email: Format + uniqueness check
- Password: Min 8 chars, show strength meter (weak/medium/strong)
- Real-time validation on blur

**Behavior:**
- On success:
  - Auto-login (store tokens)
  - Merge guest cart if exists
  - Redirect to `/verify-email`
- On error:
  - 409 "Email already exists" → Show inline error
  - 400 Validation errors → Show inline errors

**Links:**
- "Already have an account? Login"

---

## 3.2 Login Page (`/login`)

**API:** `POST /api/auth/login`

**Form Fields:**
- email (required)
- password (required)
- "Remember me" (checkbox, extends refresh token expiry)

**Validation:**
- Required fields only

**Behavior:**
- On success:
  - Store access/refresh tokens (localStorage or httpOnly cookie)
  - Merge guest cart
  - Redirect to previous page or `/account`
- On error:
  - 401 "Invalid credentials" → Show general error (security)
  - 401 "Account deactivated" → Show modal with support link
  - 429 "Too many attempts" → Show error, suggest password reset

**Links:**
- "Forgot password?"
- "Don't have an account? Register"

---

## 3.3 Forgot Password Page (`/forgot-password`)

**API:** `POST /api/auth/password-reset/request`

**Form:**
- email (required)

**Behavior:**
- Always show success message (prevent email enumeration)
- "Check your email for reset link"
- Link redirects to `/reset-password?token={token}&email={email}`

---

## 3.4 Reset Password Page (`/reset-password?token=...&email=...`)

**API:** `POST /api/auth/password-reset/confirm`

**Form Fields:**
- newPassword (required, min 8 chars)
- confirmPassword (required, must match)

**Validation:**
- Password match check
- Strength meter

**Behavior:**
- On success: "Password reset!", redirect to `/login`
- On error:
  - 400 "Invalid or expired token" → Show error, link to forgot password
  - 400 Validation errors → Inline errors

---

## 3.5 Email Verification Page (`/verify-email?token=...`)

**API:** `POST /api/auth/verify-email` (auto-trigger on page load)

**States:**
- Loading: "Verifying your email..."
- Success: "Email verified! Redirecting..." → auto-redirect to `/account` after 2s
- Error: "Invalid or expired token" + "Resend Verification" button

**Resend Verification:**
- API: `POST /api/auth/resend-verification`
- Success toast: "Verification email sent!"

---

# 4. User Account

## 4.1 Account Dashboard (`/account`)

**APIs:**
- `GET /api/auth/me` - User info
- `GET /api/orders?limit=5` - Recent orders

**Components:**
- Welcome Card: "Hello, {firstName}"
- Quick Stats: Total Orders, Wishlist Count
- Quick Links: Edit Profile, Address Book, Orders, Wishlist, Support
- Recent Orders: Last 5 orders with status

---

## 4.2 Edit Profile (`/account/profile`)

**API:** `GET /api/profile`, `PUT /api/profile`

**Form Fields:**
- firstName, lastName, phone (all editable)
- email (readonly, show "Change email" link if needed)

**Change Password Section:**
- Toggle visibility with button
- Fields: currentPassword, newPassword, confirmPassword
- API: `PUT /api/profile/password`
- Validation: Current password correct, new password min 8 chars, passwords match

**Deactivate Account:**
- "Deactivate Account" button (danger zone)
- Opens confirmation modal
- Modal: "This is permanent. Are you sure?"
- Reason textarea (required, min 10 chars)
- API: `DELETE /api/profile` with {reason}
- On success: Logout, redirect to `/` with toast "Account deactivated"

---

## 4.3 Address Book (`/account/addresses`)

**API:** `GET /api/addresses`

**UI:**
- Grid of address cards
- Each card: Name, Address, Phone, "Default" badge
- Actions: Edit, Delete, Set as Default

**Add/Edit Address Modal:**
- Fields: name, street, city, state, zipCode, country, phone, isDefault
- API: `POST /api/addresses` (create), `PUT /api/addresses/:id` (update)
- Validation: All fields required except isDefault

**Delete:**
- Confirmation modal
- API: `DELETE /api/addresses/:id`
- Cannot delete if it's the only address

**Set as Default:**
- API: `PATCH /api/addresses/:id` with {isDefault: true}
- Auto-un-defaults previous default

---

## 4.4 Order History (`/account/orders`)

**API:** `GET /api/orders?page={}&status={}`

**UI:**
- List view: Order #, Date, Total, Status (badge)
- Filter dropdown: All, Pending, Processing, Shipped, Delivered, Cancelled
- Pagination
- Click order → Order Details page

---

## 4.5 Order Details (`/account/orders/:id`)

**API:** `GET /api/orders/:id`

**Sections:**
- **Order Info:** Order #, Date, Status, Payment Status
- **Items:** Product image, name, variant, qty, price
- **Shipping Address**
- **Summary:** Subtotal, Discount, Tax, Shipping, Total
- **Timeline:** Visual progress (Placed → Paid → Processing → Shipped → Delivered)

**Actions:**
- **Download Invoice:** `GET /api/orders/:id/invoice.pdf`
- **Cancel Order:** (if status = pending or paid)
  - Confirmation modal
  - API: `POST /api/orders/:id/cancel`
  - Success: Status updates to "Cancelled", stock restocked
- **Write Review:** (if status = delivered)
  - For each product → opens review modal with productId

---

## 4.6 Wishlist (`/account/wishlist`)

**API:** `GET /api/wishlist`

**UI:**
- Grid of products (same as shop grid)
- Actions per product:
  - "Move to Cart" → API `POST /api/cart`, then `DELETE /api/wishlist/:productId`
  - Remove → `DELETE /api/wishlist/:productId`

**Empty State:**
- "Your wishlist is empty"
- "Continue Shopping" button

---

## 4.7 Email Preferences (`/account/email-preferences`)

**API:** `GET /api/unsubscribe/preferences`, `PUT /api/unsubscribe/preferences`

**Form:**
- Marketing Emails (toggle)
- Abandoned Cart Reminders (toggle)
- Back-in-Stock Alerts (toggle)
- "Unsubscribe from All" link

**Behavior:**
- Save button updates preferences
- If all toggles OFF → auto-set `unsubscribedFromAll: true`

---

## 4.8 Support Portal (`/account/support`)

**API:** `GET /api/support` (user's tickets)

**UI:**
- List: Subject, Priority, Status, Created Date
- "New Ticket" button → opens modal

**New Ticket Modal:**
- Subject (required, min 5 chars)
- Priority (low, medium, high - dropdown)
- Message (required, min 20 chars)
- API: `POST /api/support`
- Success: Redirect to ticket details

**Ticket Details (`/account/support/:id`):**
- API: `GET /api/support/:id`
- Chat-style messages (user + admin replies)
- Reply textarea + "Send" button → `POST /api/support/:id/reply`
- Status badge (Open, In Progress, Resolved, Closed)
- If replying to closed ticket: Show hint "This will reopen the ticket"

---

# 5. Admin Dashboard

> All features accessible to regular admins. See design_system.md for UI components.

## 5.1 Dashboard Overview (`/admin`)

**APIs:**
- `GET /api/admin/dashboard/summary`
- `GET /api/admin/dashboard/sales-trends?days=30`
- `GET /api/admin/dashboard/top-products`
- `GET /api/admin/dashboard/recent-orders`

**Widgets:**
- Stats Cards: Total Revenue, Orders, Customers, Low Stock Count
- Sales Trends Chart (line chart, 7/30/90 days filter)
- Order Status Pie Chart
- Top Products Table (name, sales count, revenue)
- Recent Orders List
- Inventory Health Bar Chart
- Cart Abandonment Rate

---

## 5.2 Analytics & Reports (`/admin/analytics`)

**APIs:**
- `GET /api/admin/analytics/revenue-by-category`
- `GET /api/admin/analytics/customer-growth`
- `GET /api/admin/analytics/payment-methods`

**Charts:**
- Revenue by Category (bar chart)
- Customer Growth (line chart)
- Payment Methods (pie chart)

**Export Tools:**
- "Export Orders" → `GET /api/admin/reports/export?type=orders` → CSV download
- "Export Products" → `GET /api/admin/reports/export?type=products` → CSV
- "Export Customers" → `GET /api/admin/reports/export?type=customers` → CSV

---

## 5.3 Product Management (`/admin/products`)

**API:** `GET /api/admin/products?page={}&search={}&category={}`

**Features:**
- Search bar (by name, SKU)
- Filter by category (dropdown)
- Sort by (newest, name, price)
- "Bulk Upload" button → opens CSV upload modal
- "Add Product" button → `/admin/products/new`

**Product List:**
- Table: Image, Name, Category, Price, Stock, Status, Actions
- Actions: Edit, Delete, Duplicate

**Delete:**
- Confirmation modal
- API: `DELETE /api/products/:id` (soft delete)

**Duplicate:**
- API: `POST /api/products/:id/duplicate`
- Copies product with "(Copy)" suffix, new SKU

**Bulk Upload:**
- Upload CSV file
- API: `POST /api/products/bulk-upload`
- Show progress bar
- On complete: Show summary "Created 50, Updated 10, Failed 5"
- Failed rows: Download error report CSV

---

## 5.4 Add/Edit Product (`/admin/products/new`, `/admin/products/:id/edit`)

**APIs:**
- `POST /api/products` (create)
- `PUT /api/products/:id` (update)
- `GET /api/products/:id` (load for edit)

**Form Sections:**

### Basic Info
- Name (required, min 3 chars)
- Description (rich text editor)
- Category (dropdown from `GET /api/categories`)

### Pricing
- Base Price (number, min 0)

### Variants
- Add Variant button
- Each variant: Size, Color, Length, Texture, Price, Stock, SKU
- Can add multiple variants
- Delete variant (confirm, cannot delete last)
- **Bulk Update Variants:**
  - Select multiple (checkboxes)
  - "Bulk Update" button → opens modal
  - Can update: Price, Stock, or Status
  - API: `PATCH /api/variants/bulk` with {variantIds: [], updates: {}}

### Media
- Drag & drop upload zone
- Multiple file upload
- ImageKit integration
- Show thumbnails with remove button
- Reorder images (drag & drop)

### SEO (Optional)
- Meta Title (max 60 chars)
- Meta Description (max 160 chars)

**Validation:**
- Name required, min 3 chars
- At least 1 variant required
- Variant SKU must be unique
- Price and Stock must be >= 0

---

## 5.5 Category Management (`/admin/categories`)

**API:** `GET /api/categories`

**UI:**
- Table: Image, Name, Product Count, Active Status, Actions
- "Add Category" button → opens modal

**Add/Edit Modal:**
- Name (required)
- Image (upload, optional)
- isActive (toggle)
- API: `POST /api/categories`, `PUT /api/categories/:id`

**Delete:**
- Confirm modal
- API: `DELETE /api/categories/:id`
- Cannot delete if products exist

---

## 5.6 Order Management (`/admin/orders`)

**API:** `GET /api/admin/orders?page={}&status={}&search={}`

**Views:**
- **Table View:** Default
- **Kanban Board View:** Columns by status, drag & drop

**Table:**
- Columns: Order #, Customer, Date, Total, Status, Payment Status, Actions
- Search: By order # or customer email
- Filter: By status (dropdown)
- Sort: By date, total

**Bulk Operations:**
- Select multiple (checkboxes)
- "Bulk Update Status" → Select new status → `PATCH /api/admin/orders/bulk-status`

**Export:**
- "Export to CSV" → `GET /api/admin/orders/export` with current filters

**Order Details:**
- Same as user view + admin actions:
  - Update Status (dropdown → `PATCH /api/admin/orders/:orderNumber/status`)
  - Process Refund → Modal (amount, reason) → `POST /api/admin/orders/:id/refund`
  - Add Tracking → Input field → `PATCH /api/admin/orders/:id` with {trackingNumber}

**Webhook Logs:**
- Tab or separate page
- API: `GET /api/orders/webhooks/paystack/logs`
- Table: Date, Event, Status, Reference, Payload (JSON, expandable)

---

## 5.7 Review Moderation (`/admin/reviews`)

**API:** `GET /api/reviews/admin/all?status={}&page={}`

**Filters:**
- Status: All, Pending, Approved, Rejected (tabs)

**List:**
- Table: Product, User, Rating, Title, Status, Date, Actions
- Actions: Approve, Reject, Delete, Edit

**Actions:**
- Approve: `PATCH /api/reviews/:id/approve`
- Reject: `PATCH /api/reviews/:id/reject`
- Delete: `DELETE /api/reviews/:id` (confirm)
- Edit: Modal with title and content editable → `PATCH /api/reviews/:id`

---

## 5.8 User Management (`/admin/users`)

**API:** `GET /api/admin/users?page={}&search={}`

**Features:**
- Search by name or email
- Table: Name, Email, Orders Count, Join Date, Status, Actions
- Actions: View Details, Ban/Unban

**User Details Modal:**
- User info (name, email, phone, join date)
- Lifetime Value (total spent)
- Order History (last 10 orders)
- "Ban User" / "Unban User" button

**Ban/Unban:**
- Confirmation modal (for ban, ask reason)
- API: `PATCH /api/admin/users/:id/ban` or `unban`
- Banned users cannot login

---

## 5.9 Media Library (`/admin/media`)

**APIs:**
- `GET /api/admin/media?type={}&status={}&page={}`
- `DELETE /api/admin/media/batch`
- `POST /api/admin/media/:id/restore`

**Filters:**
- Type: All, Product, Review, Variant, Category
- Status: Active, Trashed

**Grid View:**
- Thumbnails with filename, type, uploader, date
- Checkbox for batch selection

**Actions:**
- Single: Move to Trash, Download, Copy URL
- Batch: Move to Trash (API: `DELETE /api/admin/media/batch` with {ids: []})

**Trash View:**
- Tab or separate page
- Same grid, shows trashed items
- Actions: Restore (`POST /api/admin/media/:id/restore`), Delete Permanently
- "Empty Trash" button → Confirmation → `DELETE /api/admin/media/trash/clear`

**Upload:**
- Button opens upload modal
- Drag & drop or click to browse
- Single, Batch (up to 10), or URL upload
- Duplicate detection warning
- API: `POST /api/upload?type=product` or `POST /api/upload/batch`

---

## 5.10 Banner Management (`/admin/banners`)

**API:** `GET /api/admin/banners`

**List:**
- Table: Image, Title, Priority, Active, Start/End Date, Actions
- Actions: Edit, Delete

**Add/Edit Modal:**
- Title (required)
- Description (optional)
- Image (upload, required)
- Link URL (required)
- Priority (number, default 0)
- Start Date, End Date (optional)
- Notify Users (checkbox - sends notification to all when activated)
- isActive (toggle)
- API: `POST /api/admin/banners`, `PUT /api/admin/banners/:id`

---

## 5.11 Discount Management (`/admin/discounts`)

**API:** `GET /api/discounts`

**List:**
- Table: Code, Type, Value, Min Purchase, Usage/Max, Expiry, Status, Actions
- Actions: Edit, Delete

**Add/Edit Modal:**
- Code (required, unique, uppercase auto-convert)
- Type (Percentage or Fixed - dropdown)
- Value (number, required)
- Start Date, End Date (optional)
- Min Purchase Amount (optional)
- Max Uses (optional, null = unlimited)
- isActive (toggle)
- API: `POST /api/discounts`, `PUT /api/discounts/:id`

**Validation:**
- Percentage: Value must be 0-100
- Fixed: Value must be > 0

---

## 5.12 Support Ticket Management (`/admin/support`)

**API:** `GET /api/support?status={}&priority={}&page={}`

**Filters:**
- Status: All, Open, In Progress, Resolved, Closed
- Priority: All, Low, Medium, High

**List:**
- Table: Subject, User, Priority, Status, Created, Last Activity, Actions
- Actions: View Details

**Ticket Details:**
- Same as user view
- Additional: Update Status dropdown (In Progress, Resolved, Closed)
- API: `PATCH /api/support/:id` with {status}

---

## 5.13 Email Management (`/admin/emails`)

### Email Logs
**API:** `GET /api/admin/emails/logs?status={}&type={}&page={}`

**Filters:**
- Status: All, Sent, Failed
- Type: All email types (dropdown)

**Table:**
- Columns: Recipients, Subject, Type, Status, Sent At, Error (if failed)
- Click row → Expand to show full details (body preview, error message)

### Email Stats
**API:** `GET /api/admin/emails/stats`

**Widgets:**
- Total Sent (today, this week, this month)
- Success Rate (percentage)
- Queue Status (pending count)
- Failed Emails (count with "Retry All" button)

### Retry Failed
**Button:** "Retry Failed Emails"
**API:** `POST /api/admin/emails/retry-failed`
**Confirmation:** "Retry {count} failed emails?"

---

## 5.14 Admin Activity Log (`/admin/activity`)

**API:** `GET /api/admin/dashboard/admin-activity?page={}`

**Table:**
- Columns: Admin Name, Action, Target, Details, Timestamp
- Examples: "Updated product #123", "Approved review #456", "Banned user email@example.com"
- Pagination

---

## 5.15 Low Stock Alerts (`/admin/inventory`)

**API:** `GET /api/admin/dashboard/low-stock`

**List:**
- Table: Product Name, Variant, Current Stock, Actions
- Shows variants with stock ≤ 5
- Actions: "Restock" → Opens modal to update stock

**Restock Modal:**
- Current Stock (readonly)
- Add Quantity (number input)
- New Stock = Current + Add (calculated, shows)
- API: `PATCH /api/variants/:id` with {stock}

---

## 5.16 Communications (`/admin/communications`)

**Feature:** Send Bulk Notification

**API:** `POST /api/notifications/bulk`

**Form:**
- Target: Dropdown (All Users, or multi-select User IDs)
- Type: Dropdown (info, promo, announcement)
- Title (required, max 100 chars)
- Message (required, max 500 chars)
- Link (optional URL)

**Behavior:**
- Preview notification before sending
- Confirmation: "Send to {count} users?"
- On success: Toast "Notification sent to {count} users"

---

# 6. Super Admin (`/super-admin`)

> Exclusive features. Regular admins DO NOT have access. Requires IP whitelist + header auth.

## 6.1 System Logs & Health (`/super-admin/logs`)

**APIs:**
- `GET /api/super-admin/logs?type=app` - Last 50KB of app.log
- `GET /api/super-admin/logs?type=error` - Last 50KB of error.log
- `GET /api/super-admin/health` - DB status, API uptime, memory

**UI:**
- Tab: App Logs | Error Logs | Health
- Logs: Terminal-style scrollable view
- Health: Stats cards (DB Connected, Memory Used/Total, Uptime)

---

## 6.2 Force Password Reset (`/super-admin/users`)

**Search:** By user ID or email

**Action:** "Force Reset Password"

**Modal:**
- User ID (readonly)
- New Password (input, required)
- Confirmation

**API:** `POST /api/super-admin/users/reset-password` with {userId, newPassword}

---

## 6.3 Force User Logout/Deactivation

**Action:** "Force Logout" button in user row

**API:** `POST /api/super-admin/users/force-logout` with {userId}

**Behavior:** Sets user `isActive: false`, forcing logout on next request

---

## 6.4 System Settings (`/super-admin/settings`)

**API:** `GET /api/super-admin/settings`, `POST /api/super-admin/settings`

**Settings:**
- Maintenance Mode (toggle)
- Enable Payments (toggle)

**Behavior:**
- When Maintenance Mode ON: All non-admin requests return 503
- When Payments OFF: Checkout disabled

---

## 6.5 IP Blocking & Security (`/super-admin/security`)

**APIs:**
- `GET /api/super-admin/ips` - List blocked IPs
- `POST /api/super-admin/ips/block` - Block IP
- `DELETE /api/super-admin/ips/:ip` - Unblock IP

**Features:**
- List: Table with IP, Reason, Blocked At, Actions
- Block IP: Input IP + Reason → Confirm → Block
- Unblock: Confirmation → Unblock

---

## 6.6 Developer Tools (`/super-admin/tools`)

### Trigger Background Jobs
**API:** `POST /api/super-admin/jobs` with {jobName}

**Jobs:**
- abandoned_cart_emails
- analytics_aggregation
- low_stock_alerts
- currency_rate_update
- session_cleanup

**UI:** Dropdown to select job, "Run Now" button

### Force Verify Payment
**API:** `POST /api/super-admin/payment/force-verify` with {reference}

**Use Case:** When Paystack webhook fails

**Form:**
- Payment Reference (input)
- "Force Verify" button

**Confirmation:** "This will mark order as paid without webhook. Continue?"

---

## 6.7 System Stats (`/super-admin/stats`)

**API:** `GET /api/super-admin/stats`

**Widgets:**
- Total Users, Orders, Products (counts)
- Node Environment (dev/production)
- Memory Usage (Heap Used / Total)
- Uptime (days, hours, minutes)

---

## 6.8 Queue Status (`/super-admin/queues`)

**API:** `GET /api/super-admin/queues`

**Widgets:**
- Email Queue: Pending count, Processing, Failed
- Notification Queue: Pending count
- Refresh button (manual, not real-time)

---

## 6.9 Environment Variables (`/super-admin/env`)

**API:** `GET /api/super-admin/env`

**Display:**
- Table: Key, Value
- Only safe vars (NODE_ENV, PORT, FRONTEND_URL)
- Sensitive vars (API keys, DB URL) NOT shown

---

# 7. Shared Components

## Product Card
- Image, Name, Price, Rating, Stock badge
- Wishlist button, Add to Cart button
- Click card → Product details
- Hover: Lift effect

## Stars Rating
- Display: Filled/half/empty stars
- Interactive: Click/hover to select rating
- Sizes: sm, md, lg
- Show count next to stars

## Breadcrumb Navigation
- Auto-generate from route path
- Format: Home / Shop / Category / Product
- Each segment clickable except last

## Pagination
- Previous/Next buttons
- Page numbers (max 7 visible)
- Current page highlighted
- Disabled state when on first/last page

## Image Upload
- Drag & drop zone
- Click to browse
- Multiple file support
- Preview thumbnails
- Remove button per image
- Validation: Size (max 5MB), Type (JPEG, PNG, WEBP)

## Quantity Selector
- +/- buttons
- Number input (manual entry)
- Min: 1, Max: stock available
- Disabled when out of stock

---

# 8. State Management

## Global State (Redux/Context)
```js
{
  auth: {
    user: null | UserObject,
    isAuthenticated: boolean,
    tokens: {accessToken, refreshToken}
  },
  cart: {
    items: [{id, product, variant, quantity, price}],
    count: number,
    subtotal: number,
    discount: number,
    total: number,
    coupon: null | {code, type, value}
  },
  notifications: {
    unreadCount: number,
    items: [...],
    sseConnection: null | EventSource
  },
  currency: {
    selected: 'USD',
    rates: {USD: 1, EUR: 0.85, ...}
  }
}
```

## Local State (Component-level)
- Form inputs (controlled components)
- Modal open/close states
- Loading states
- Selected filters
- Pagination current page

## Session Storage
- Guest cart ID
- Last visited page (for redirect after login)

## Local Storage
- Selected currency
- "Notify me" preferences (productId → email)
- "Remember me" token (if checked)

---

# 9. API Integration

## Base Configuration
```js
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
  headers: {'Content-Type': 'application/json'}
});
```

## Request Interceptor
```js
api.interceptors.request.use(config => {
  // Add auth token
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add session ID for guest cart
  const sessionId = sessionStorage.getItem('sessionId');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  
  return config;
});
```

## Response Interceptor
```js
api.interceptors.response.use(
  response => response.data,
  async error => {
    const originalRequest = error.config;
    
    // Auto-refresh token on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', {refreshToken});
        
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        return api(originalRequest);
      } catch {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Error Response Format
```js
{
  success: false,
  error: {
    message: "Error description",
    type: "validation|authentication|not_found|server",
    fields: [{field: "email", message: "Invalid email"}] // For validation errors
  }
}
```

## Success Response Format
```js
{
  success: true,
  data: {...} | [...],
  meta: {page: 1, pages: 10, total: 100} // For paginated responses
}
```

---

# 10. Error Handling

## API Error Handling
```js
try {
  const data = await api.post('/api/cart', {variantId, quantity});
  toast.success('Added to cart!');
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error
    const {fields} = error.response.data.error;
    fields.forEach(f => setFieldError(f.field, f.message));
  } else if (error.response?.status === 409) {
    // Insufficient stock
    toast.error(error.response.data.error.message);
  } else {
    // Generic error
    toast.error('Something went wrong. Please try again.');
  }
}
```

## Network Error Handling
- Retry GET requests up to 3 times (exponential backoff)
- Show toast "Connection lost. Retrying..."
- After 3 failures: "Please check your connection"

## Form Validation
- Required fields: "This field is required"
- Email: "Please enter a valid email"
- Password: "Password must be at least 8 characters"
- Min/Max length: "Must be between X and Y characters"
- Pattern mismatch: "Invalid format"

## Empty States
- Empty cart: Illustration + "Your cart is empty" + CTA
- No search results: "No products found" + Suggest clearing filters
- No orders: "You haven't placed any orders yet" + CTA
- No wishlist: "Your wishlist is empty" + CTA

---

# 11. Accessibility

## Keyboard Navigation
- All interactive elements focusable
- Tab order logical (top to bottom, left to right)
- Skip to main content link
- ESC to close modals/dropdowns
- Arrow keys for carousels

## Screen Reader Support
- ARIA labels on icon-only buttons
- ARIA live regions for dynamic content (cart updates, toast)
- Alt text on all images
- Form labels properly associated with inputs
- Error messages announced

## Visual Accessibility
- Min contrast ratio: 4.5:1 (WCAG AAA)
- Focus visible: 3px gold outline
- No reliance on color alone (use icons + text)
- Text resizable up to 200% without breaking layout

## Touch Targets
- Min 44x44px for touch devices
- Adequate spacing between interactive elements

## Semantic HTML
- Use `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- Headings in logical order (H1 → H2 → H3)
- Buttons for actions, links for navigation

---

# 12. Performance Optimization

## Code Splitting
- Route-based splitting (lazy load pages)
- Component lazy loading (modals, heavy components)

## Image Optimization
- ImageKit transformations (resize, compress, webp)
- Lazy loading (below the fold)
- Responsive images (srcset)

## API Optimization
- Debounce search inputs (300ms)
- Cache GET requests (React Query or SWR)
- Pagination (20 items per page)
- Infinite scroll for lists (optional)

## Bundle Optimization
- Tree shaking (remove unused code)
- Minification (production build)
- Compression (gzip/brotli)

---

# 13. Testing Requirements

## Unit Tests
- Components: Rendering, props, events
- Utilities: Currency formatting, date formatting, validation
- Store: Action creators, reducers

## Integration Tests
- API calls with mocked responses
- Form submissions
- Multi-step flows (checkout)

## E2E Tests (Playwright/Cypress)
- User registration → login → add to cart → checkout flow
- Product search → filter → sort → view details
- Admin: Create product → upload image → publish

---

**End of Specification**

> **Total:** ~200 pages of detailed specifications across 13 major sections, 60+ pages, 35+ API endpoints, 50+ components, complete user flows, validation rules, state management, error handling, and accessibility guidelines.
