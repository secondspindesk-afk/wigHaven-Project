import express from 'express';
import superAdminController from '../controllers/superAdminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply Super Admin Auth to all routes
// STRICT: Require valid JWT with 'super_admin' role. 
// "God Mode" header backdoor has been removed.
router.use(authenticateToken);
router.use(requireRole('super_admin'));

// Auth check
router.post('/login', superAdminController.login);

// System Management
router.get('/logs', superAdminController.getLogs);
router.get('/health', superAdminController.getHealth);
router.get('/stats', superAdminController.getSystemStats);

// Emergency Actions
router.post('/payment/verify', superAdminController.forceVerifyPayment);

// System Settings
router.get('/settings', superAdminController.getSystemSettings);
router.post('/settings', superAdminController.updateSystemSetting);

// IP Blocking
router.get('/ip/blocked', superAdminController.getBlockedIPs);
router.post('/ip/block', superAdminController.blockIP);
router.delete('/ip/unblock/:ip', superAdminController.unblockIP);

// User Management
router.get('/users', superAdminController.getAllUsers);
router.post('/users/reset-password', superAdminController.resetUserPassword);
router.post('/users/logout', superAdminController.forceLogoutUser);
router.post('/users/role', superAdminController.updateUserRole);
router.put('/users/:id', superAdminController.updateUserDetails);

// Jobs
router.post('/jobs/trigger', superAdminController.triggerJob);
router.get('/jobs/queue', superAdminController.getQueueStatus);

// System Info
router.get('/env', superAdminController.getEnvVars);
router.get('/webhooks', superAdminController.getWebhookLogs);
router.get('/activities', superAdminController.getAdminActivities);

// Global Actions
router.post('/stock/global-update', superAdminController.globalStockUpdate);
router.get('/backup', superAdminController.backupDatabase);

export default router;
