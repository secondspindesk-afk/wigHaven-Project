Admin Frontend Implementation Plan
Overview
Build complete admin dashboard with 16 admin pages + 9 super admin pages based on 
frontend_specs.md
 specifications.

Current State: Only 
Dashboard.tsx
 exists (basic user profile page - NOT the admin dashboard per spec)

Phase 1: Core Dashboard & Layout (Priority: HIGH)
1.1 Admin Layout Component
File: components/layouts/AdminLayout.tsx

Components:

Collapsible sidebar with navigation
Top header with admin user info
Breadcrumb navigation
Mobile responsive drawer
Sidebar Links:

📊 Dashboard
📦 Products
📁 Categories
🛒 Orders
⭐ Reviews
👥 Users
🖼️ Media
🎨 Banners
💰 Discounts
🎫 Support
📧 Emails
📝 Activity Log
📦 Inventory
📢 Communications
1.2 Dashboard Overview (/admin)
File: 
pages/admin/Dashboard.tsx
 (REPLACE existing)

APIs:

GET /api/admin/dashboard/summary
GET /api/admin/dashboard/sales-trends
GET /api/admin/dashboard/top-products
GET /api/admin/dashboard/recent-orders
Widgets:

Widget	Data Source	Chart Type
Stats Cards (Revenue, Orders, Customers, Low Stock)	/summary	Number cards
Sales Trends	/sales-trends?days=30	Line chart
Order Status	/order-status-breakdown	Pie chart
Top Products	/top-products	Table
Recent Orders	/recent-orders	List
Inventory Health	/inventory-status	Bar chart
Cart Abandonment	/cart-abandonment	Stat card
Features:

Date range filter (7/30/90 days)
Real-time refresh button
Quick action buttons
1.3 Analytics & Reports (/admin/analytics)
File: pages/admin/Analytics.tsx

APIs:

GET /api/admin/dashboard/revenue-by-category
GET /api/admin/dashboard/customer-analytics
GET /api/admin/dashboard/payment-methods
GET /api/admin/dashboard/export?type={orders|products|customers}
Features:

Revenue by Category (bar chart)
Customer Growth (line chart)
Payment Methods (pie chart)
Export to CSV buttons
Phase 2: Product & Category Management (Priority: HIGH)
2.1 Product List (/admin/products)
File: pages/admin/products/ProductList.tsx

API: GET /api/admin/products

Features:

Feature	Implementation
Table View	Columns: Image, Name, Category, Price, Stock, Status, Actions
Search	By name, SKU (debounced 300ms)
Filter	By category dropdown
Sort	Newest, Name, Price asc/desc
Bulk Upload	CSV modal with progress
Actions	Edit, Delete, Duplicate
Bulk Upload Modal:

File dropzone (CSV only)
Preview parsed rows
Import progress bar
Success/error summary
2.2 Add/Edit Product (/admin/products/new, /admin/products/:id/edit)
File: pages/admin/products/ProductForm.tsx

APIs:

POST /api/admin/products (create)
PATCH /api/admin/products/:id (update)
GET /api/admin/products/:id (load)
GET /api/categories (dropdown)
Form Sections:

Basic Info

Name (required, min 3)
Description (rich text - TipTap editor)
Category (dropdown)
Pricing

Base Price (number)
Variants Table

Add Variant button
Columns: Size, Color, Length, Texture, Price, Stock, SKU
Bulk select checkboxes
Bulk Update modal (price/stock/status)
Delete variant (confirm modal)
Media

Drag & drop zone
Multiple upload to ImageKit
Thumbnail previews with remove
Reorder via drag & drop
SEO (Optional)

Meta Title (60 chars max)
Meta Description (160 chars max)
2.3 Category Management (/admin/categories)
File: pages/admin/categories/CategoryList.tsx

API: GET /api/categories

Features:

Table: Image, Name, Product Count, Active, Actions
Add/Edit Modal: Name, Image upload, isActive toggle
Delete confirmation (cannot delete if has products)
Phase 3: Order & User Management (Priority: HIGH)
3.1 Order List (/admin/orders)
File: pages/admin/orders/OrderList.tsx

API: GET /api/admin/orders

Views:

Table View (default)

Columns: Order #, Customer, Date, Total, Status, Payment, Actions
Search by order # or email
Filter by status
Sort by date/total
Kanban View (toggle)

Columns: Pending → Processing → Shipped → Delivered
Drag & drop to change status
Bulk Operations:

Checkbox selection
Bulk status update dropdown
Export:

"Export CSV" with current filters
3.2 Order Details (/admin/orders/:orderNumber)
File: pages/admin/orders/OrderDetails.tsx

