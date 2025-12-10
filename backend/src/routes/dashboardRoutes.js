import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import adminSearchService from '../services/adminSearchService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Unified Admin Search
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 5 } = req.query;

        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters'
            });
        }

        const results = await adminSearchService.unifiedSearch(q, {
            limit: Math.min(parseInt(limit) || 5, 20)
        });

        res.json({ success: true, data: results });
    } catch (error) {
        logger.error('Admin search error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

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

// Cache monitoring (super_admin debugging tool)
router.get('/cache-stats', dashboardController.getCacheStats);

export default router;
