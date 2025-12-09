import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Summary & Trends
router.get('/summary', dashboardController.getSummary);
router.get('/sales-trends', dashboardController.getSalesTrends);
router.get('/top-products', dashboardController.getTopProducts);

// Orders
router.get('/recent-orders', dashboardController.getRecentOrders);
router.get('/order-status-breakdown', dashboardController.getOrderStatusBreakdown);

// Inventory
router.get('/inventory-status', dashboardController.getInventoryStatus);
router.get('/low-stock-alerts', dashboardController.getLowStockAlerts);
router.get('/revenue-by-category', dashboardController.getRevenueByCategory);

// Customers & Marketing
router.get('/customer-analytics', dashboardController.getCustomerAnalytics);
router.get('/email-stats', dashboardController.getEmailStats);
router.get('/cart-abandonment', dashboardController.getCartAbandonment);

// System & Admin
router.get('/system-health', dashboardController.getSystemHealth);
router.get('/admin-activity', dashboardController.getAdminActivity);
router.get('/payment-methods', dashboardController.getPaymentMethods);
router.get('/export', dashboardController.exportReports);
router.get('/sidebar-stats', dashboardController.getSidebarStats);

export default router;