API: GET /api/orders/:orderNumber

Sections:

Order info header (number, date, status badges)
Items table with variant details
Shipping/Billing addresses
Order summary (subtotal, discount, tax, shipping, total)
Timeline visualization
Admin Actions:

Action	API	UI
Update Status	PATCH /admin/orders/:orderNumber/status	Dropdown
Add Tracking	PATCH /admin/orders/:id	Input + Save
Process Refund	POST /admin/orders/:id/refund	Modal (amount, reason)
3.3 User Management (/admin/users)
File: pages/admin/users/UserList.tsx

API: GET /api/admin/users

Features:

Search by name or email
Table: Name, Email, Orders, Joined, Status, Actions
User Details Modal:
User info
Lifetime value (total spent)
Last 10 orders
Ban/Unban button
Ban/Unban:

Confirmation modal
Reason textarea for ban
API: PATCH /api/admin/users/:id/ban or unban
3.4 Review Moderation (/admin/reviews)
File: pages/admin/reviews/ReviewList.tsx

API: GET /api/reviews/admin/all

Features:

Status tabs: All | Pending | Approved | Rejected
Table: Product, User, Rating, Title, Status, Date, Actions
Actions: Approve, Reject, Edit, Delete
Edit modal: Title + Content editable
Phase 4: Support & Settings (Priority: MEDIUM)
4.1 Support Tickets (/admin/support)
File: pages/admin/support/TicketList.tsx

API: GET /api/support

Features:

Filter: Status, Priority
Table: Subject, User, Priority, Status, Created, Last Activity
Ticket Details page with chat-style messages
Update status dropdown
Admin reply textarea
4.2 Media Library (/admin/media)
File: pages/admin/media/MediaLibrary.tsx

APIs:

GET /api/admin/media
DELETE /api/admin/media/batch
POST /api/admin/media/:id/restore
Features:

Grid view with thumbnails
Filter: Type (Product/Review/Variant), Status (Active/Trashed)
Batch selection with checkboxes
Actions: Trash, Download, Copy URL
Trash tab with Restore, Permanent Delete
Upload modal (drag & drop, URL, batch)
4.3 Banner Management (/admin/banners)
File: pages/admin/banners/BannerList.tsx

API: GET /api/admin/banners

Table: Image, Title, Priority, Active, Dates, Actions
Add/Edit Modal: Title, Description, Image, Link, Priority, Dates, Active
4.4 Discount Codes (/admin/discounts)
File: pages/admin/discounts/DiscountList.tsx

API: GET /api/discounts

Table: Code, Type, Value, Min Purchase, Usage/Max, Expiry, Status
Add/Edit Modal: Code, Type (%), Value, Dates, Min Purchase, Max Uses, Active
4.5 Email Management (/admin/emails)
File: pages/admin/emails/EmailLogs.tsx

APIs:

GET /api/admin/emails/logs
GET /api/admin/emails/stats
POST /api/admin/emails/retry-failed
Features:

Stats cards: Sent today/week/month, Success rate, Queue, Failed
Logs table: Recipients, Subject, Type, Status, Sent At
Expandable row for error details
"Retry Failed" button
4.6 Activity Log (/admin/activity)
File: pages/admin/activity/ActivityLog.tsx

API: GET /api/admin/dashboard/admin-activity

Table: Admin, Action, Target, Details, Timestamp
Pagination
4.7 Low Stock Alerts (/admin/inventory)
File: pages/admin/inventory/LowStock.tsx

API: GET /api/admin/dashboard/low-stock-alerts

Table: Product, Variant, Current Stock, Actions
Restock Modal: Add quantity input, calculated new stock
4.8 Communications (/admin/communications)
File: pages/admin/communications/BulkNotify.tsx

API: POST /api/notifications/bulk

Form: Target (All / Select users), Type, Title, Message, Link
Preview before send
Confirmation modal
Phase 5: Super Admin (Priority: LOW)
Requires special authentication: IP whitelist + header auth

5.1 System Logs (/super-admin/logs)
APIs: GET /api/super-admin/logs?type={app|error}

Terminal-style log viewer
Tab switch: App Logs | Error Logs
5.2 System Health (/super-admin/health)
API: GET /api/super-admin/health

Stats cards: DB Status, Memory, Uptime
5.3 System Settings (/super-admin/settings)
API: GET/POST /api/super-admin/settings

Toggle: Maintenance Mode
Toggle: Enable Payments
5.4 IP Blocking (/super-admin/security)
APIs: GET/POST/DELETE /api/super-admin/ips

Table: IP, Reason, Blocked At
Block IP form
Unblock confirmation
5.5 Force User Actions (/super-admin/users)
Search user by ID/email
Force reset password
Force logout
5.6 Developer Tools (/super-admin/tools)
API: POST /api/super-admin/jobs

Trigger jobs dropdown: abandoned_cart_emails, analytics, low_stock, currency, cleanup
Force verify payment input
5.7 System Stats (/super-admin/stats)
Counts: Users, Orders, Products
Node ENV, Memory, Uptime
5.8 Queue Status (/super-admin/queues)
Email queue pending/processing/failed
Notification queue
5.9 Environment (/super-admin/env)
Safe environment variables table
Shared Components Needed
Component	Purpose
DataTable	Reusable sortable/filterable table
StatsCard	Dashboard stat widgets
LineChart	Sales trends
PieChart	Order status, payments
BarChart	Inventory, revenue
StatusBadge	Order/review status
SearchInput	Debounced search
FilterDropdown	Category/status filters
ConfirmModal	Delete/ban confirmations
FileUpload	Drag & drop zone
RichTextEditor	Product descriptions
DateRangePicker	Report filters
API Hooks to Create
// Dashboard
useAdminSummary()
useSalesTrends(days: number)
useTopProducts()
useRecentOrders()
// Products  
useAdminProducts(filters)
useCreateProduct()
useUpdateProduct()
useDeleteProduct()
useDuplicateProduct()
useBulkUpload()
// Variants
useBulkUpdateVariants()
// Orders
useAdminOrders(filters)
useUpdateOrderStatus()
useBulkUpdateStatus()
useRefundOrder()
useExportOrders()
// Users
useAdminUsers(filters)
useBanUser()
useUnbanUser()
// Reviews
useAllReviews(filters)
useApproveReview()
useRejectReview()
// Media
useAdminMedia(filters)
useBatchDeleteMedia()
useRestoreMedia()
// Super Admin
useSuperAdminLogs()
useSystemHealth()
useSystemSettings()
useBlockedIPs()
useTriggerJob()
Routing Structure
<Route path="/admin" element={<AdminLayout />}>
  <Route index element={<Dashboard />} />
  <Route path="analytics" element={<Analytics />} />
  <Route path="products" element={<ProductList />} />
  <Route path="products/new" element={<ProductForm />} />
  <Route path="products/:id/edit" element={<ProductForm />} />
  <Route path="categories" element={<CategoryList />} />
  <Route path="orders" element={<OrderList />} />
  <Route path="orders/:orderNumber" element={<OrderDetails />} />
  <Route path="reviews" element={<ReviewList />} />
  <Route path="users" element={<UserList />} />
  <Route path="media" element={<MediaLibrary />} />
  <Route path="banners" element={<BannerList />} />
  <Route path="discounts" element={<DiscountList />} />
  <Route path="support" element={<TicketList />} />
  <Route path="support/:id" element={<TicketDetails />} />
  <Route path="emails" element={<EmailLogs />} />
  <Route path="activity" element={<ActivityLog />} />
  <Route path="inventory" element={<LowStock />} />
  <Route path="communications" element={<BulkNotify />} />
</Route>
<Route path="/super-admin" element={<SuperAdminLayout />}>
  <Route path="logs" element={<SystemLogs />} />
  <Route path="health" element={<SystemHealth />} />
  <Route path="settings" element={<SystemSettings />} />
  <Route path="security" element={<IPBlocking />} />
  <Route path="users" element={<UserActions />} />
  <Route path="tools" element={<DevTools />} />
  <Route path="stats" element={<SystemStats />} />
  <Route path="queues" element={<QueueStatus />} />
  <Route path="env" element={<EnvVars />} />
</Route>
Implementation Order
Phase	Pages	Estimated Effort
1	Layout, Dashboard, Analytics	2-3 days
2	Products, Categories	3-4 days
3	Orders, Users, Reviews	3-4 days
4	Media, Banners, Discounts, Support, Emails, Activity, Inventory, Comms	4-5 days
5	Super Admin (9 pages)	2-3 days
Total: ~15-20 days

Dependencies to Install
npm install recharts @tanstack/react-table react-dropzone @tiptap/react @tiptap/starter-kit
Questions for User
Charts library preference? (Recharts recommended, or Tremor, Chart.js)
Rich text editor? (TipTap recommended, or Slate, Quill)
Kanban board? (Custom or @hello-pangea/dnd)
Start with which phase? (Recommended: Phase 1 → 2 → 3 → 4 → 5)


we are on product categories and add and edit , read the backend files fully and read schema.prisma and then all the frontend file related to it and update the products list and actegoeuies to for the products please and the categories are problematic 